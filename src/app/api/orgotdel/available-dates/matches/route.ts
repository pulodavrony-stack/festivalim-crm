import { NextResponse } from 'next/server';
import { getOrgotdelClient } from '@/lib/orgotdel-db';

export async function GET() {
  try {
    const db = getOrgotdelClient();
    
    // Get all available dates
    const { data: showDates, error: showError } = await db
      .from('available_dates')
      .select('*')
      .eq('type', 'show');
    
    const { data: hallDates, error: hallError } = await db
      .from('available_dates')
      .select('*')
      .eq('type', 'hall');
    
    if (showError) throw showError;
    if (hallError) throw hallError;
    
    // Find matches: same date between shows seeking halls and halls seeking shows
    const matches: any[] = [];
    
    for (const showDate of showDates || []) {
      for (const hallDate of hallDates || []) {
        if (showDate.date === hallDate.date) {
          matches.push({
            date: showDate.date,
            show: {
              id: showDate.id,
              title: showDate.show_title,
              notes: showDate.notes,
            },
            hall: {
              id: hallDate.id,
              name: hallDate.hall_name,
              city: hallDate.city_name,
              notes: hallDate.notes,
            },
          });
        }
      }
    }
    
    return NextResponse.json(matches);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
