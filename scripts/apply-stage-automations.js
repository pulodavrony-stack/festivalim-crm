/**
 * Скрипт для настройки stage_automations и триггера в Supabase
 * 
 * Запуск: node scripts/apply-stage-automations.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Не найдены переменные NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('🚀 Настройка stage_automations...\n');

  // 1. Проверяем существование таблицы tasks
  console.log('1. Проверка таблицы tasks...');
  const { data: tasksCheck, error: tasksError } = await supabase
    .from('tasks')
    .select('id')
    .limit(1);

  if (tasksError && tasksError.message.includes('does not exist')) {
    console.log('   ⚠️ Таблица tasks не существует. Создаём...');
    
    // Создаём таблицу tasks
    const createTasksSQL = `
      CREATE TABLE IF NOT EXISTS tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
        deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
        manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        description TEXT,
        task_type TEXT DEFAULT 'call' CHECK (task_type IN ('call', 'message', 'meeting', 'other')),
        priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
        due_date TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        is_auto BOOLEAN DEFAULT false,
        auto_source TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_manager_id ON tasks(manager_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_deal_id ON tasks(deal_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    `;
    
    const { error: createError } = await supabase.rpc('exec_sql', { sql: createTasksSQL });
    if (createError) {
      console.log('   ℹ️ Не удалось создать через RPC, таблица может уже существовать');
    } else {
      console.log('   ✓ Таблица tasks создана');
    }
  } else {
    console.log('   ✓ Таблица tasks существует');
  }

  // 2. Находим этапы для автоматизаций
  console.log('\n2. Поиск этапов для автоматизаций...');
  
  const { data: allStages, error: stagesError } = await supabase
    .from('pipeline_stages')
    .select('id, name, code, pipeline_id, pipelines(name)')
    .order('pipeline_id')
    .order('sort_order');

  if (stagesError) {
    console.error('   ❌ Ошибка:', stagesError.message);
    return;
  }

  console.log(`   Найдено ${allStages.length} этапов`);

  // 3. Определяем автоматизации
  const automations = [];

  for (const stage of allStages) {
    const stageName = stage.name.toLowerCase();
    const stageCode = stage.code?.toLowerCase() || '';

    // Недозвон - перезвонить через 2 часа
    if (stageName.includes('недозвон') || stageCode.includes('no_answer')) {
      automations.push({
        stage_id: stage.id,
        action_type: 'create_task',
        action_config: {
          task_type: 'call',
          title: 'Перезвонить клиенту',
          delay_hours: 2,
          priority: 'high'
        }
      });
    }

    // Автоответчик - перезвонить через 4 часа
    if (stageName.includes('автоответчик') || stageCode.includes('voicemail')) {
      automations.push({
        stage_id: stage.id,
        action_type: 'create_task',
        action_config: {
          task_type: 'call',
          title: 'Перезвонить (автоответчик)',
          delay_hours: 4,
          priority: 'normal'
        }
      });
    }

    // Отправил в мессенджер - проверить через 24 часа
    if (stageName.includes('мессенджер') && (stageName.includes('отправил') || stageCode.includes('sent'))) {
      automations.push({
        stage_id: stage.id,
        action_type: 'create_task',
        action_config: {
          task_type: 'message',
          title: 'Проверить ответ в мессенджере',
          delay_hours: 24,
          priority: 'normal'
        }
      });
    }

    // Предоплата - напомнить об оплате через 48 часов
    if (stageName.includes('предоплата') || stageCode.includes('prepayment')) {
      automations.push({
        stage_id: stage.id,
        action_type: 'create_task',
        action_config: {
          task_type: 'call',
          title: 'Напомнить об оплате',
          delay_hours: 48,
          priority: 'high'
        }
      });
    }
  }

  console.log(`   Подготовлено ${automations.length} автоматизаций`);

  // 4. Проверяем/создаём таблицу stage_automations
  console.log('\n3. Проверка таблицы stage_automations...');
  
  const { data: automationsCheck, error: automationsError } = await supabase
    .from('stage_automations')
    .select('id')
    .limit(1);

  if (automationsError && automationsError.message.includes('does not exist')) {
    console.log('   ⚠️ Таблица stage_automations не существует');
    console.log('   ℹ️ Создайте её через Supabase SQL Editor, выполнив миграцию:');
    console.log('   database/migrations/003_three_pipelines.sql (секции 2 и 7)');
    return;
  } else {
    console.log('   ✓ Таблица stage_automations существует');
  }

  // 5. Добавляем автоматизации
  console.log('\n4. Добавление автоматизаций...');
  
  for (const auto of automations) {
    // Проверяем, нет ли уже такой автоматизации
    const { data: existing } = await supabase
      .from('stage_automations')
      .select('id')
      .eq('stage_id', auto.stage_id)
      .eq('action_type', auto.action_type)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`   ⏭️ Уже существует для stage_id=${auto.stage_id.substring(0, 8)}...`);
      continue;
    }

    const { error: insertError } = await supabase
      .from('stage_automations')
      .insert(auto);

    if (insertError) {
      console.error(`   ❌ Ошибка для ${auto.action_config.title}:`, insertError.message);
    } else {
      console.log(`   ✓ ${auto.action_config.title} (delay: ${auto.action_config.delay_hours}h)`);
    }
  }

  // 6. Итог
  console.log('\n✅ Настройка завершена!');
  console.log('\n📋 Для активации триггера выполните в Supabase SQL Editor:');
  console.log(`
-- Триггер для автоматического создания задач при смене этапа
CREATE OR REPLACE FUNCTION handle_stage_change_automations()
RETURNS TRIGGER AS $$
DECLARE
    automation RECORD;
    task_config JSONB;
    due_date TIMESTAMPTZ;
BEGIN
    IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
        FOR automation IN 
            SELECT * FROM stage_automations 
            WHERE stage_id = NEW.stage_id AND is_active = true
        LOOP
            IF automation.action_type = 'create_task' THEN
                task_config := automation.action_config;
                due_date := NOW() + ((task_config->>'delay_hours')::int || ' hours')::interval;
                
                INSERT INTO tasks (
                    client_id, deal_id, manager_id, title, task_type, priority, due_date, is_auto, auto_source
                ) VALUES (
                    NEW.client_id, NEW.id, NEW.manager_id,
                    COALESCE(task_config->>'title', 'Автозадача'),
                    COALESCE(task_config->>'task_type', 'call'),
                    COALESCE(task_config->>'priority', 'normal'),
                    due_date, true, 'stage_automation'
                );
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_deal_stage_automations ON deals;
CREATE TRIGGER trigger_deal_stage_automations
    AFTER UPDATE ON deals FOR EACH ROW
    EXECUTE FUNCTION handle_stage_change_automations();
`);
}

run().catch(console.error);
