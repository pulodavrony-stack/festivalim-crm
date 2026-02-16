// =============================================
// API: Create Manager
// POST /api/admin/create-manager
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      full_name,
      email,
      password,
      phone,
      role,
      team_id,
      is_active = true,
      has_b2c_access = true,
      has_b2b_access = false,
    } = body;

    // Validate required fields
    if (!full_name || !email || !password) {
      return NextResponse.json(
        { error: 'Не заполнены обязательные поля: имя, email, пароль' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Пароль должен быть не менее 6 символов' },
        { status: 400 }
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        team_id
      }
    });

    if (authError) {
      if (authError.message.includes('already been registered')) {
        return NextResponse.json(
          { error: 'Пользователь с таким email уже существует' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    // Create manager record - try with full columns first, then fallback
    let manager;
    let managerError;
    
    // Try full insert first
    const fullResult = await supabaseAdmin
      .from('managers')
      .insert({
        auth_user_id: authData.user.id,
        email,
        full_name,
        phone: phone || null,
        role: role || 'manager',
        team_id: team_id || null,
        can_switch_teams: role === 'admin',
        is_active,
        has_b2c_access,
        has_b2b_access,
        weekly_calls_target: 0,
        weekly_sales_target: 0
      })
      .select()
      .single();
    
    if (fullResult.error) {
      // Fallback: try minimal insert without b2c/b2b columns
      const minimalResult = await supabaseAdmin
        .from('managers')
        .insert({
          auth_user_id: authData.user.id,
          email,
          full_name,
          phone: phone || null,
          role: role || 'manager',
          team_id: team_id || null,
          can_switch_teams: role === 'admin',
          is_active,
          weekly_calls_target: 0,
          weekly_sales_target: 0
        })
        .select()
        .single();
      
      manager = minimalResult.data;
      managerError = minimalResult.error;
    } else {
      manager = fullResult.data;
      managerError = null;
    }

    if (managerError) {
      // Try to delete the auth user if manager creation failed
      try {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      } catch {}
      
      return NextResponse.json(
        { error: `Ошибка создания менеджера: ${managerError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      manager
    });

  } catch (error: any) {
    console.error('Error creating manager:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
