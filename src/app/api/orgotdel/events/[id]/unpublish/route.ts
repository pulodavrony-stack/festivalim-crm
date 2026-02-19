import { NextRequest, NextResponse } from 'next/server';
import { getOrgotdelClient } from '@/lib/orgotdel-db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getOrgotdelClient();
    
    // Get the event
    const { data: event, error: eventError } = await db
      .from('events')
      .select('*')
      .eq('id', params.id)
      .single();
    
    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    // Create a draft from the event
    const { data: draft, error: draftError } = await db
      .from('drafts')
      .insert({
        show_title: event.title,
        hall_name: event.hall,
        city_name: event.city,
        date: event.date,
        status: 'negotiating',
        notes: event.description,
      })
      .select()
      .single();
    
    if (draftError) throw draftError;
    
    // Soft delete the event
    await db
      .from('events')
      .update({ is_deleted: true, deleted_at: new Date().toISOString().split('T')[0] })
      .eq('id', params.id);
    
    return NextResponse.json(draft);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
