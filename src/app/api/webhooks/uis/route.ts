// =============================================
// ФЕСТИВАЛИМ: UIS Webhook Handler
// =============================================
// Файл: /app/api/webhooks/uis/route.ts
//
// Настройка в UIS:
// 1. Личный кабинет → Интеграции → Webhooks
// 2. URL: https://your-domain.com/api/webhooks/uis
// 3. События: Входящий звонок, Исходящий звонок, Завершение звонка
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { UISCallWebhook, CallDirection, CallStatus } from '@/types';

const WEBHOOK_SECRET = process.env.UIS_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    // Проверка секрета (если настроен)
    if (WEBHOOK_SECRET) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
        console.error('UIS webhook: Invalid authorization');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body: UISCallWebhook = await request.json();
    console.log('UIS webhook received:', body);

    // Маппинг направления
    const direction: CallDirection = body.direction === 'in' ? 'inbound' : 'outbound';

    // Маппинг статуса
    let status: CallStatus = 'missed';
    if (body.status === 'answered' || body.answer_time) {
      status = 'answered';
    } else if (body.status === 'busy') {
      status = 'busy';
    } else if (body.status === 'failed') {
      status = 'failed';
    }

    // Телефон клиента
    const clientPhone = direction === 'inbound' ? body.caller_id : body.called_id;
    const phoneNormalized = clientPhone.replace(/\D/g, '');

    // Ищем существующий звонок по uis_call_id
    const { data: existingCall } = await supabaseAdmin
      .from('calls')
      .select('id')
      .eq('uis_call_id', body.call_id)
      .single();

    if (existingCall) {
      // Обновляем существующий звонок (завершение)
      await supabaseAdmin
        .from('calls')
        .update({
          answered_at: body.answer_time,
          ended_at: body.end_time,
          duration_seconds: body.duration || 0,
          wait_seconds: body.wait_duration || 0,
          status: status,
          record_url: body.record_url,
        })
        .eq('id', existingCall.id);

      console.log(`UIS call updated: ${existingCall.id}`);
      return NextResponse.json({ success: true, action: 'updated', call_id: existingCall.id });
    }

    // Ищем клиента по телефону
    const { data: clients } = await supabaseAdmin
      .rpc('find_client_by_phone', { search_phone: clientPhone });

    let clientId: string | null = null;
    let managerId: string | null = null;

    if (clients && clients.length > 0) {
      clientId = clients[0].id;

      // Получаем менеджера клиента
      const { data: client } = await supabaseAdmin
        .from('clients')
        .select('manager_id')
        .eq('id', clientId)
        .single();

      managerId = client?.manager_id || null;
    }

    // Ищем менеджера по employee_id из UIS
    if (!managerId && body.employee_id) {
      const { data: manager } = await supabaseAdmin
        .from('managers')
        .select('id')
        .eq('phone', body.employee_id)
        .single();

      managerId = manager?.id || null;
    }

    // Создаём новый звонок
    const { data: newCall, error } = await supabaseAdmin
      .from('calls')
      .insert({
        client_id: clientId,
        manager_id: managerId,
        uis_call_id: body.call_id,
        direction: direction,
        phone: clientPhone,
        phone_normalized: phoneNormalized,
        started_at: body.start_time,
        answered_at: body.answer_time,
        ended_at: body.end_time,
        duration_seconds: body.duration || 0,
        wait_seconds: body.wait_duration || 0,
        status: status,
        record_url: body.record_url,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating call:', error);
      throw error;
    }

    // Создаём активность
    if (clientId) {
      await supabaseAdmin.from('activities').insert({
        client_id: clientId,
        call_id: newCall.id,
        manager_id: managerId,
        activity_type: direction === 'inbound' ? 'call_inbound' : 'call_outbound',
        content: status === 'answered'
          ? `${direction === 'inbound' ? 'Входящий' : 'Исходящий'} звонок (${body.duration || 0} сек)`
          : `Пропущенный ${direction === 'inbound' ? 'входящий' : 'исходящий'} звонок`,
      });

      // Обновляем last_contact_date клиента
      await supabaseAdmin
        .from('clients')
        .update({
          last_contact_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientId);
    }

    // Если входящий звонок от неизвестного номера — создаём лида
    if (!clientId && direction === 'inbound') {
      const { data: newClient } = await supabaseAdmin
        .from('clients')
        .insert({
          full_name: `Звонок ${clientPhone}`,
          phone: clientPhone,
          client_type: 'lead',
          status: 'new',
          source_id: await getSourceId('uis_inbound'),
        })
        .select()
        .single();

      if (newClient) {
        // Обновляем звонок с client_id
        await supabaseAdmin
          .from('calls')
          .update({ client_id: newClient.id })
          .eq('id', newCall.id);

        // Создаём активности
        await supabaseAdmin.from('activities').insert([
          {
            client_id: newClient.id,
            activity_type: 'client_created',
            content: 'Новый лид из входящего звонка',
          },
          {
            client_id: newClient.id,
            call_id: newCall.id,
            activity_type: 'call_inbound',
            content: status === 'answered'
              ? `Входящий звонок (${body.duration || 0} сек)`
              : 'Пропущенный входящий звонок',
          },
        ]);

        console.log(`New lead created from call: ${newClient.id}`);
      }
    }

    console.log(`UIS call created: ${newCall.id}`);
    return NextResponse.json({
      success: true,
      action: 'created',
      call_id: newCall.id,
      client_id: clientId,
    });

  } catch (error) {
    console.error('UIS webhook error:', error);
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
    service: 'UIS Webhook Handler',
    timestamp: new Date().toISOString(),
  });
}

async function getSourceId(code: string): Promise<string | undefined> {
  const { data } = await supabaseAdmin
    .from('lead_sources')
    .select('id')
    .eq('code', code)
    .single();

  return data?.id;
}
