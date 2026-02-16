import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function createSchemaClient(schema: string) {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema }
  });
}

export async function POST(request: NextRequest) {
  try {
    const kstati = createSchemaClient('kstati');
    
    // Get all clients
    const { data: allClients } = await kstati
      .from('clients')
      .select('id, full_name, notes, created_at')
      .order('created_at', { ascending: true });
    
    if (!allClients) {
      return NextResponse.json({ error: 'No clients found' }, { status: 404 });
    }

    // Tula schools are the ones with "Тула" in notes
    const tulaClients = allClients.filter(c => c.notes && c.notes.includes('Тула'));
    const testClients = allClients.filter(c => !c.notes || !c.notes.includes('Тула'));
    
    // Delete test clients' deals first
    const testIds = testClients.map(c => c.id);
    
    let dealsDeleted = 0;
    let clientsDeleted = 0;
    let stagesDeduplicated = 0;

    if (testIds.length > 0) {
      // Delete deals
      const { data: deletedDeals } = await kstati
        .from('deals')
        .delete()
        .in('client_id', testIds)
        .select('id');
      dealsDeleted = deletedDeals?.length || 0;

      // Delete activities
      await kstati
        .from('activities')
        .delete()
        .in('client_id', testIds);

      // Delete clients
      const { data: deletedClients } = await kstati
        .from('clients')
        .delete()
        .in('id', testIds)
        .select('id');
      clientsDeleted = deletedClients?.length || 0;
    }

    // Deduplicate pipeline_stages (keep first, remove duplicates by pipeline_id + code)
    const { data: allStages } = await kstati
      .from('pipeline_stages')
      .select('id, pipeline_id, code, name, sort_order')
      .order('id');
    
    if (allStages) {
      const seen = new Set<string>();
      const duplicateIds: string[] = [];
      
      for (const stage of allStages) {
        const key = `${stage.pipeline_id}_${stage.code}`;
        if (seen.has(key)) {
          duplicateIds.push(stage.id);
        } else {
          seen.add(key);
        }
      }

      if (duplicateIds.length > 0) {
        await kstati.from('pipeline_stages').delete().in('id', duplicateIds);
        stagesDeduplicated = duplicateIds.length;
      }
    }

    // Also clean public schema test data
    const publicClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    const { data: publicClients } = await publicClient
      .from('clients')
      .select('id, full_name, notes')
      .order('created_at', { ascending: true });
    
    let publicTestDeleted = 0;
    if (publicClients) {
      const publicTestClients = publicClients.filter(c => c.notes && c.notes.includes('Тула'));
      const publicTestIds = publicTestClients.map(c => c.id);
      
      if (publicTestIds.length > 0) {
        await publicClient.from('deals').delete().in('client_id', publicTestIds);
        await publicClient.from('activities').delete().in('client_id', publicTestIds);
        const { data: deleted } = await publicClient.from('clients').delete().in('id', publicTestIds).select('id');
        publicTestDeleted = deleted?.length || 0;
      }
    }

    return NextResponse.json({
      success: true,
      kstati: {
        total_clients: allClients.length,
        tula_kept: tulaClients.length,
        test_deleted: clientsDeleted,
        deals_deleted: dealsDeleted,
        stages_deduplicated: stagesDeduplicated,
      },
      public_tula_duplicates_deleted: publicTestDeleted,
      remaining_clients: tulaClients.map(c => ({ id: c.id, name: c.full_name })),
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
