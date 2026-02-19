import { NextRequest, NextResponse } from 'next/server';
import { getOrgotdelClient } from '@/lib/orgotdel-db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getOrgotdelClient();
    const { data, error } = await db
      .from('tasks')
      .select('*, events(id, title, city, date)')
      .eq('id', params.id)
      .single();
    
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getOrgotdelClient();
    const body = await request.json();
    
    // If status is completed, set completed_at
    if (body.status === 'completed') {
      body.completed_at = new Date().toISOString();
    }
    
    const { data, error } = await db
      .from('tasks')
      .update(body)
      .eq('id', params.id)
      .select()
      .single();
    
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getOrgotdelClient();
    const { error } = await db.from('tasks').delete().eq('id', params.id);
    
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
