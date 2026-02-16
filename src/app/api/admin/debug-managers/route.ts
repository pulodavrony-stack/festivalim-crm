// =============================================
// API: Debug Managers
// GET /api/admin/debug-managers
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function GET(request: NextRequest) {
  try {
    // Get all managers with team info
    const { data: managers, error } = await supabaseAdmin
      .from('managers')
      .select('id, email, full_name, role, team_id, is_active')
      .order('email');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get all teams
    const { data: teams } = await supabaseAdmin
      .from('teams')
      .select('id, name, slug');

    return NextResponse.json({
      managers,
      teams,
      count: managers?.length || 0
    });

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
