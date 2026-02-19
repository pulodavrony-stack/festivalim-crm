import { NextRequest, NextResponse } from 'next/server';
import { getOrgotdelClient } from '@/lib/orgotdel-db';

export async function GET(
  request: NextRequest,
  { params }: { params: { showId: string } }
) {
  try {
    const db = getOrgotdelClient();
    const { data, error } = await db
      .from('show_details')
      .select('*')
      .eq('show_id', params.showId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return NextResponse.json(data || null);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { showId: string } }
) {
  try {
    const db = getOrgotdelClient();
    const body = await request.json();
    
    // Check if exists
    const { data: existing } = await db
      .from('show_details')
      .select('id')
      .eq('show_id', params.showId)
      .single();
    
    let result;
    if (existing) {
      // Update
      const { data, error } = await db
        .from('show_details')
        .update(body)
        .eq('show_id', params.showId)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      // Insert
      const { data, error } = await db
        .from('show_details')
        .insert({ ...body, show_id: params.showId })
        .select()
        .single();
      if (error) throw error;
      result = data;
    }
    
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { showId: string } }
) {
  try {
    const db = getOrgotdelClient();
    const { error } = await db
      .from('show_details')
      .delete()
      .eq('show_id', params.showId);
    
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
