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
      .select('id, email, full_name, role, team_id, is_active, auth_user_id')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message, errorDetails: error }, { status: 500 });
    }

    // Get all teams
    const { data: teams } = await supabaseAdmin
      .from('teams')
      .select('id, name, slug');

    // Get auth users
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    
    const authUserEmails = authUsers?.users?.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at
    })) || [];

    return NextResponse.json({
      managers,
      teams,
      authUsers: authUserEmails,
      managersCount: managers?.length || 0,
      authUsersCount: authUserEmails.length
    });

  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Also add POST to fix managers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    if (action === 'sync_auth_to_managers') {
      // Get auth users that don't have manager records
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
      const { data: existingManagers } = await supabaseAdmin
        .from('managers')
        .select('auth_user_id, email');
      
      const existingAuthIds = new Set(existingManagers?.map(m => m.auth_user_id) || []);
      const existingEmails = new Set(existingManagers?.map(m => m.email) || []);
      
      const missingUsers = authUsers?.users?.filter(u => 
        !existingAuthIds.has(u.id) && !existingEmails.has(u.email)
      ) || [];
      
      return NextResponse.json({
        missingUsers: missingUsers.map(u => ({ id: u.id, email: u.email })),
        existingManagers: existingManagers?.length || 0
      });
    }
    
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
