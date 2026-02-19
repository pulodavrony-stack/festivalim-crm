import { NextRequest, NextResponse } from 'next/server';
import { getOrgotdelClient } from '@/lib/orgotdel-db';

export async function GET(request: NextRequest) {
  try {
    const db = getOrgotdelClient();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const isPaid = searchParams.get('is_paid');
    
    let query = db
      .from('payment_events')
      .select('*, events(id, title, city, hall, date, status)');
    
    if (startDate) {
      query = query.gte('due_date', startDate);
    }
    
    if (endDate) {
      query = query.lte('due_date', endDate);
    }
    
    if (isPaid !== null && isPaid !== undefined) {
      query = query.eq('is_paid', isPaid === 'true');
    }
    
    const { data, error } = await query.order('due_date', { ascending: true });
    
    if (error) throw error;
    
    // Filter out payments for deleted events
    const filteredData = (data || []).filter(
      (p: any) => p.events && !p.events.is_deleted
    );
    
    return NextResponse.json(filteredData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
