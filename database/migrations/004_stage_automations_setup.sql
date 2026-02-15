-- =============================================
-- Миграция: Настройка stage_automations и триггера
-- Дата: 2026-02-10
-- 
-- ИНСТРУКЦИЯ: Выполните этот SQL в Supabase SQL Editor
-- =============================================

-- 1. Создаём таблицу автоматизаций этапов
CREATE TABLE IF NOT EXISTS stage_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('create_task', 'change_client_type', 'send_notification', 'set_status')),
    action_config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_stage_automations_stage_id ON stage_automations(stage_id);

-- 2. Добавляем автоматизации для этапов

-- Находим этапы "Недозвон" и добавляем автоматизацию
INSERT INTO stage_automations (stage_id, action_type, action_config)
SELECT id, 'create_task', '{"task_type": "call", "title": "Перезвонить клиенту", "delay_hours": 2, "priority": "high"}'::jsonb
FROM pipeline_stages
WHERE LOWER(name) LIKE '%недозвон%' OR LOWER(code) LIKE '%no_answer%'
ON CONFLICT DO NOTHING;

-- Находим этапы "Автоответчик"
INSERT INTO stage_automations (stage_id, action_type, action_config)
SELECT id, 'create_task', '{"task_type": "call", "title": "Перезвонить (автоответчик)", "delay_hours": 4, "priority": "normal"}'::jsonb
FROM pipeline_stages
WHERE LOWER(name) LIKE '%автоответчик%' OR LOWER(code) LIKE '%voicemail%'
ON CONFLICT DO NOTHING;

-- Находим этапы "Отправил в мессенджер"
INSERT INTO stage_automations (stage_id, action_type, action_config)
SELECT id, 'create_task', '{"task_type": "message", "title": "Проверить ответ в мессенджере", "delay_hours": 24, "priority": "normal"}'::jsonb
FROM pipeline_stages
WHERE (LOWER(name) LIKE '%мессенджер%' AND LOWER(name) LIKE '%отправил%') 
   OR LOWER(code) LIKE '%sent_messenger%'
ON CONFLICT DO NOTHING;

-- Находим этапы "Предоплата"
INSERT INTO stage_automations (stage_id, action_type, action_config)
SELECT id, 'create_task', '{"task_type": "call", "title": "Напомнить об оплате", "delay_hours": 48, "priority": "high"}'::jsonb
FROM pipeline_stages
WHERE LOWER(name) LIKE '%предоплата%' OR LOWER(code) LIKE '%prepayment%'
ON CONFLICT DO NOTHING;

-- 3. Создаём триггер для автоматического создания задач

CREATE OR REPLACE FUNCTION handle_stage_change_automations()
RETURNS TRIGGER AS $$
DECLARE
    automation RECORD;
    task_config JSONB;
    due_date TIMESTAMPTZ;
BEGIN
    -- Только если этап изменился
    IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
        -- Находим автоматизации для нового этапа
        FOR automation IN 
            SELECT * FROM stage_automations 
            WHERE stage_id = NEW.stage_id AND is_active = true
        LOOP
            IF automation.action_type = 'create_task' THEN
                task_config := automation.action_config;
                due_date := NOW() + ((task_config->>'delay_hours')::int || ' hours')::interval;
                
                INSERT INTO tasks (
                    client_id,
                    deal_id,
                    manager_id,
                    title,
                    task_type,
                    priority,
                    due_date,
                    is_auto,
                    auto_source
                ) VALUES (
                    NEW.client_id,
                    NEW.id,
                    NEW.manager_id,
                    COALESCE(task_config->>'title', 'Автозадача'),
                    COALESCE(task_config->>'task_type', 'call'),
                    COALESCE(task_config->>'priority', 'normal'),
                    due_date,
                    true,
                    'stage_automation'
                );
            END IF;
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Удаляем старый триггер если есть и создаём новый
DROP TRIGGER IF EXISTS trigger_deal_stage_automations ON deals;

CREATE TRIGGER trigger_deal_stage_automations
    AFTER UPDATE ON deals
    FOR EACH ROW
    EXECUTE FUNCTION handle_stage_change_automations();

-- 4. Проверка результатов
SELECT 
    ps.name as stage_name,
    sa.action_type,
    sa.action_config->>'title' as task_title,
    sa.action_config->>'delay_hours' as delay_hours
FROM stage_automations sa
JOIN pipeline_stages ps ON ps.id = sa.stage_id
ORDER BY ps.name;
