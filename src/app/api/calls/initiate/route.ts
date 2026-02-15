// =============================================
// ФЕСТИВАЛИМ CRM: Initiate Call API
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { initiateCall, checkUISConfig } from '@/lib/uis-api';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientPhone, employeeId, employeePhone, clientId, managerId } = body;

    if (!clientPhone) {
      return NextResponse.json(
        { error: 'Номер телефона клиента обязателен' },
        { status: 400 }
      );
    }

    // Проверяем конфигурацию UIS
    const config = checkUISConfig();
    if (!config.configured) {
      return NextResponse.json({
        success: false,
        error: 'UIS Call API не полностью настроен',
        details: config.details,
        fallback: 'tel', // Клиент должен использовать tel: ссылку
      }, { status: 503 });
    }

    // Инициируем звонок через UIS Call API
    const result = await initiateCall(
      clientPhone,
      employeeId ? parseInt(employeeId) : undefined,
      employeePhone
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, details: result.details },
        { status: 500 }
      );
    }

    // Логируем звонок в базу
    if (clientId) {
      try {
        await supabase.from('activities').insert({
          client_id: clientId,
          manager_id: managerId,
          activity_type: 'call_outbound',
          content: `Исходящий звонок на ${clientPhone}`,
          metadata: { call_session_id: result.callId },
        });
      } catch (dbError) {
        console.error('Failed to log call activity:', dbError);
        // Не блокируем ответ из-за ошибки логирования
      }
    }

    return NextResponse.json({
      success: true,
      callId: result.callId,
      message: 'Звонок инициирован. Ожидайте входящий вызов на ваш телефон.',
    });

  } catch (error: any) {
    console.error('Initiate call error:', error);
    return NextResponse.json(
      { error: 'Ошибка сервера', details: error.message },
      { status: 500 }
    );
  }
}

// Проверка статуса конфигурации
export async function GET() {
  const config = checkUISConfig();
  return NextResponse.json({
    configured: config.configured,
    details: config.details,
  });
}
