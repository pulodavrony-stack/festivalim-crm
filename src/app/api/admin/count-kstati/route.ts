import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  const kstati = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: 'kstati' },
  });

  const { count: clientCount } = await kstati
    .from('clients')
    .select('*', { count: 'exact', head: true });

  const { count: dealCount } = await kstati
    .from('deals')
    .select('*', { count: 'exact', head: true });

  const { data: cities } = await kstati
    .from('cities')
    .select('name, id');

  const { data: pipelines } = await kstati
    .from('pipelines')
    .select('id, name, code, sort_order');

  const { data: stages } = await kstati
    .from('pipeline_stages')
    .select('id, name, code, pipeline_id, sort_order')
    .order('sort_order');

  const { data: sampleDeals } = await kstati
    .from('deals')
    .select('id, title, pipeline_id, stage_id, status, is_b2b')
    .limit(5);

  const { data: dealsByPipeline } = await kstati
    .from('deals')
    .select('pipeline_id')
    .eq('status', 'active');

  const pipelineCounts: Record<string, number> = {};
  if (dealsByPipeline) {
    for (const d of dealsByPipeline) {
      pipelineCounts[d.pipeline_id] = (pipelineCounts[d.pipeline_id] || 0) + 1;
    }
  }

  return NextResponse.json({
    clients_total: clientCount,
    deals_total: dealCount,
    cities,
    pipelines,
    stages,
    sample_deals: sampleDeals,
    deals_by_pipeline: pipelineCounts,
  });
}
