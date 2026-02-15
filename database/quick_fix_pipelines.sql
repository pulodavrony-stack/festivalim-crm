-- =============================================
-- Исправленный скрипт для добавления воронок
-- Адаптирован под текущую структуру БД
-- =============================================

-- Шаг 1: Добавляем колонку client_type если её нет
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pipelines' AND column_name = 'client_type'
    ) THEN
        ALTER TABLE pipelines ADD COLUMN client_type TEXT;
    END IF;
END $$;

-- Шаг 2: Добавляем колонку is_default если её нет
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pipelines' AND column_name = 'is_default'
    ) THEN
        ALTER TABLE pipelines ADD COLUMN is_default BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Шаг 3: Добавляем колонку sort_order если её нет
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pipelines' AND column_name = 'sort_order'
    ) THEN
        ALTER TABLE pipelines ADD COLUMN sort_order INTEGER DEFAULT 0;
    END IF;
END $$;

-- Шаг 4: Добавляем воронки
INSERT INTO pipelines (name, code, client_type, is_default, sort_order)
VALUES ('Новые лиды', 'leads', 'lead', false, 1)
ON CONFLICT (code) DO UPDATE SET sort_order = 1;

INSERT INTO pipelines (name, code, client_type, is_default, sort_order)
VALUES ('Потенциальные клиенты', 'pk', 'pk', false, 2)
ON CONFLICT (code) DO UPDATE SET sort_order = 2;

INSERT INTO pipelines (name, code, client_type, is_default, sort_order)
VALUES ('Обзвон КБ', 'kb', 'kb', false, 3)
ON CONFLICT (code) DO UPDATE SET sort_order = 3;

INSERT INTO pipelines (name, code, client_type, is_default, sort_order)
VALUES ('Рассылки', 'mailings', NULL, false, 4)
ON CONFLICT (code) DO UPDATE SET sort_order = 4;

-- Шаг 5: Обновляем существующую воронку "Продажи" если есть
UPDATE pipelines SET sort_order = 0 WHERE code = 'sales' OR name = 'Продажи';

-- Шаг 6: Добавляем этапы для воронки "Новые лиды"
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Новый', 'new_leads', '#3B82F6', 1, false, false FROM pipelines WHERE code = 'leads'
ON CONFLICT DO NOTHING;

INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'В работе', 'in_progress_leads', '#F59E0B', 2, false, false FROM pipelines WHERE code = 'leads'
ON CONFLICT DO NOTHING;

INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Выбор билетов', 'negotiation_leads', '#8B5CF6', 3, false, false FROM pipelines WHERE code = 'leads'
ON CONFLICT DO NOTHING;

INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Оплата', 'payment_leads', '#EC4899', 4, false, false FROM pipelines WHERE code = 'leads'
ON CONFLICT DO NOTHING;

INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Успешно', 'won_leads', '#10B981', 5, true, true FROM pipelines WHERE code = 'leads'
ON CONFLICT DO NOTHING;

INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Отказ', 'lost_leads', '#EF4444', 6, true, false FROM pipelines WHERE code = 'leads'
ON CONFLICT DO NOTHING;

-- Шаг 7: Добавляем этапы для воронки "Потенциальные клиенты"
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Перезвонить', 'callback_pk', '#6B7280', 1, false, false FROM pipelines WHERE code = 'pk'
ON CONFLICT DO NOTHING;

INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Думает', 'thinking_pk', '#F59E0B', 2, false, false FROM pipelines WHERE code = 'pk'
ON CONFLICT DO NOTHING;

INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Заинтересован', 'interested_pk', '#8B5CF6', 3, false, false FROM pipelines WHERE code = 'pk'
ON CONFLICT DO NOTHING;

INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Выбор билетов', 'negotiation_pk', '#EC4899', 4, false, false FROM pipelines WHERE code = 'pk'
ON CONFLICT DO NOTHING;

INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Оплата', 'payment_pk', '#3B82F6', 5, false, false FROM pipelines WHERE code = 'pk'
ON CONFLICT DO NOTHING;

INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Успешно', 'won_pk', '#10B981', 6, true, true FROM pipelines WHERE code = 'pk'
ON CONFLICT DO NOTHING;

INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Отказ', 'lost_pk', '#EF4444', 7, true, false FROM pipelines WHERE code = 'pk'
ON CONFLICT DO NOTHING;

-- Шаг 8: Добавляем этапы для воронки "Обзвон КБ"
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'В очереди', 'queue_kb', '#6B7280', 1, false, false FROM pipelines WHERE code = 'kb'
ON CONFLICT DO NOTHING;

INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Недозвон', 'no_answer_kb', '#F59E0B', 2, false, false FROM pipelines WHERE code = 'kb'
ON CONFLICT DO NOTHING;

INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Обсуждаем', 'discussing_kb', '#8B5CF6', 3, false, false FROM pipelines WHERE code = 'kb'
ON CONFLICT DO NOTHING;

INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Предложение', 'offer_kb', '#EC4899', 4, false, false FROM pipelines WHERE code = 'kb'
ON CONFLICT DO NOTHING;

INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Оплата', 'payment_kb', '#3B82F6', 5, false, false FROM pipelines WHERE code = 'kb'
ON CONFLICT DO NOTHING;

INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Повторная покупка', 'repeat_kb', '#10B981', 6, true, true FROM pipelines WHERE code = 'kb'
ON CONFLICT DO NOTHING;

INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Отказ', 'lost_kb', '#EF4444', 7, true, false FROM pipelines WHERE code = 'kb'
ON CONFLICT DO NOTHING;

-- Шаг 9: Добавляем этапы для воронки "Рассылки"
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'В базе рассылок', 'in_base_mail', '#6B7280', 1, false, false FROM pipelines WHERE code = 'mailings'
ON CONFLICT DO NOTHING;

INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Рассылка отправлена', 'sent_mail', '#3B82F6', 2, false, false FROM pipelines WHERE code = 'mailings'
ON CONFLICT DO NOTHING;

INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Открыл', 'opened_mail', '#F59E0B', 3, false, false FROM pipelines WHERE code = 'mailings'
ON CONFLICT DO NOTHING;

INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Заинтересован', 'interested_mail', '#EC4899', 4, false, false FROM pipelines WHERE code = 'mailings'
ON CONFLICT DO NOTHING;

INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Оплатил', 'paid_mail', '#10B981', 5, true, true FROM pipelines WHERE code = 'mailings'
ON CONFLICT DO NOTHING;

INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Отписался', 'unsub_mail', '#EF4444', 6, true, false FROM pipelines WHERE code = 'mailings'
ON CONFLICT DO NOTHING;

-- Проверка результата
SELECT p.name as pipeline, p.code, p.sort_order, COUNT(ps.id) as stages_count
FROM pipelines p
LEFT JOIN pipeline_stages ps ON ps.pipeline_id = p.id
GROUP BY p.id, p.name, p.code, p.sort_order
ORDER BY p.sort_order;
