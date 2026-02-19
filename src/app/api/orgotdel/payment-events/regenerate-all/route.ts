import { NextResponse } from 'next/server';
import { getOrgotdelClient } from '@/lib/orgotdel-db';

export async function POST() {
  try {
    const db = getOrgotdelClient();
    
    // Get all non-deleted events
    const { data: events, error: eventsError } = await db
      .from('events')
      .select('id')
      .eq('is_deleted', false);
    
    if (eventsError) throw eventsError;
    
    let totalGenerated = 0;
    
    for (const event of events || []) {
      // Call the generate endpoint for each event
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/orgotdel/payment-events/generate/${event.id}`,
        { method: 'POST' }
      );
      
      if (response.ok) {
        const data = await response.json();
        totalGenerated += Array.isArray(data) ? data.length : 0;
      }
    }
    
    return NextResponse.json({
      success: true,
      eventsProcessed: events?.length || 0,
      paymentsGenerated: totalGenerated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
