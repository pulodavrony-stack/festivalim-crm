import { NextRequest, NextResponse } from 'next/server';
import { getOrgotdelClient } from '@/lib/orgotdel-db';

export async function GET(request: NextRequest) {
  try {
    const db = getOrgotdelClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    let query = db
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false);
    
    if (userId) {
      query = query.or(`user_id.eq.${userId},user_id.is.null`);
    }
    
    const { count, error } = await query;
    
    if (error) throw error;
    return NextResponse.json({ count: count || 0 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
