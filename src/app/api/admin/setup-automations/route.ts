import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * API для настройки автоматизаций этапов
 * GET /api/admin/setup-automations
 */
export async function GET() {
  const results: string[] = [];

  try {
    results.push('🚀 Начинаю настройку автоматизаций...');

    // 1. Получаем все этапы
    const { data: stages, error: stagesError } = await supabase
      .from('pipeline_stages')
      .select('id, name, code, pipeline_id');

    if (stagesError) {
      return NextResponse.json({ error: stagesError.message, results }, { status: 500 });
    }

    results.push(`📋 Найдено ${stages.length} этапов`);

    // 2. Определяем автоматизации
    const automations: Array<{
      stage_id: string;
      stage_name: string;
      action_type: string;
      action_config: object;
    }> = [];

    for (const stage of stages) {
      const name = stage.name.toLowerCase();
      const code = (stage.code || '').toLowerCase();

      // Недозвон
      if (name.includes('недозвон') || code.includes('no_answer')) {
        automations.push({
          stage_id: stage.id,
          stage_name: stage.name,
          action_type: 'create_task',
          action_config: { task_type: 'call', title: 'Перезвонить клиенту', delay_hours: 2, priority: 'high' }
        });
      }

      // Автоответчик
      if (name.includes('автоответчик') || code.includes('voicemail')) {
        automations.push({
          stage_id: stage.id,
          stage_name: stage.name,
          action_type: 'create_task',
          action_config: { task_type: 'call', title: 'Перезвонить (автоответчик)', delay_hours: 4, priority: 'normal' }
        });
      }

      // Отправил в мессенджер
      if ((name.includes('мессенджер') && name.includes('отправил')) || code.includes('sent_messenger')) {
        automations.push({
          stage_id: stage.id,
          stage_name: stage.name,
          action_type: 'create_task',
          action_config: { task_type: 'message', title: 'Проверить ответ в мессенджере', delay_hours: 24, priority: 'normal' }
        });
      }

      // Предоплата
      if (name.includes('предоплата') || code.includes('prepayment')) {
        automations.push({
          stage_id: stage.id,
          stage_name: stage.name,
          action_type: 'create_task',
          action_config: { task_type: 'call', title: 'Напомнить об оплате', delay_hours: 48, priority: 'high' }
        });
      }
    }

    results.push(`🔧 Подготовлено ${automations.length} автоматизаций`);

    // 3. Проверяем существование таблицы stage_automations
    const { error: tableError } = await supabase
      .from('stage_automations')
      .select('id')
      .limit(1);

    if (tableError) {
      results.push(`⚠️ Таблица stage_automations недоступна: ${tableError.message}`);
      results.push('');
      results.push('📝 Выполните этот SQL в Supabase SQL Editor:');
      results.push('https://supabase.com/dashboard/project/rlttkzmpazgdkypvhtpd/sql/new');
      results.push('');
      results.push(`
CREATE TABLE IF NOT EXISTS stage_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    action_config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stage_automations_stage_id ON stage_automations(stage_id);
`);

      return NextResponse.json({
        success: false,
        error: 'Таблица stage_automations не создана',
        results,
        sql_required: true,
        automations_prepared: automations.map(a => ({
          stage: a.stage_name,
          task: (a.action_config as any).title,
          delay: `${(a.action_config as any).delay_hours} часов`
        }))
      });
    }

    // 4. Добавляем автоматизации
    let added = 0;
    let skipped = 0;

    for (const auto of automations) {
      // Проверяем, нет ли уже
      const { data: existing } = await supabase
        .from('stage_automations')
        .select('id')
        .eq('stage_id', auto.stage_id)
        .eq('action_type', auto.action_type);

      if (existing && existing.length > 0) {
        results.push(`⏭️ Пропущено: ${auto.stage_name} (уже есть)`);
        skipped++;
        continue;
      }

      const { error: insertError } = await supabase
        .from('stage_automations')
        .insert({
          stage_id: auto.stage_id,
          action_type: auto.action_type,
          action_config: auto.action_config
        });

      if (insertError) {
        results.push(`❌ Ошибка для ${auto.stage_name}: ${insertError.message}`);
      } else {
        const config = auto.action_config as any;
        results.push(`✅ ${auto.stage_name} → "${config.title}" через ${config.delay_hours}ч`);
        added++;
      }
    }

    results.push('');
    results.push(`📊 Итого: добавлено ${added}, пропущено ${skipped}`);

    // 5. Показываем все автоматизации
    const { data: allAuto } = await supabase
      .from('stage_automations')
      .select('id, stage_id, action_type, action_config, is_active, pipeline_stages(name)')
      .eq('is_active', true);

    return NextResponse.json({
      success: true,
      results,
      stats: { added, skipped, total: automations.length },
      current_automations: allAuto?.map(a => ({
        stage: (a as any).pipeline_stages?.name || 'Unknown',
        task: (a.action_config as any)?.title,
        delay_hours: (a.action_config as any)?.delay_hours,
        is_active: a.is_active
      }))
    });

  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message, 
      results 
    }, { status: 500 });
  }
}
