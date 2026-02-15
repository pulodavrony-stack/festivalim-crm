-- =============================================
-- Миграция: Три воронки продаж
-- Дата: 2026-02-13
-- =============================================

-- 1. Удаляем существующие воронки и этапы (если нужно начать с чистого листа)
-- ВНИМАНИЕ: Раскомментируйте если хотите удалить старые данные
-- DELETE FROM pipeline_stages;
-- DELETE FROM pipelines;

-- 2. Создаём таблицу автоматизаций этапов (если не существует)
CREATE TABLE IF NOT EXISTS stage_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('create_task', 'change_client_type', 'send_notification', 'set_status')),
    action_config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индекс для быстрого поиска автоматизаций по этапу
CREATE INDEX IF NOT EXISTS idx_stage_automations_stage_id ON stage_automations(stage_id);

-- 3. Воронка "Новые клиенты" (Лиды)
INSERT INTO pipelines (id, name, code, client_type, is_default, sort_order)
VALUES ('11111111-1111-1111-1111-111111111111', 'Новые клиенты', 'new_clients', 'lead', true, 1)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, client_type = EXCLUDED.client_type;

-- Этапы для "Новые клиенты"
INSERT INTO pipeline_stages (id, pipeline_id, name, code, color, sort_order, is_final, is_success) VALUES
('a1000001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'Новые лиды', 'new_leads', '#6366f1', 1, false, false),
('a1000001-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', 'Приняты в работу', 'accepted', '#8b5cf6', 2, false, false),
('a1000001-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', 'Не вышел на связь', 'no_contact', '#f59e0b', 3, false, false),
('a1000001-0001-0001-0001-000000000004', '11111111-1111-1111-1111-111111111111', 'Недозвон', 'no_answer', '#ef4444', 4, false, false),
('a1000001-0001-0001-0001-000000000005', '11111111-1111-1111-1111-111111111111', 'Автоответчик', 'voicemail', '#f97316', 5, false, false),
('a1000001-0001-0001-0001-000000000006', '11111111-1111-1111-1111-111111111111', 'В мессенджере без спича', 'messenger_no_speech', '#06b6d4', 6, false, false),
('a1000001-0001-0001-0001-000000000007', '11111111-1111-1111-1111-111111111111', 'Отправил в мессенджер', 'sent_messenger', '#0ea5e9', 7, false, false),
('a1000001-0001-0001-0001-000000000008', '11111111-1111-1111-1111-111111111111', 'Контакт не состоялся', 'contact_failed', '#64748b', 8, true, false),
('a1000001-0001-0001-0001-000000000009', '11111111-1111-1111-1111-111111111111', 'Предоплата', 'prepayment', '#22c55e', 9, false, false),
('a1000001-0001-0001-0001-000000000010', '11111111-1111-1111-1111-111111111111', 'Сделка', 'deal_won', '#10b981', 10, true, true),
('a1000001-0001-0001-0001-000000000011', '11111111-1111-1111-1111-111111111111', 'Долгий ящик', 'long_term', '#94a3b8', 11, true, false)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, color = EXCLUDED.color, sort_order = EXCLUDED.sort_order;

-- 4. Воронка "КБ" (Клиентская база)
INSERT INTO pipelines (id, name, code, client_type, is_default, sort_order)
VALUES ('22222222-2222-2222-2222-222222222222', 'Клиентская база', 'kb', 'kb', false, 2)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, client_type = EXCLUDED.client_type;

-- Этапы для "КБ"
INSERT INTO pipeline_stages (id, pipeline_id, name, code, color, sort_order, is_final, is_success) VALUES
('b2000002-0002-0002-0002-000000000001', '22222222-2222-2222-2222-222222222222', 'База постоянных клиентов', 'kb_base', '#6366f1', 1, false, false),
('b2000002-0002-0002-0002-000000000002', '22222222-2222-2222-2222-222222222222', 'После автооплат', 'after_autopay', '#8b5cf6', 2, false, false),
('b2000002-0002-0002-0002-000000000003', '22222222-2222-2222-2222-222222222222', 'Уже был контакт', 'had_contact', '#a855f7', 3, false, false),
('b2000002-0002-0002-0002-000000000004', '22222222-2222-2222-2222-222222222222', 'Принята в работу', 'accepted', '#8b5cf6', 4, false, false),
('b2000002-0002-0002-0002-000000000005', '22222222-2222-2222-2222-222222222222', 'Контакт не состоялся', 'contact_failed', '#64748b', 5, true, false),
('b2000002-0002-0002-0002-000000000006', '22222222-2222-2222-2222-222222222222', 'Недозвон', 'no_answer', '#ef4444', 6, false, false),
('b2000002-0002-0002-0002-000000000007', '22222222-2222-2222-2222-222222222222', 'В мессенджере без спича', 'messenger_no_speech', '#06b6d4', 7, false, false),
('b2000002-0002-0002-0002-000000000008', '22222222-2222-2222-2222-222222222222', 'Отправил в мессенджер', 'sent_messenger', '#0ea5e9', 8, false, false),
('b2000002-0002-0002-0002-000000000009', '22222222-2222-2222-2222-222222222222', 'Предоплата', 'prepayment', '#22c55e', 9, false, false),
('b2000002-0002-0002-0002-000000000010', '22222222-2222-2222-2222-222222222222', 'Сделка', 'deal_won', '#10b981', 10, true, true),
('b2000002-0002-0002-0002-000000000011', '22222222-2222-2222-2222-222222222222', 'Долгий ящик', 'long_term', '#94a3b8', 11, true, false)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, color = EXCLUDED.color, sort_order = EXCLUDED.sort_order;

-- 5. Воронка "ПК" (Потенциальные клиенты)
INSERT INTO pipelines (id, name, code, client_type, is_default, sort_order)
VALUES ('33333333-3333-3333-3333-333333333333', 'Потенциальные клиенты', 'pk', 'pk', false, 3)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, client_type = EXCLUDED.client_type;

-- Этапы для "ПК"
INSERT INTO pipeline_stages (id, pipeline_id, name, code, color, sort_order, is_final, is_success) VALUES
('c3000003-0003-0003-0003-000000000001', '33333333-3333-3333-3333-333333333333', 'База ПК', 'pk_base', '#6366f1', 1, false, false),
('c3000003-0003-0003-0003-000000000002', '33333333-3333-3333-3333-333333333333', 'Принята в работу', 'accepted', '#8b5cf6', 2, false, false),
('c3000003-0003-0003-0003-000000000003', '33333333-3333-3333-3333-333333333333', 'Недозвон', 'no_answer', '#ef4444', 3, false, false),
('c3000003-0003-0003-0003-000000000004', '33333333-3333-3333-3333-333333333333', 'Отправил в мессенджер после разговора', 'sent_messenger_after', '#0ea5e9', 4, false, false),
('c3000003-0003-0003-0003-000000000005', '33333333-3333-3333-3333-333333333333', 'Контакт не состоялся', 'contact_failed', '#64748b', 5, true, false),
('c3000003-0003-0003-0003-000000000006', '33333333-3333-3333-3333-333333333333', 'Предоплата', 'prepayment', '#22c55e', 6, false, false),
('c3000003-0003-0003-0003-000000000007', '33333333-3333-3333-3333-333333333333', 'Сделка', 'deal_won', '#10b981', 7, true, true),
('c3000003-0003-0003-0003-000000000008', '33333333-3333-3333-3333-333333333333', 'Следующий раз', 'next_time', '#94a3b8', 8, true, false)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, color = EXCLUDED.color, sort_order = EXCLUDED.sort_order;

-- 6. Автоматизации: задачи при переходе в этапы

-- Недозвон → Создать задачу "Перезвонить через 2 часа"
INSERT INTO stage_automations (stage_id, action_type, action_config) VALUES
-- Новые клиенты: Недозвон
('a1000001-0001-0001-0001-000000000004', 'create_task', '{"task_type": "call", "title": "Перезвонить клиенту", "delay_hours": 2, "priority": "high"}'),
-- Новые клиенты: Автоответчик
('a1000001-0001-0001-0001-000000000005', 'create_task', '{"task_type": "call", "title": "Перезвонить (автоответчик)", "delay_hours": 4, "priority": "normal"}'),
-- Новые клиенты: Отправил в мессенджер
('a1000001-0001-0001-0001-000000000007', 'create_task', '{"task_type": "message", "title": "Проверить ответ в мессенджере", "delay_hours": 24, "priority": "normal"}'),
-- КБ: Недозвон
('b2000002-0002-0002-0002-000000000006', 'create_task', '{"task_type": "call", "title": "Перезвонить клиенту КБ", "delay_hours": 2, "priority": "high"}'),
-- КБ: Отправил в мессенджер
('b2000002-0002-0002-0002-000000000008', 'create_task', '{"task_type": "message", "title": "Проверить ответ в мессенджере", "delay_hours": 24, "priority": "normal"}'),
-- ПК: Недозвон
('c3000003-0003-0003-0003-000000000003', 'create_task', '{"task_type": "call", "title": "Перезвонить клиенту ПК", "delay_hours": 3, "priority": "normal"}'),
-- ПК: Отправил в мессенджер
('c3000003-0003-0003-0003-000000000004', 'create_task', '{"task_type": "message", "title": "Проверить ответ в мессенджере", "delay_hours": 24, "priority": "normal"}')
ON CONFLICT DO NOTHING;

-- 7. Триггер для автоматического создания задач при смене этапа
CREATE OR REPLACE FUNCTION handle_stage_change_automations()
RETURNS TRIGGER AS $$
DECLARE
    automation RECORD;
    task_config JSONB;
    new_task_id UUID;
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

-- Удаляем старый триггер если есть
DROP TRIGGER IF EXISTS trigger_deal_stage_automations ON deals;

-- Создаём триггер
CREATE TRIGGER trigger_deal_stage_automations
    AFTER UPDATE ON deals
    FOR EACH ROW
    EXECUTE FUNCTION handle_stage_change_automations();

-- 8. Комментарии для документации
COMMENT ON TABLE stage_automations IS 'Автоматизации при переходе сделки в определённый этап';
COMMENT ON COLUMN stage_automations.action_type IS 'Тип действия: create_task, change_client_type, send_notification, set_status';
COMMENT ON COLUMN stage_automations.action_config IS 'Конфигурация действия в JSON формате';
