import { NextRequest, NextResponse } from 'next/server';
import { getOrgotdelClient } from '@/lib/orgotdel-db';

export async function POST(request: NextRequest) {
  try {
    const db = getOrgotdelClient();
    const body = await request.json();
    const userId = body.user_id;
    
    let query = db.from('notifications').update({ is_read: true });
    
    if (userId) {
      query = query.or(`user_id.eq.${userId},user_id.is.null`);
    }
    
    const { error } = await query;
    
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
