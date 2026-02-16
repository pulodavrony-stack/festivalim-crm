import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function createSchemaClient(schema: string) {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema }
  });
}

export async function GET(request: NextRequest) {
  const kstati = createSchemaClient('kstati');
  
  const [clientsRes, dealsRes, pipelinesRes, stagesRes, citiesRes] = await Promise.all([
    kstati.from('clients').select('id, full_name, phone, notes, manager_id').order('created_at', { ascending: false }).limit(20),
    kstati.from('deals').select('id, title, status, is_b2b, pipeline_id, stage_id, client_id').limit(20),
    kstati.from('pipelines').select('id, name, code'),
    kstati.from('pipeline_stages').select('id, name, code, pipeline_id'),
    kstati.from('cities').select('id, name'),
  ]);

  return NextResponse.json({
    clients: { count: clientsRes.data?.length || 0, data: clientsRes.data, error: clientsRes.error?.message },
    deals: { count: dealsRes.data?.length || 0, data: dealsRes.data, error: dealsRes.error?.message },
    pipelines: { data: pipelinesRes.data, error: pipelinesRes.error?.message },
    stages: { data: stagesRes.data, error: stagesRes.error?.message },
    cities: { data: citiesRes.data, error: citiesRes.error?.message },
  });
}
