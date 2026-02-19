import { NextRequest, NextResponse } from 'next/server';
import { getOrgotdelClient } from '@/lib/orgotdel-db';

export async function GET(request: NextRequest) {
  try {
    const db = getOrgotdelClient();
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    
    // Get all events
    const { data: events, error: eventsError } = await db
      .from('events')
      .select('*')
      .eq('is_deleted', false);
    
    if (eventsError) throw eventsError;
    
    // Get all drafts
    const { data: drafts, error: draftsError } = await db
      .from('drafts')
      .select('*');
    
    if (draftsError) throw draftsError;
    
    // Get all payment events
    const { data: payments, error: paymentsError } = await db
      .from('payment_events')
      .select('*');
    
    if (paymentsError) throw paymentsError;
    
    // Calculate statistics
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const futureEvents = (events || []).filter(e => e.date >= today);
    const pastEvents = (events || []).filter(e => e.date < today);
    
    const signedDrafts = (drafts || []).filter(d => d.status === 'signed');
    const negotiatingDrafts = (drafts || []).filter(d => d.status === 'negotiating');
    const signingDrafts = (drafts || []).filter(d => d.status === 'signing');
    
    const paidPayments = (payments || []).filter(p => p.is_paid);
    const unpaidPayments = (payments || []).filter(p => !p.is_paid);
    const overduePayments = unpaidPayments.filter(p => p.due_date < today);
    
    // Events by city
    const eventsByCity: Record<string, number> = {};
    for (const event of events || []) {
      eventsByCity[event.city] = (eventsByCity[event.city] || 0) + 1;
    }
    
    // Events by month
    const eventsByMonth: Record<string, number> = {};
    for (const event of events || []) {
      const month = event.date.substring(0, 7);
      eventsByMonth[month] = (eventsByMonth[month] || 0) + 1;
    }
    
    // Events by status
    const eventsByStatus = {
      negotiating: (events || []).filter(e => e.status === 'negotiating').length,
      signing: (events || []).filter(e => e.status === 'signing').length,
      signed: (events || []).filter(e => e.status === 'signed').length,
    };
    
    // Payment totals
    const totalPaymentAmount = (payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
    const paidAmount = paidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const unpaidAmount = unpaidPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    return NextResponse.json({
      summary: {
        totalEvents: (events || []).length,
        futureEvents: futureEvents.length,
        pastEvents: pastEvents.length,
        totalDrafts: (drafts || []).length,
        signedDrafts: signedDrafts.length,
        negotiatingDrafts: negotiatingDrafts.length,
        signingDrafts: signingDrafts.length,
      },
      payments: {
        total: (payments || []).length,
        paid: paidPayments.length,
        unpaid: unpaidPayments.length,
        overdue: overduePayments.length,
        totalAmount: totalPaymentAmount,
        paidAmount,
        unpaidAmount,
      },
      eventsByCity,
      eventsByMonth,
      eventsByStatus,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
