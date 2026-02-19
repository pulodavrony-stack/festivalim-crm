import { NextRequest, NextResponse } from 'next/server';
import { getOrgotdelClient } from '@/lib/orgotdel-db';

export async function GET(request: NextRequest) {
  try {
    const db = getOrgotdelClient();
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const assigneeId = searchParams.get('assignee_id');
    const status = searchParams.get('status');
    
    let query = db.from('tasks').select('*, events(id, title, city, date)');
    
    if (department) {
      query = query.eq('department', department);
    }
    
    if (assigneeId) {
      query = query.eq('assignee_id', assigneeId);
    }
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query
      .order('priority', { ascending: true })
      .order('due_date', { ascending: true });
    
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
    
    const { data, error } = await db.from('tasks').insert(body).select().single();
    
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
