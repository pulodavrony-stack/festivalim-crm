import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Создаем клиент с service role для обхода RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * API endpoint для автоматического переноса клиентов в КБ после посещения спектакля.
 * 
 * Логика:
 * - Запускается ежедневно (cron)
 * - Находит события (event_date = вчера)
 * - Находит сделки в финальных этапах ("Сделка") привязанные к этим событиям
 * - Перемещает их в воронку "Клиентская база", этап "База постоянных клиентов"
 * - Обновляет client_type клиента на 'kb'
 */
export async function POST(request: Request) {
  try {
    // Проверка авторизации (простой cron secret)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Вычисляем вчерашнюю дату
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    console.log(`[Transfer to KB] Processing events from ${yesterdayStr}`);

    // 1. Находим воронку "Клиентская база" и этап "База постоянных клиентов"
    const { data: kbPipeline } = await supabase
      .from('pipelines')
      .select('id')
      .or('code.eq.kb,name.ilike.%Клиентская база%')
      .single();

    if (!kbPipeline) {
      console.error('[Transfer to KB] КБ pipeline not found');
      return NextResponse.json({ error: 'КБ pipeline not found' }, { status: 500 });
    }

    const { data: kbBaseStage } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('pipeline_id', kbPipeline.id)
      .or('code.eq.kb_base,name.ilike.%База постоянных%')
      .order('sort_order')
      .limit(1)
      .single();

    if (!kbBaseStage) {
      console.error('[Transfer to KB] КБ base stage not found');
      return NextResponse.json({ error: 'КБ base stage not found' }, { status: 500 });
    }

    console.log(`[Transfer to KB] Target: pipeline=${kbPipeline.id}, stage=${kbBaseStage.id}`);

    // 2. Находим события с датой = вчера
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id')
      .eq('event_date', yesterdayStr);

    if (eventsError) {
      console.error('[Transfer to KB] Error fetching events:', eventsError);
      return NextResponse.json({ error: eventsError.message }, { status: 500 });
    }

    if (!events || events.length === 0) {
      console.log(`[Transfer to KB] No events found for ${yesterdayStr}`);
      return NextResponse.json({ 
        message: 'No events found for yesterday',
        processed: 0 
      });
    }

    const eventIds = events.map(e => e.id);
    console.log(`[Transfer to KB] Found ${eventIds.length} events`);

    // 3. Находим финальные этапы (успешные сделки) в воронках "Новые клиенты" и "ПК"
    const { data: successStages } = await supabase
      .from('pipeline_stages')
      .select('id, pipeline_id')
      .or('code.eq.deal,name.ilike.%Сделка%,is_success.eq.true');

    if (!successStages || successStages.length === 0) {
      console.log('[Transfer to KB] No success stages found');
      return NextResponse.json({ 
        message: 'No success stages configured',
        processed: 0 
      });
    }

    const successStageIds = successStages.map(s => s.id);
    console.log(`[Transfer to KB] Success stages: ${successStageIds.join(', ')}`);

    // 4. Находим сделки в этих этапах, привязанные к вчерашним событиям
    const { data: deals, error: dealsError } = await supabase
      .from('deals')
      .select('id, client_id, pipeline_id, stage_id')
      .in('event_id', eventIds)
      .in('stage_id', successStageIds)
      .neq('pipeline_id', kbPipeline.id); // Исключаем уже в КБ

    if (dealsError) {
      console.error('[Transfer to KB] Error fetching deals:', dealsError);
      return NextResponse.json({ error: dealsError.message }, { status: 500 });
    }

    if (!deals || deals.length === 0) {
      console.log('[Transfer to KB] No deals to transfer');
      return NextResponse.json({ 
        message: 'No deals to transfer',
        processed: 0 
      });
    }

    console.log(`[Transfer to KB] Found ${deals.length} deals to transfer`);

    // 5. Переносим сделки в КБ
    const dealIds = deals.map(d => d.id);
    const { error: updateDealsError } = await supabase
      .from('deals')
      .update({
        pipeline_id: kbPipeline.id,
        stage_id: kbBaseStage.id,
      })
      .in('id', dealIds);

    if (updateDealsError) {
      console.error('[Transfer to KB] Error updating deals:', updateDealsError);
      return NextResponse.json({ error: updateDealsError.message }, { status: 500 });
    }

    // 6. Обновляем client_type клиентов на 'kb'
    const clientIds = [...new Set(deals.map(d => d.client_id).filter(Boolean))];
    if (clientIds.length > 0) {
      const { error: updateClientsError } = await supabase
        .from('clients')
        .update({ client_type: 'kb' })
        .in('id', clientIds);

      if (updateClientsError) {
        console.error('[Transfer to KB] Error updating clients:', updateClientsError);
        // Не прерываем — сделки уже перенесены
      }
    }

    console.log(`[Transfer to KB] Successfully transferred ${deals.length} deals`);

    return NextResponse.json({
      success: true,
      message: `Transferred ${deals.length} deals to КБ`,
      processed: deals.length,
      dealIds,
      clientIds,
    });

  } catch (error: any) {
    console.error('[Transfer to KB] Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET для тестирования
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/cron/transfer-to-kb',
    method: 'POST',
    description: 'Автоматический перенос клиентов в КБ после посещения спектакля',
    usage: 'POST with Authorization: Bearer <CRON_SECRET>',
  });
}
