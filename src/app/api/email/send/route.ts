import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, text, html } = body;

    if (!to || !subject) {
      return NextResponse.json(
        { error: 'Поля "to" и "subject" обязательны' },
        { status: 400 }
      );
    }

    const result = await sendEmail({ to, subject, text, html });

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error: any) {
    console.error('Email send error:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка отправки письма' },
      { status: 500 }
    );
  }
}
