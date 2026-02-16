// =============================================
// API: Create Team Admins
// POST /api/admin/create-team-admins
// =============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Admin client for creating auth users
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface TeamAdmin {
  full_name: string;
  email: string;
  password: string;
  team_slug: string;
}

const TEAM_ADMINS: TeamAdmin[] = [
  {
    full_name: 'Дарья Георги',
    email: 'daria@kstati-teatr.ru',
    password: 'Kstati2026!',
    team_slug: 'kstati'
  },
  {
    full_name: 'Георгий Гуторов',
    email: 'georgiy@etazhi-tf.ru',
    password: 'Etazhi2026!',
    team_slug: 'etazhi'
  },
  {
    full_name: 'Игорь Туголуков',
    email: 'igor@atlant-tf.ru',
    password: 'Atlant2026!',
    team_slug: 'atlant'
  }
];

export async function POST(request: NextRequest) {
  try {
    const results: Array<{ email: string; status: string; error?: string }> = [];

    // Get all teams
    const { data: teams, error: teamsError } = await supabaseAdmin
      .from('teams')
      .select('id, slug, name');

    if (teamsError) {
      return NextResponse.json({ error: 'Failed to get teams', details: teamsError.message }, { status: 500 });
    }

    for (const admin of TEAM_ADMINS) {
      try {
        // Find team by slug
        const team = teams?.find(t => t.slug === admin.team_slug);
        if (!team) {
          results.push({ email: admin.email, status: 'error', error: `Team ${admin.team_slug} not found` });
          continue;
        }

        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: admin.email,
          password: admin.password,
          email_confirm: true,
          user_metadata: {
            full_name: admin.full_name,
            team_id: team.id
          }
        });

        if (authError) {
          // Check if user already exists
          if (authError.message.includes('already been registered')) {
            // Try to get existing user
            const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = existingUsers?.users?.find(u => u.email === admin.email);
            
            if (existingUser) {
              // Update existing manager or create new one
              const { data: existingManager } = await supabaseAdmin
                .from('managers')
                .select('id')
                .eq('email', admin.email)
                .single();

              if (existingManager) {
                // Update existing manager
                const { error: updateErr } = await supabaseAdmin
                  .from('managers')
                  .update({
                    role: 'team_admin',
                    team_id: team.id,
                    can_switch_teams: false,
                    is_active: true,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', existingManager.id);

                if (updateErr) {
                  results.push({ email: admin.email, status: 'error', error: `Update failed: ${updateErr.message}` });
                } else {
                  results.push({ email: admin.email, status: 'updated' });
                }
              } else {
                // Create manager record - try with minimal columns first
                const { error: insertErr } = await supabaseAdmin
                  .from('managers')
                  .insert({
                    auth_user_id: existingUser.id,
                    email: admin.email,
                    full_name: admin.full_name,
                    role: 'team_admin',
                    team_id: team.id,
                    can_switch_teams: false,
                    is_active: true,
                    weekly_calls_target: 0,
                    weekly_sales_target: 0
                  });

                if (insertErr) {
                  results.push({ email: admin.email, status: 'error', error: `Insert failed: ${insertErr.message}` });
                } else {
                  results.push({ email: admin.email, status: 'created (manager record)' });
                }
              }
              continue;
            }
          }
          results.push({ email: admin.email, status: 'error', error: authError.message });
          continue;
        }

        // Create manager record - use minimal columns to avoid schema cache issues
        const { error: managerError } = await supabaseAdmin
          .from('managers')
          .insert({
            auth_user_id: authData.user.id,
            email: admin.email,
            full_name: admin.full_name,
            role: 'team_admin',
            team_id: team.id,
            can_switch_teams: false,
            is_active: true,
            weekly_calls_target: 0,
            weekly_sales_target: 0
          });

        if (managerError) {
          results.push({ email: admin.email, status: 'error', error: `Auth created but manager failed: ${managerError.message}` });
          continue;
        }

        results.push({ email: admin.email, status: 'created' });

      } catch (err: any) {
        results.push({ email: admin.email, status: 'error', error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      admins: TEAM_ADMINS.map(a => ({
        name: a.full_name,
        email: a.email,
        password: a.password,
        team: a.team_slug
      }))
    });

  } catch (error: any) {
    console.error('Error creating team admins:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
