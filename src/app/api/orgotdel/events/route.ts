import { NextRequest, NextResponse } from 'next/server';
import { getOrgotdelClient, Event } from '@/lib/orgotdel-db';

export async function GET(request: NextRequest) {
  try {
    const db = getOrgotdelClient();
    const { searchParams } = new URL(request.url);
    
    const filter = searchParams.get('filter');
    const city = searchParams.get('city');
    
    let query = db.from('events').select('*').eq('is_deleted', false);
    
    if (filter === 'future') {
      query = query.gte('date', new Date().toISOString().split('T')[0]);
    } else if (filter === 'past') {
      query = query.lt('date', new Date().toISOString().split('T')[0]);
    }
    
    if (city) {
      query = query.eq('city', city);
    }
    
    const { data, error } = await query.order('date', { ascending: true });
    
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
    
    const { data, error } = await db.from('events').insert(body).select().single();
    
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
