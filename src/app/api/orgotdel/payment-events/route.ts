import { NextRequest, NextResponse } from 'next/server';
import { getOrgotdelClient } from '@/lib/orgotdel-db';

export async function GET(request: NextRequest) {
  try {
    const db = getOrgotdelClient();
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');
    
    let query = db.from('payment_events').select('*');
    
    if (eventId) {
      query = query.eq('event_id', eventId);
    }
    
    const { data, error } = await query.order('due_date', { ascending: true });
    
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getOrgotdelClient();
    const body = await request.json();
    
    const { data, error } = await db.from('payment_events').insert(body).select().single();
    
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
