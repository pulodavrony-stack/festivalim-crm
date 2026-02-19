import { NextRequest, NextResponse } from 'next/server';
import { getOrgotdelClient } from '@/lib/orgotdel-db';

export async function GET(request: NextRequest) {
  try {
    const db = getOrgotdelClient();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    let query = db.from('available_dates').select('*');
    
    if (type) {
      query = query.eq('type', type);
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
    
    const { data, error } = await db.from('available_dates').insert(body).select().single();
    
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
