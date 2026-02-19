import { NextRequest, NextResponse } from 'next/server';
import { getOrgotdelClient } from '@/lib/orgotdel-db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const client = getOrgotdelClient();

  const { data: original, error: fetchError } = await client
    .from('project_calculations')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 404 });

  const { id: _id, created_at, updated_at, ...fields } = original;
  
  const { data, error } = await client
    .from('project_calculations')
    .insert({
      ...fields,
      project_name: `${fields.project_name} (копия)`,
      status: 'draft',
      actual_values: '{}',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
