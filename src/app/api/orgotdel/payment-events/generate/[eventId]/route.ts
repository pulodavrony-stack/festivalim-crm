import { NextRequest, NextResponse } from 'next/server';
import { getOrgotdelClient } from '@/lib/orgotdel-db';

export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  try {
    const db = getOrgotdelClient();
    
    // Get the event
    const { data: event, error: eventError } = await db
      .from('events')
      .select('*')
      .eq('id', params.eventId)
      .single();
    
    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    // Delete existing payment events for this event
    await db.from('payment_events').delete().eq('event_id', params.eventId);
    
    const payments: any[] = [];
    const eventDate = new Date(event.date);
    const contractDate = event.contract_date ? new Date(event.contract_date) : new Date();
    
    // Get hall info and venue details
    const { data: halls } = await db
      .from('halls')
      .select('id, venue_details(*)')
      .eq('name', event.hall);
    
    const hall = halls?.[0];
    const venueDetails = hall?.venue_details;
    
    if (venueDetails) {
      // Prepayment (after contract)
      if (venueDetails.prepayment_amount && venueDetails.prepayment_days_after_contract !== null) {
        const dueDate = new Date(contractDate);
        dueDate.setDate(dueDate.getDate() + (venueDetails.prepayment_days_after_contract || 0));
        payments.push({
          event_id: params.eventId,
          payment_type: 'prepayment',
          due_date: dueDate.toISOString().split('T')[0],
          amount: venueDetails.prepayment_amount,
        });
      }
      
      // Final payment (before event)
      if (venueDetails.final_payment_amount && venueDetails.final_payment_days_before_event !== null) {
        const dueDate = new Date(eventDate);
        dueDate.setDate(dueDate.getDate() - (venueDetails.final_payment_days_before_event || 0));
        payments.push({
          event_id: params.eventId,
          payment_type: 'final',
          due_date: dueDate.toISOString().split('T')[0],
          amount: venueDetails.final_payment_amount,
        });
      }
    }
    
    // Get show details for fee payments
    const { data: shows } = await db
      .from('shows')
      .select('id, show_details(*)')
      .eq('title', event.title);
    
    const show = shows?.[0];
    const showDetails = show?.show_details;
    
    if (showDetails) {
      // Fee prepayment
      if (showDetails.fee_prepayment_amount && showDetails.fee_prepayment_days_after_contract !== null) {
        const dueDate = new Date(contractDate);
        dueDate.setDate(dueDate.getDate() + (showDetails.fee_prepayment_days_after_contract || 0));
        payments.push({
          event_id: params.eventId,
          payment_type: 'fee_prepayment',
          due_date: dueDate.toISOString().split('T')[0],
          amount: showDetails.fee_prepayment_amount,
        });
      }
      
      // Fee final payment
      if (showDetails.fee_final_amount && showDetails.fee_final_days_before_event !== null) {
        const dueDate = new Date(eventDate);
        dueDate.setDate(dueDate.getDate() - (showDetails.fee_final_days_before_event || 0));
        payments.push({
          event_id: params.eventId,
          payment_type: 'fee_final',
          due_date: dueDate.toISOString().split('T')[0],
          amount: showDetails.fee_final_amount,
        });
      }
    }
    
    // Insert all payments
    if (payments.length > 0) {
      const { data, error } = await db.from('payment_events').insert(payments).select();
      if (error) throw error;
      return NextResponse.json(data);
    }
    
    return NextResponse.json([]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
