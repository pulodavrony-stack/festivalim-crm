import { NextResponse } from 'next/server';
import { getOrgotdelClient } from '@/lib/orgotdel-db';

export async function GET() {
  try {
    const db = getOrgotdelClient();
    const { data, error } = await db
      .from('departments')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
