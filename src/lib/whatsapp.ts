// =============================================
// ФЕСТИВАЛИМ: WhatsApp Business API Functions
// =============================================

import { supabase } from '@/lib/supabase';

const WABA_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

// =============================================
// ОТПРАВКА СООБЩЕНИЙ
// =============================================

export async function sendWhatsAppMessage(
  to: string, 
  text: string,
  clientId?: string,
  dealId?: string,
  managerId?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WABA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to.replace(/\D/g, ''),
          type: 'text',
          text: { body: text },
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to send message');
    }

    const externalId = result.messages?.[0]?.id;

    // Сохраняем исходящее сообщение
    if (clientId) {
      const { data: savedMessage } = await supabase
        .from('messages')
        .insert({
          client_id: clientId,
          manager_id: managerId,
          deal_id: dealId,
          channel: 'whatsapp',
          direction: 'outbound',
          external_id: externalId,
          content: text,
          content_type: 'text',
          delivery_status: 'sent',
        })
        .select()
        .single();

      // Активность
      await supabase.from('activities').insert({
        client_id: clientId,
        deal_id: dealId,
        manager_id: managerId,
        message_id: savedMessage?.id,
        activity_type: 'message_outbound',
        content: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      });
    }

    return { success: true, messageId: externalId };

  } catch (error: any) {
    console.error('WhatsApp send error:', error);
    return { success: false, error: error.message };
  }
}

// Отправка шаблонного сообщения
export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string = 'ru',
  components?: any[],
  clientId?: string,
  managerId?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WABA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to.replace(/\D/g, ''),
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            components: components,
          },
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || 'Failed to send template');
    }

    const externalId = result.messages?.[0]?.id;

    // Сохраняем сообщение
    if (clientId) {
      await supabase.from('messages').insert({
        client_id: clientId,
        manager_id: managerId,
        channel: 'whatsapp',
        direction: 'outbound',
        external_id: externalId,
        content: `[Шаблон: ${templateName}]`,
        content_type: 'text',
        delivery_status: 'sent',
      });
    }

    return { success: true, messageId: externalId };

  } catch (error: any) {
    console.error('WhatsApp template error:', error);
    return { success: false, error: error.message };
  }
}
