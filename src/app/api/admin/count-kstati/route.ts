import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

  const { data: sampleClients } = await kstati
    .from('clients')
    .select('full_name, phone, email, city_id')
    .order('created_at', { ascending: false })
    .limit(5);

  return NextResponse.json({
    clients_total: clientCount,
    deals_total: dealCount,
    cities,
    recent_clients: sampleClients,
  });
}
