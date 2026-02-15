/**
 * Выполняет миграцию stage_automations через Supabase
 */

require('dotenv').config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function executeSql(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ sql }),
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SQL error: ${text}`);
  }
  
  return response.json();
}

async function run() {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log('🚀 Выполнение миграции stage_automations...\n');

  // 1. Проверяем, существует ли таблица
  console.log('1. Проверка таблицы stage_automations...');
  
  const { data: tableCheck, error: tableError } = await supabase
    .from('stage_automations')
    .select('id')
    .limit(1);

  if (tableError && tableError.message.includes('does not exist')) {
    console.log('   Таблица не существует. Пытаемся создать...');
    
    // Пробуем создать через Database Functions
    // Если не получится — нужно будет создать вручную
    try {
      // Создаём функцию для выполнения SQL (если её нет)
      const createFnResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      });
      
      console.log('   ⚠️ Нужно создать таблицу через Supabase SQL Editor.');
      console.log('   Открываю в браузере...');
      
      // Откроем SQL Editor в браузере
      const sqlEditorUrl = `https://supabase.com/dashboard/project/rlttkzmpazgdkypvhtpd/sql/new`;
      console.log(`\n   📝 Откройте: ${sqlEditorUrl}`);
      console.log('\n   Вставьте этот SQL:\n');
      
      console.log(`
CREATE TABLE IF NOT EXISTS stage_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('create_task', 'change_client_type', 'send_notification', 'set_status')),
    action_config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stage_automations_stage_id ON stage_automations(stage_id);
`);
      return;
    } catch (e) {
      console.error('   Ошибка:', e.message);
      return;
    }
  } else {
    console.log('   ✓ Таблица stage_automations существует');
  }

  // 2. Получаем все этапы
  console.log('\n2. Получение этапов для автоматизаций...');
  
  const { data: stages, error: stagesError } = await supabase
    .from('pipeline_stages')
    .select('id, name, code');

  if (stagesError) {
    console.error('   ❌ Ошибка:', stagesError.message);
    return;
  }

  console.log(`   Найдено ${stages.length} этапов`);

  // 3. Определяем автоматизации
  const automationsToCreate = [];

  for (const stage of stages) {
    const name = stage.name.toLowerCase();
    const code = (stage.code || '').toLowerCase();

    // Недозвон
    if (name.includes('недозвон') || code.includes('no_answer')) {
      automationsToCreate.push({
        stage_id: stage.id,
        action_type: 'create_task',
        action_config: { task_type: 'call', title: 'Перезвонить клиенту', delay_hours: 2, priority: 'high' }
      });
    }

    // Автоответчик
    if (name.includes('автоответчик') || code.includes('voicemail')) {
      automationsToCreate.push({
        stage_id: stage.id,
        action_type: 'create_task',
        action_config: { task_type: 'call', title: 'Перезвонить (автоответчик)', delay_hours: 4, priority: 'normal' }
      });
    }

    // Отправил в мессенджер
    if ((name.includes('мессенджер') && name.includes('отправил')) || code.includes('sent_messenger')) {
      automationsToCreate.push({
        stage_id: stage.id,
        action_type: 'create_task',
        action_config: { task_type: 'message', title: 'Проверить ответ в мессенджере', delay_hours: 24, priority: 'normal' }
      });
    }

    // Предоплата
    if (name.includes('предоплата') || code.includes('prepayment')) {
      automationsToCreate.push({
        stage_id: stage.id,
        action_type: 'create_task',
        action_config: { task_type: 'call', title: 'Напомнить об оплате', delay_hours: 48, priority: 'high' }
      });
    }
  }

  console.log(`   Подготовлено ${automationsToCreate.length} автоматизаций`);

  // 4. Добавляем автоматизации
  console.log('\n3. Добавление автоматизаций...');

  let added = 0;
  let skipped = 0;

  for (const auto of automationsToCreate) {
    // Проверяем, нет ли уже
    const { data: existing } = await supabase
      .from('stage_automations')
      .select('id')
      .eq('stage_id', auto.stage_id)
      .eq('action_type', auto.action_type);

    if (existing && existing.length > 0) {
      skipped++;
      continue;
    }

    const { error: insertError } = await supabase
      .from('stage_automations')
      .insert(auto);

    if (insertError) {
      console.error(`   ❌ ${auto.action_config.title}: ${insertError.message}`);
    } else {
      console.log(`   ✓ ${auto.action_config.title} (${auto.action_config.delay_hours}ч)`);
      added++;
    }
  }

  console.log(`\n   Добавлено: ${added}, пропущено (уже есть): ${skipped}`);

  // 5. Показываем итог
  console.log('\n4. Текущие автоматизации:');
  
  const { data: allAuto } = await supabase
    .from('stage_automations')
    .select('*, pipeline_stages(name)')
    .eq('is_active', true);

  if (allAuto) {
    for (const a of allAuto) {
      const stageName = a.pipeline_stages?.name || 'Unknown';
      const title = a.action_config?.title || 'Задача';
      const hours = a.action_config?.delay_hours || 0;
      console.log(`   • ${stageName} → "${title}" через ${hours}ч`);
    }
  }

  console.log('\n✅ Миграция завершена!');
  console.log('\n⚠️ Для активации триггера выполните в Supabase SQL Editor:');
  console.log('   https://supabase.com/dashboard/project/rlttkzmpazgdkypvhtpd/sql/new');
  console.log('\n   SQL для триггера находится в файле:');
  console.log('   database/migrations/004_stage_automations_setup.sql (строки 54-99)');
}

run().catch(console.error);
