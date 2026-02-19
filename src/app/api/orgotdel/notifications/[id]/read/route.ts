import { NextRequest, NextResponse } from 'next/server';
import { getOrgotdelClient } from '@/lib/orgotdel-db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getOrgotdelClient();
    
    const { data, error } = await db
      .from('notifications')
      .update({ is_read: true })
      .eq('id', params.id)
      .select()
      .single();
    
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
