import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, replaceTemplateVars } from '@/lib/email';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function createSchemaClient(schema: string) {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { schema, subject, body_template, is_html, client_ids } = body;

    if (!schema || !subject || !body_template) {
      return NextResponse.json(
        { error: 'Поля schema, subject, body_template обязательны' },
        { status: 400 }
      );
    }

    const supabase = createSchemaClient(schema);

    let query = supabase
      .from('clients')
      .select('id, full_name, email, phone')
      .not('email', 'is', null)
      .neq('email', '');

    if (client_ids && client_ids.length > 0) {
      query = query.in('id', client_ids);
    }

    const { data: clients, error: clientsError } = await query;

    if (clientsError) {
      return NextResponse.json({ error: clientsError.message }, { status: 500 });
    }

    if (!clients || clients.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        errors: 0,
        total_clients: 0,
        message: 'Нет контактов с email',
      });
    }

    const results: Array<{ email: string; status: string; error?: string }> = [];
    let sent = 0;
    let errors = 0;

    for (const client of clients) {
      try {
        const vars: Record<string, string> = {
          name: client.full_name || '',
          email: client.email || '',
          phone: client.phone || '',
          organization: client.full_name || '',
        };

        const personalizedBody = replaceTemplateVars(body_template, vars);
        const personalizedSubject = replaceTemplateVars(subject, vars);

        await sendEmail({
          to: client.email,
          subject: personalizedSubject,
          schema,
          ...(is_html ? { html: personalizedBody } : { text: personalizedBody }),
        });

        await supabase.from('activities').insert({
          client_id: client.id,
          activity_type: 'message_outbound',
          content: `Email рассылка: "${personalizedSubject}"`,
        });

        results.push({ email: client.email, status: 'sent' });
        sent++;

        await new Promise((r) => setTimeout(r, 500));
      } catch (err: any) {
        results.push({ email: client.email, status: 'error', error: err.message });
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      total_clients: clients.length,
      sent,
      errors,
      results,
    });
  } catch (error: any) {
    console.error('Bulk direct email error:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка рассылки' },
      { status: 500 }
    );
  }
}
