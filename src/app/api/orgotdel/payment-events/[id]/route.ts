import { NextRequest, NextResponse } from 'next/server';
import { getOrgotdelClient } from '@/lib/orgotdel-db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getOrgotdelClient();
    const { data, error } = await db
      .from('payment_events')
      .select('*, events(id, title, city, hall, date)')
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
    
    // If marking as paid, set paid_at
    if (body.is_paid === true && !body.paid_at) {
      body.paid_at = new Date().toISOString().split('T')[0];
    }
    
    // If marking as unpaid, clear paid_at
    if (body.is_paid === false) {
      body.paid_at = null;
    }
    
    const { data, error } = await db
      .from('payment_events')
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
    const { error } = await db.from('payment_events').delete().eq('id', params.id);
    
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
