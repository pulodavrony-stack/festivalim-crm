-- =============================================
-- Быстрое добавление всех 4 воронок
-- Выполните этот скрипт в Supabase SQL Editor
-- =============================================

-- 1. Добавляем воронку "Новые лиды"
INSERT INTO pipelines (name, code, client_type, is_default, sort_order)
VALUES ('Новые лиды', 'leads', 'lead', false, 1)
ON CONFLICT (code) DO NOTHING;

-- 2. Добавляем воронку "Потенциальные клиенты"
INSERT INTO pipelines (name, code, client_type, is_default, sort_order)
VALUES ('Потенциальные клиенты', 'pk', 'pk', false, 2)
ON CONFLICT (code) DO NOTHING;

-- 3. Добавляем воронку "Обзвон КБ"
INSERT INTO pipelines (name, code, client_type, is_default, sort_order)
VALUES ('Обзвон КБ', 'kb', 'kb', false, 3)
ON CONFLICT (code) DO NOTHING;

-- 4. Добавляем воронку "Рассылки"
INSERT INTO pipelines (name, code, client_type, is_default, sort_order)
VALUES ('Рассылки', 'mailings', NULL, false, 4)
ON CONFLICT (code) DO NOTHING;

-- Добавляем этапы для воронки "Новые лиды"
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Новый', 'new', '#3B82F6', 1, false, false FROM pipelines WHERE code = 'leads'
ON CONFLICT DO NOTHING;
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'В работе', 'in_progress', '#F59E0B', 2, false, false FROM pipelines WHERE code = 'leads'
ON CONFLICT DO NOTHING;
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Выбор билетов', 'negotiation', '#8B5CF6', 3, false, false FROM pipelines WHERE code = 'leads'
ON CONFLICT DO NOTHING;
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Оплата', 'payment', '#EC4899', 4, false, false FROM pipelines WHERE code = 'leads'
ON CONFLICT DO NOTHING;
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Успешно', 'won', '#10B981', 5, true, true FROM pipelines WHERE code = 'leads'
ON CONFLICT DO NOTHING;
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Отказ', 'lost', '#EF4444', 6, true, false FROM pipelines WHERE code = 'leads'
ON CONFLICT DO NOTHING;

-- Добавляем этапы для воронки "Потенциальные клиенты"
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Перезвонить', 'callback', '#6B7280', 1, false, false FROM pipelines WHERE code = 'pk'
ON CONFLICT DO NOTHING;
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Думает', 'thinking', '#F59E0B', 2, false, false FROM pipelines WHERE code = 'pk'
ON CONFLICT DO NOTHING;
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Заинтересован', 'interested', '#8B5CF6', 3, false, false FROM pipelines WHERE code = 'pk'
ON CONFLICT DO NOTHING;
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Выбор билетов', 'negotiation', '#EC4899', 4, false, false FROM pipelines WHERE code = 'pk'
ON CONFLICT DO NOTHING;
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Оплата', 'payment', '#3B82F6', 5, false, false FROM pipelines WHERE code = 'pk'
ON CONFLICT DO NOTHING;
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Успешно', 'won', '#10B981', 6, true, true FROM pipelines WHERE code = 'pk'
ON CONFLICT DO NOTHING;
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Отказ', 'lost', '#EF4444', 7, true, false FROM pipelines WHERE code = 'pk'
ON CONFLICT DO NOTHING;

-- Добавляем этапы для воронки "Обзвон КБ"
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'В очереди', 'queue', '#6B7280', 1, false, false FROM pipelines WHERE code = 'kb'
ON CONFLICT DO NOTHING;
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Недозвон', 'no_answer', '#F59E0B', 2, false, false FROM pipelines WHERE code = 'kb'
ON CONFLICT DO NOTHING;
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Обсуждаем', 'discussing', '#8B5CF6', 3, false, false FROM pipelines WHERE code = 'kb'
ON CONFLICT DO NOTHING;
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Предложение', 'offer', '#EC4899', 4, false, false FROM pipelines WHERE code = 'kb'
ON CONFLICT DO NOTHING;
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Оплата', 'payment', '#3B82F6', 5, false, false FROM pipelines WHERE code = 'kb'
ON CONFLICT DO NOTHING;
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Повторная покупка', 'repeat_purchase', '#10B981', 6, true, true FROM pipelines WHERE code = 'kb'
ON CONFLICT DO NOTHING;
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Отказ', 'lost', '#EF4444', 7, true, false FROM pipelines WHERE code = 'kb'
ON CONFLICT DO NOTHING;

-- Добавляем этапы для воронки "Рассылки"
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'В базе рассылок', 'in_base', '#6B7280', 1, false, false FROM pipelines WHERE code = 'mailings'
ON CONFLICT DO NOTHING;
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Рассылка отправлена', 'sent', '#3B82F6', 2, false, false FROM pipelines WHERE code = 'mailings'
ON CONFLICT DO NOTHING;
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Открыл', 'opened', '#F59E0B', 3, false, false FROM pipelines WHERE code = 'mailings'
ON CONFLICT DO NOTHING;
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Заинтересован', 'interested', '#EC4899', 4, false, false FROM pipelines WHERE code = 'mailings'
ON CONFLICT DO NOTHING;
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Оплатил', 'paid', '#10B981', 5, true, true FROM pipelines WHERE code = 'mailings'
ON CONFLICT DO NOTHING;
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'Отписался', 'unsubscribed', '#EF4444', 6, true, false FROM pipelines WHERE code = 'mailings'
ON CONFLICT DO NOTHING;

-- Проверка результата
SELECT p.name as pipeline, COUNT(ps.id) as stages_count
FROM pipelines p
LEFT JOIN pipeline_stages ps ON ps.pipeline_id = p.id
GROUP BY p.id, p.name
ORDER BY p.sort_order;
