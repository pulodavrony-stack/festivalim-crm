import { NextRequest, NextResponse } from 'next/server';
import { getOrgotdelClient } from '@/lib/orgotdel-db';

export async function GET() {
  try {
    const db = getOrgotdelClient();
    const { data, error } = await db
      .from('events')
      .select('*')
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false });
    
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
