import { NextRequest, NextResponse } from 'next/server';
import { getOrgotdelClient } from '@/lib/orgotdel-db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getOrgotdelClient();
    
    // Get the draft
    const { data: draft, error: draftError } = await db
      .from('drafts')
      .select('*')
      .eq('id', params.id)
      .single();
    
    if (draftError || !draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }
    
    if (draft.published_event_id) {
      return NextResponse.json({ error: 'Draft already published' }, { status: 400 });
    }
    
    // Create event from draft
    const { data: event, error: eventError } = await db
      .from('events')
      .insert({
        title: draft.show_title,
        city: draft.city_name,
        hall: draft.hall_name,
        date: draft.date,
        description: draft.notes,
        status: 'signed',
        responsible_department: 'organization',
      })
      .select()
      .single();
    
    if (eventError) throw eventError;
    
    // Update draft with published event ID
    await db
      .from('drafts')
      .update({ 
        published_event_id: event.id,
        status: 'signed'
      })
      .eq('id', params.id);
    
    return NextResponse.json(event);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
