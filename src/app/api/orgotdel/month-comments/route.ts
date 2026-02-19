import { NextRequest, NextResponse } from 'next/server';
import { getOrgotdelClient } from '@/lib/orgotdel-db';

export async function GET(request: NextRequest) {
  try {
    const db = getOrgotdelClient();
    const { searchParams } = new URL(request.url);
    const yearMonth = searchParams.get('year_month');
    
    let query = db.from('month_comments').select('*');
    
    if (yearMonth) {
      query = query.eq('year_month', yearMonth);
    }
    
    const { data, error } = await query.order('year_month', { ascending: true });
    
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getOrgotdelClient();
    const body = await request.json();
    
    // Upsert - insert or update
    const { data: existing } = await db
      .from('month_comments')
      .select('id')
      .eq('year_month', body.year_month)
      .single();
    
    let result;
    if (existing) {
      const { data, error } = await db
        .from('month_comments')
        .update({ comment: body.comment, updated_at: new Date().toISOString() })
        .eq('year_month', body.year_month)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await db
        .from('month_comments')
        .insert(body)
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
