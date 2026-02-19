import { NextRequest, NextResponse } from 'next/server';
import { getOrgotdelClient } from '@/lib/orgotdel-db';

export async function GET(request: NextRequest) {
  const client = getOrgotdelClient();
  const { searchParams } = new URL(request.url);
  
  const city = searchParams.get('city');
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortOrder = searchParams.get('sortOrder') || 'desc';

  let query = client
    .from('project_calculations')
    .select('*')
    .order(sortBy, { ascending: sortOrder === 'asc' });

  if (city) query = query.eq('city', city);
  if (status) query = query.eq('status', status);
  if (search) query = query.ilike('project_name', `%${search}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const client = getOrgotdelClient();
  const body = await request.json();

  const { data, error } = await client
    .from('project_calculations')
    .insert(body)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
