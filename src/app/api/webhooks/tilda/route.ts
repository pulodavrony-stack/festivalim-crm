// =============================================
// ФЕСТИВАЛИМ: Tilda Webhook Handler
// =============================================
// Файл: /app/api/webhooks/tilda/route.ts
//
// Настройка в Тильде:
// 1. Форма → Приём данных → Webhook
// 2. URL: https://your-domain.com/api/webhooks/tilda
// 3. Метод: POST
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { TildaWebhook, CreateClientInput, DuplicateCheckResult } from '@/types';

export async function POST(request: NextRequest) {
  try {
    // Тильда отправляет данные как form-data или JSON
    let body: TildaWebhook;
    
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      // form-data
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries()) as TildaWebhook;
    }

    console.log('Tilda webhook received:', body);

    // Извлекаем данные
    const phone = body.Phone || body.phone || body.tel || body.Телефон;
    const name = body.Name || body.name || body.Имя || 'Неизвестно';
    const email = body.Email || body.email;

    if (!phone) {
      return NextResponse.json({ 
        success: false, 
        error: 'Phone is required' 
      }, { status: 400 });
    }

    // Нормализуем телефон
    const phoneNormalized = phone.replace(/\D/g, '');

    // Проверяем дубликат
    const { data: existing } = await supabase
      .rpc('find_client_by_phone', { search_phone: phone });

    if (existing && existing.length > 0) {
      const duplicate = existing[0] as DuplicateCheckResult;
      
      // Клиент уже есть — логируем и возвращаем info
      console.log(`Duplicate found: ${duplicate.full_name} (${duplicate.client_type}), purchases: ${duplicate.total_purchases}`);
      
      // Обновляем last_contact_date
      await supabase
        .from('clients')
        .update({ 
          last_contact_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', duplicate.id);

      // Создаём активность о повторном обращении
      await supabase
        .from('activities')
        .insert({
          client_id: duplicate.id,
          activity_type: 'note',
          content: `Повторная заявка с лендинга: ${body.formname || 'неизвестно'}`,
          metadata: { 
            source: 'tilda',
            form_id: body.formid,
            utm: {
              source: body.utm_source,
              medium: body.utm_medium,
              campaign: body.utm_campaign,
            }
          }
        });

      return NextResponse.json({
        success: true,
        is_duplicate: true,
        client_id: duplicate.id,
        client_type: duplicate.client_type,
        message: `Клиент уже в базе: ${duplicate.client_type.toUpperCase()}`,
      });
    }

    // Определяем источник по formid или UTM
    let sourceId: string | null = null;
    
    if (body.formid) {
      const { data: source } = await supabase
        .from('lead_sources')
        .select('id')
        .eq('tilda_page_id', body.formid)
        .single();
      
      sourceId = source?.id || null;
    }

    // Если источник не найден — создаём новый
    if (!sourceId && body.formid) {
      const { data: newSource } = await supabase
        .from('lead_sources')
        .insert({
          name: body.formname || `Тильда ${body.formid}`,
          code: `tilda_${body.formid}`,
          source_type: 'landing',
          tilda_page_id: body.formid,
          default_utm_source: body.utm_source,
          default_utm_medium: body.utm_medium,
          default_utm_campaign: body.utm_campaign,
        })
        .select('id')
        .single();
      
      sourceId = newSource?.id || null;
    }

    // Определяем город (можно добавить поле в форму Тильды)
    let cityId: string | null = null;
    const cityName = body.City || body.city || body.Город;
    
    if (cityName) {
      const { data: city } = await supabase
        .from('cities')
        .select('id')
        .ilike('name', `%${cityName}%`)
        .single();
      
      cityId = city?.id || null;
    }

    // Создаём нового клиента
    const clientInput: CreateClientInput = {
      full_name: name,
      phone: phone,
      email: email,
      city_id: cityId || undefined,
      client_type: 'lead',
      source_id: sourceId || undefined,
      utm_source: body.utm_source,
      utm_medium: body.utm_medium,
      utm_campaign: body.utm_campaign,
      utm_content: body.utm_content,
      notes: body.formname ? `Заявка с формы: ${body.formname}` : undefined,
    };

    const { data: newClient, error } = await supabase
      .from('clients')
      .insert(clientInput)
      .select()
      .single();

    if (error) {
      console.error('Error creating client:', error);
      throw error;
    }

    // Создаём активность
    await supabase
      .from('activities')
      .insert({
        client_id: newClient.id,
        activity_type: 'client_created',
        content: `Новый лид с лендинга: ${body.formname || 'Тильда'}`,
        metadata: {
          source: 'tilda',
          form_id: body.formid,
          utm: {
            source: body.utm_source,
            medium: body.utm_medium,
            campaign: body.utm_campaign,
          }
        }
      });

    // Получаем воронку для лидов и первый этап
    const { data: pipeline } = await supabase
      .from('pipelines')
      .select('id')
      .eq('code', 'leads')
      .single();

    const { data: firstStage } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('pipeline_id', pipeline?.id)
      .eq('code', 'new')
      .single();

    // Создаём сделку
    if (pipeline && firstStage) {
      await supabase
        .from('deals')
        .insert({
          client_id: newClient.id,
          pipeline_id: pipeline.id,
          stage_id: firstStage.id,
          source_id: sourceId,
          title: `${name} — Новый лид`,
          status: 'active',
        });
    }

    console.log(`New lead created: ${newClient.id}`);

    return NextResponse.json({
      success: true,
      is_duplicate: false,
      client_id: newClient.id,
      client_type: 'lead',
      message: 'Новый лид создан',
    });

  } catch (error) {
    console.error('Tilda webhook error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET для проверки
export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    service: 'Tilda Webhook Handler',
    timestamp: new Date().toISOString(),
  });
}
