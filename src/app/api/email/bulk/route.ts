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
    const {
      schema,
      pipeline_id,
      stage_id,
      city_id,
      subject,
      body_template,
      is_html,
    } = body;

    if (!schema || !subject || !body_template) {
      return NextResponse.json(
        { error: 'Поля schema, subject, body_template обязательны' },
        { status: 400 }
      );
    }

    const supabase = createSchemaClient(schema);

    // Build query: get deals with clients that have email
    let query = supabase
      .from('deals')
      .select('id, client:clients(id, full_name, email, phone, city_id)')
      .eq('status', 'active');

    if (pipeline_id) query = query.eq('pipeline_id', pipeline_id);
    if (stage_id) query = query.eq('stage_id', stage_id);

    const { data: deals, error: dealsError } = await query;

    if (dealsError) {
      return NextResponse.json({ error: dealsError.message }, { status: 500 });
    }

    // Extract unique clients with email
    const clientMap = new Map<string, any>();
    for (const deal of deals || []) {
      const client = deal.client as any;
      if (!client || !client.email) continue;
      if (city_id && client.city_id !== city_id) continue;
      if (!clientMap.has(client.id)) {
        clientMap.set(client.id, client);
      }
    }

    const clients = Array.from(clientMap.values());

    if (clients.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        skipped: 0,
        errors: 0,
        message: 'Нет клиентов с email в выбранном сегменте',
      });
    }

    const results: Array<{ email: string; status: string; error?: string }> = [];
    let sent = 0;
    let errors = 0;

    for (const client of clients) {
      try {
        // Extract organization name from notes (first line after emoji)
        const orgName = client.full_name || '';

        const vars: Record<string, string> = {
          name: client.full_name || '',
          email: client.email || '',
          phone: client.phone || '',
          organization: orgName,
        };

        const personalizedBody = replaceTemplateVars(body_template, vars);
        const personalizedSubject = replaceTemplateVars(subject, vars);

        await sendEmail({
          to: client.email,
          subject: personalizedSubject,
          ...(is_html ? { html: personalizedBody } : { text: personalizedBody }),
        });

        // Log activity
        await supabase.from('activities').insert({
          client_id: client.id,
          activity_type: 'message_outbound',
          content: `Email рассылка: "${personalizedSubject}"`,
        });

        results.push({ email: client.email, status: 'sent' });
        sent++;

        // Small delay between emails to avoid rate limiting
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
    console.error('Bulk email error:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка рассылки' },
      { status: 500 }
    );
  }
}
