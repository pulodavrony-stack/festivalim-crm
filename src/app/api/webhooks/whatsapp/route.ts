// =============================================
// ФЕСТИВАЛИМ: WhatsApp Business API Webhook
// =============================================
// Файл: /app/api/webhooks/whatsapp/route.ts
//
// Настройка WABA:
// 1. Meta Business Suite → WhatsApp → Настройки
// 2. Webhook URL: https://your-domain.com/api/webhooks/whatsapp
// 3. Verify Token: WHATSAPP_VERIFY_TOKEN из .env
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { WABAWebhook, Message } from '@/types';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const WABA_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

// GET — верификация вебхука от Meta
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WhatsApp webhook verified');
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// POST — входящие сообщения и статусы
export async function POST(request: NextRequest) {
  try {
    const body: WABAWebhook = await request.json();
    
    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ status: 'ignored' });
    }

    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.field !== 'messages') continue;

        const value = change.value;

        // Обработка входящих сообщений
        if (value.messages) {
          for (const msg of value.messages) {
            await processIncomingMessage(msg, value.contacts?.[0]);
          }
        }

        // Обработка статусов доставки
        if (value.statuses) {
          for (const status of value.statuses) {
            await processMessageStatus(status);
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

type WABAMessage = NonNullable<WABAWebhook['entry'][0]['changes'][0]['value']['messages']>[0];

async function processIncomingMessage(
  msg: WABAMessage,
  contact?: { profile: { name: string }; wa_id: string }
) {
  const phone = msg.from;
  const waId = contact?.wa_id || phone;
  const name = contact?.profile?.name || `WhatsApp ${phone}`;
  const text = msg.text?.body || '';

  console.log(`Incoming WhatsApp from ${phone}: ${text}`);

  // Ищем клиента по WhatsApp ID или телефону
  let client = await findClientByWhatsApp(phone);

  if (!client) {
    // Ищем по телефону
    const { data: existingByPhone } = await supabase
      .rpc('find_client_by_phone', { search_phone: phone });

    if (existingByPhone && existingByPhone.length > 0) {
      // Обновляем WhatsApp данные
      await supabase
        .from('clients')
        .update({
          whatsapp_phone: phone,
          whatsapp_id: waId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingByPhone[0].id);
      
      client = existingByPhone[0];
    } else {
      // Создаём нового клиента
      const { data: newClient } = await supabase
        .from('clients')
        .insert({
          full_name: name,
          phone: phone,
          whatsapp_phone: phone,
          whatsapp_id: waId,
          client_type: 'lead',
          source_id: await getSourceId('whatsapp'),
        })
        .select()
        .single();

      client = newClient;

      // Логируем создание
      if (client) {
        await supabase.from('activities').insert({
          client_id: client.id,
          activity_type: 'client_created',
          content: 'Новый лид из WhatsApp',
        });
      }
    }
  }

  if (!client) {
    console.error('Failed to find/create client for WhatsApp message');
    return;
  }

  // Сохраняем сообщение
  const { data: savedMessage } = await supabase
    .from('messages')
    .insert({
      client_id: client.id,
      channel: 'whatsapp',
      direction: 'inbound',
      external_id: msg.id,
      content: text,
      content_type: msg.type === 'text' ? 'text' : msg.type as any,
      created_at: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
    })
    .select()
    .single();

  // Создаём активность
  await supabase.from('activities').insert({
    client_id: client.id,
    message_id: savedMessage?.id,
    activity_type: 'message_inbound',
    content: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
  });

  // Обновляем last_contact_date
  await supabase
    .from('clients')
    .update({ 
      last_contact_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', client.id);

  // TODO: Здесь можно добавить ИИ-анализ сообщения
  // и автоматические ответы
}

type WABAStatus = NonNullable<WABAWebhook['entry'][0]['changes'][0]['value']['statuses']>[0];

async function processMessageStatus(status: WABAStatus) {
  // Обновляем статус доставки сообщения
  const deliveryStatus = status.status as 'sent' | 'delivered' | 'read' | 'failed';
  
  await supabase
    .from('messages')
    .update({ delivery_status: deliveryStatus })
    .eq('external_id', status.id);
}

async function findClientByWhatsApp(phone: string) {
  const { data } = await supabase
    .from('clients')
    .select('*')
    .eq('whatsapp_phone', phone)
    .single();
  
  return data;
}

async function getSourceId(code: string): Promise<string | undefined> {
  const { data } = await supabase
    .from('lead_sources')
    .select('id')
    .eq('code', code)
    .single();
  
  return data?.id;
}

// Функции отправки сообщений перенесены в @/lib/whatsapp.ts
