import { NextRequest, NextResponse } from 'next/server';
import { getOrgotdelClient } from '@/lib/orgotdel-db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getOrgotdelClient();
    const { data, error } = await db
      .from('drafts')
      .select('*')
      .eq('id', params.id)
      .single();
    
    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }
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
    
    // If status is being set to 'signed', auto-publish
    if (body.status === 'signed') {
      const { data: draft } = await db
        .from('drafts')
        .select('*')
        .eq('id', params.id)
        .single();
      
      if (draft && !draft.published_event_id) {
        // Create event from draft
        const { data: event } = await db
          .from('events')
          .insert({
            title: draft.show_title,
            city: draft.city_name,
            hall: draft.hall_name,
            date: body.date || draft.date,
            description: draft.notes,
            status: 'signed',
            responsible_department: 'organization',
          })
          .select()
          .single();
        
        if (event) {
          body.published_event_id = event.id;
        }
      }
    }
    
    const { data, error } = await db
      .from('drafts')
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
    const { error } = await db.from('drafts').delete().eq('id', params.id);
    
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
