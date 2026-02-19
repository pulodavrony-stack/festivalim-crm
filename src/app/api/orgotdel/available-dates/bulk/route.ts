import { NextRequest, NextResponse } from 'next/server';
import { getOrgotdelClient } from '@/lib/orgotdel-db';

export async function POST(request: NextRequest) {
  try {
    const db = getOrgotdelClient();
    const { dates } = await request.json();
    
    if (!Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: 'dates array is required' }, { status: 400 });
    }
    
    const { data, error } = await db.from('available_dates').insert(dates).select();
    
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
