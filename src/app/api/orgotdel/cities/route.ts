import { NextRequest, NextResponse } from 'next/server';
import { getOrgotdelClient } from '@/lib/orgotdel-db';

export async function GET() {
  try {
    const db = getOrgotdelClient();
    const { data, error } = await db
      .from('cities')
      .select('*')
      .order('priority', { ascending: true })
      .order('name', { ascending: true });
    
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
    
    const { data, error } = await db.from('cities').insert(body).select().single();
    
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
