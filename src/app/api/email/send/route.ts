import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, getSenderByTeam } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, text, html, schema } = body;

    if (!to || !subject) {
      return NextResponse.json(
        { error: 'Поля "to" и "subject" обязательны' },
        { status: 400 }
      );
    }

    const result = await sendEmail({ to, subject, text, html, schema });

    return NextResponse.json({
      success: true,
      emailId: result.result?.email_id,
    });
  } catch (error: any) {
    console.error('Email send error:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка отправки письма' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const schema = request.nextUrl.searchParams.get('schema') || undefined;
  const sender = getSenderByTeam(schema);
  return NextResponse.json({
    senderEmail: sender.email,
    senderName: sender.name,
    configured: !!sender.email,
  });
}
