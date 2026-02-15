import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Admin client с полным доступом
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export async function POST(request: Request) {
  const { secret } = await request.json();
  
  // Простая защита
  if (secret !== 'festivalim-migrate-2024') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const results: { step: string; success: boolean; error?: string }[] = [];
  
  // Выполняем миграции через Supabase
  const migrations = [
    {
      name: 'Create pipelines table',
      fn: async () => {
        // Проверяем существует ли таблица
        const { data } = await supabaseAdmin.from('pipelines').select('id').limit(1);
        if (data !== null) return; // Таблица существует
        
        // Если нет, создаём через RPC или ждём ручного создания
        throw new Error('Table does not exist - create manually in SQL Editor');
      }
    }
  ];
  
  // Вместо SQL, используем Supabase API для вставки данных
  try {
    // Проверяем pipelines
    const { data: pipelines } = await supabaseAdmin.from('pipelines').select('*');
    
    if (!pipelines || pipelines.length === 0) {
      // Вставляем воронку
      const { error } = await supabaseAdmin.from('pipelines').insert({
        name: 'Продажи',
        code: 'sales',
        is_default: true,
        sort_order: 1
      });
      
      if (error) {
        results.push({ step: 'Insert pipeline', success: false, error: error.message });
      } else {
        results.push({ step: 'Insert pipeline', success: true });
      }
    } else {
      results.push({ step: 'Pipeline exists', success: true });
    }
    
    // Получаем ID воронки
    const { data: pipeline } = await supabaseAdmin
      .from('pipelines')
      .select('id')
      .eq('code', 'sales')
      .single();
    
    if (pipeline) {
      // Проверяем этапы
      const { data: stages } = await supabaseAdmin
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', pipeline.id);
      
      if (!stages || stages.length === 0) {
        // Вставляем этапы
        const stagesData = [
          { pipeline_id: pipeline.id, name: 'Новый', code: 'new', color: '#3B82F6', sort_order: 1 },
          { pipeline_id: pipeline.id, name: 'В работе', code: 'in_progress', color: '#F59E0B', sort_order: 2 },
          { pipeline_id: pipeline.id, name: 'Выбор билетов', code: 'choosing', color: '#8B5CF6', sort_order: 3 },
          { pipeline_id: pipeline.id, name: 'Оплата', code: 'payment', color: '#EC4899', sort_order: 4 },
          { pipeline_id: pipeline.id, name: 'Успешно', code: 'won', color: '#10B981', sort_order: 5, is_final: true, final_status: 'won' },
          { pipeline_id: pipeline.id, name: 'Отказ', code: 'lost', color: '#EF4444', sort_order: 6, is_final: true, final_status: 'lost' },
        ];
        
        const { error } = await supabaseAdmin.from('pipeline_stages').insert(stagesData);
        
        if (error) {
          results.push({ step: 'Insert stages', success: false, error: error.message });
        } else {
          results.push({ step: 'Insert stages', success: true });
        }
      } else {
        results.push({ step: 'Stages exist', success: true });
      }
    }
    
    // Проверяем все таблицы
    const tables = ['pipelines', 'pipeline_stages', 'deals', 'calls', 'messages', 'tasks', 'activities'];
    const existingTables: string[] = [];
    const missingTables: string[] = [];
    
    for (const table of tables) {
      try {
        const { error } = await supabaseAdmin.from(table).select('id').limit(1);
        if (error && error.code === '42P01') {
          missingTables.push(table);
        } else {
          existingTables.push(table);
        }
      } catch {
        missingTables.push(table);
      }
    }
    
    results.push({ 
      step: 'Check tables', 
      success: true, 
      error: `Existing: ${existingTables.join(', ')}. Missing: ${missingTables.join(', ') || 'none'}`
    });
    
  } catch (err: any) {
    results.push({ step: 'General error', success: false, error: err.message });
  }
  
  return NextResponse.json({ results });
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Migration API',
    usage: 'POST with { "secret": "festivalim-migrate-2024" }'
  });
}
