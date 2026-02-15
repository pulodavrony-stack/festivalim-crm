import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('company_id');

    let query = supabase
      .from('contracts')
      .select(`
        *,
        company:companies(id, name),
        contact:company_contacts(id, full_name),
        manager:managers(id, full_name),
        event:events(id, event_date, show:shows(title))
      `)
      .order('contract_date', { ascending: false });

    if (companyId) {
      query = query.eq('company_id', companyId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching contracts:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const total = body.tickets_count * body.ticket_price;
    const discount = body.discount_percent ? (total * body.discount_percent) / 100 : 0;
    const final_amount = total - discount;

    const contractData = {
      ...body,
      total_amount: total,
      discount_amount: discount,
      final_amount,
    };

    const { data, error } = await supabase
      .from('contracts')
      .insert([contractData])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error creating contract:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
