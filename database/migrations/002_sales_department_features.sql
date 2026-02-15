-- =============================================
-- Миграция: Функции по требованиям отдела продаж
-- Версия: 002
-- Дата: 2026-02-05
-- =============================================

-- 1. Добавляем новые поля в clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS rejection_points INTEGER DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_clients_last_activity ON clients(last_activity_at);

-- 2. Добавляем все 4 воронки
-- Воронка для новых лидов
INSERT INTO pipelines (name, code, client_type, is_default, sort_order)
VALUES ('Новые лиды', 'leads', 'lead', false, 1)
ON CONFLICT (code) DO NOTHING;

-- Воронка для ПК
INSERT INTO pipelines (name, code, client_type, is_default, sort_order)
VALUES ('Потенциальные клиенты', 'pk', 'pk', false, 2)
ON CONFLICT (code) DO NOTHING;

-- Воронка для КБ
INSERT INTO pipelines (name, code, client_type, is_default, sort_order)
VALUES ('Обзвон КБ', 'kb', 'kb', false, 3)
ON CONFLICT (code) DO NOTHING;

-- Воронка для рассылок
INSERT INTO pipelines (name, code, client_type, is_default, sort_order)
VALUES ('Рассылки', 'mailings', NULL, false, 4)
ON CONFLICT (code) DO NOTHING;

-- Добавляем этапы для воронки "Новые лиды"
DO $$
DECLARE
    v_pipeline_id UUID;
BEGIN
    SELECT id INTO v_pipeline_id FROM pipelines WHERE code = 'leads';
    
    IF v_pipeline_id IS NOT NULL THEN
        INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
        VALUES 
            (v_pipeline_id, 'Новый', 'new', '#3B82F6', 1, false, false),
            (v_pipeline_id, 'В работе', 'in_progress', '#F59E0B', 2, false, false),
            (v_pipeline_id, 'Выбор билетов', 'negotiation', '#8B5CF6', 3, false, false),
            (v_pipeline_id, 'Оплата', 'payment', '#EC4899', 4, false, false),
            (v_pipeline_id, 'Успешно', 'won', '#10B981', 5, true, true),
            (v_pipeline_id, 'Отказ', 'lost', '#EF4444', 6, true, false)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Добавляем этапы для воронки "Потенциальные клиенты"
DO $$
DECLARE
    v_pipeline_id UUID;
BEGIN
    SELECT id INTO v_pipeline_id FROM pipelines WHERE code = 'pk';
    
    IF v_pipeline_id IS NOT NULL THEN
        INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
        VALUES 
            (v_pipeline_id, 'Перезвонить', 'callback', '#6B7280', 1, false, false),
            (v_pipeline_id, 'Думает', 'thinking', '#F59E0B', 2, false, false),
            (v_pipeline_id, 'Заинтересован', 'interested', '#8B5CF6', 3, false, false),
            (v_pipeline_id, 'Выбор билетов', 'negotiation', '#EC4899', 4, false, false),
            (v_pipeline_id, 'Оплата', 'payment', '#3B82F6', 5, false, false),
            (v_pipeline_id, 'Успешно', 'won', '#10B981', 6, true, true),
            (v_pipeline_id, 'Отказ', 'lost', '#EF4444', 7, true, false)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Добавляем этапы для воронки "Обзвон КБ"
DO $$
DECLARE
    v_pipeline_id UUID;
BEGIN
    SELECT id INTO v_pipeline_id FROM pipelines WHERE code = 'kb';
    
    IF v_pipeline_id IS NOT NULL THEN
        INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
        VALUES 
            (v_pipeline_id, 'В очереди', 'queue', '#6B7280', 1, false, false),
            (v_pipeline_id, 'Недозвон', 'no_answer', '#F59E0B', 2, false, false),
            (v_pipeline_id, 'Обсуждаем', 'discussing', '#8B5CF6', 3, false, false),
            (v_pipeline_id, 'Предложение', 'offer', '#EC4899', 4, false, false),
            (v_pipeline_id, 'Оплата', 'payment', '#3B82F6', 5, false, false),
            (v_pipeline_id, 'Повторная покупка', 'repeat_purchase', '#10B981', 6, true, true),
            (v_pipeline_id, 'Отказ', 'lost', '#EF4444', 7, true, false)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Добавляем этапы для воронки "Рассылки"
DO $$
DECLARE
    v_pipeline_id UUID;
BEGIN
    SELECT id INTO v_pipeline_id FROM pipelines WHERE code = 'mailings';
    
    IF v_pipeline_id IS NOT NULL THEN
        INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
        VALUES 
            (v_pipeline_id, 'В базе рассылок', 'in_base', '#6B7280', 1, false, false),
            (v_pipeline_id, 'Рассылка отправлена', 'sent', '#3B82F6', 2, false, false),
            (v_pipeline_id, 'Открыл', 'opened', '#F59E0B', 3, false, false),
            (v_pipeline_id, 'Заинтересован', 'interested', '#EC4899', 4, false, false),
            (v_pipeline_id, 'Оплатил', 'paid', '#10B981', 5, true, true),
            (v_pipeline_id, 'Отписался', 'unsubscribed', '#EF4444', 6, true, false)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 3. Создаем таблицу тегов
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6B7280',
    category TEXT CHECK (category IN ('event', 'status', 'custom', 'vip')),
    is_auto BOOLEAN DEFAULT false,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    city_id UUID REFERENCES cities(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, category)
);

CREATE TABLE IF NOT EXISTS client_tags (
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES managers(id),
    PRIMARY KEY (client_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_client_tags_client ON client_tags(client_id);
CREATE INDEX IF NOT EXISTS idx_client_tags_tag ON client_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);
CREATE INDEX IF NOT EXISTS idx_tags_event ON tags(event_id);

-- 4. Создаем таблицу отметок пичинга
CREATE TABLE IF NOT EXISTS client_pitches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    manager_id UUID REFERENCES managers(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_client_pitches_client ON client_pitches(client_id);
CREATE INDEX IF NOT EXISTS idx_client_pitches_event ON client_pitches(event_id);

-- 5. Создаем таблицу правил распределения лидов
CREATE TABLE IF NOT EXISTS lead_routing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES managers(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    valid_from DATE,
    valid_to DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routing_rules_city ON lead_routing_rules(city_id);
CREATE INDEX IF NOT EXISTS idx_routing_rules_event ON lead_routing_rules(event_id);
CREATE INDEX IF NOT EXISTS idx_routing_rules_manager ON lead_routing_rules(manager_id);

-- 6. Создаем таблицу напоминаний
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    remind_at TIMESTAMPTZ NOT NULL,
    channel TEXT CHECK (channel IN ('whatsapp', 'sms', 'telegram')),
    message_template_id UUID REFERENCES message_templates(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_client ON reminders(client_id);
CREATE INDEX IF NOT EXISTS idx_reminders_event ON reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders(remind_at);

-- 7. RLS для новых таблиц
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_pitches ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON tags FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON client_tags FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON client_pitches FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON lead_routing_rules FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON reminders FOR ALL USING (true);

-- 8. Триггер для обновления last_activity_at
CREATE OR REPLACE FUNCTION update_client_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE clients 
    SET last_activity_at = NOW(), updated_at = NOW()
    WHERE id = NEW.client_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_calls_update_client_activity ON calls;
CREATE TRIGGER tr_calls_update_client_activity
    AFTER INSERT ON calls
    FOR EACH ROW
    WHEN (NEW.client_id IS NOT NULL)
    EXECUTE FUNCTION update_client_last_activity();

DROP TRIGGER IF EXISTS tr_messages_update_client_activity ON messages;
CREATE TRIGGER tr_messages_update_client_activity
    AFTER INSERT ON messages
    FOR EACH ROW
    WHEN (NEW.client_id IS NOT NULL)
    EXECUTE FUNCTION update_client_last_activity();

-- 9. Функция добавления точки отказа
CREATE OR REPLACE FUNCTION add_rejection_point(p_client_id UUID, p_city_name TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_client clients%ROWTYPE;
    v_city_name TEXT;
    v_vip_tag_id UUID;
    v_mailings_pipeline_id UUID;
    v_mailings_stage_id UUID;
BEGIN
    SELECT * INTO v_client FROM clients WHERE id = p_client_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Client not found');
    END IF;
    
    IF p_city_name IS NOT NULL THEN
        v_city_name := p_city_name;
    ELSE
        SELECT name INTO v_city_name FROM cities WHERE id = v_client.city_id;
    END IF;
    
    UPDATE clients SET rejection_points = rejection_points + 1 WHERE id = p_client_id;
    
    IF v_client.status = 'vip' AND v_client.rejection_points >= 2 THEN
        SELECT id INTO v_mailings_pipeline_id FROM pipelines WHERE code = 'mailings';
        SELECT id INTO v_mailings_stage_id FROM pipeline_stages 
            WHERE pipeline_id = v_mailings_pipeline_id AND code = 'in_base' LIMIT 1;
        
        IF v_mailings_pipeline_id IS NOT NULL AND v_mailings_stage_id IS NOT NULL THEN
            INSERT INTO deals (client_id, pipeline_id, stage_id, title, status)
            VALUES (p_client_id, v_mailings_pipeline_id, v_mailings_stage_id, 'Автоперенос из VIP', 'active');
        END IF;
        
        RETURN jsonb_build_object('success', true, 'action', 'moved_to_mailings');
    END IF;
    
    IF v_client.rejection_points >= 4 THEN
        DELETE FROM client_tags WHERE client_id = p_client_id 
            AND tag_id NOT IN (SELECT id FROM tags WHERE category = 'vip');
        
        INSERT INTO tags (name, color, category, city_id, is_auto)
        VALUES ('VIP ' || COALESCE(v_city_name, 'Общий'), '#FFD700', 'vip', v_client.city_id, true)
        ON CONFLICT (name, category) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_vip_tag_id;
        
        INSERT INTO client_tags (client_id, tag_id) 
        VALUES (p_client_id, v_vip_tag_id)
        ON CONFLICT DO NOTHING;
        
        UPDATE clients SET 
            status = 'vip',
            rejection_points = 0,
            updated_at = NOW()
        WHERE id = p_client_id;
        
        RETURN jsonb_build_object('success', true, 'action', 'became_vip', 'city', v_city_name);
    END IF;
    
    RETURN jsonb_build_object('success', true, 'action', 'point_added', 'points', v_client.rejection_points + 1);
END;
$$ LANGUAGE plpgsql;

-- 10. Сброс точек при покупке
CREATE OR REPLACE FUNCTION reset_rejection_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'won' AND OLD.status != 'won' THEN
        UPDATE clients SET rejection_points = 0 WHERE id = NEW.client_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_deals_reset_rejection ON deals;
CREATE TRIGGER tr_deals_reset_rejection
    AFTER UPDATE ON deals
    FOR EACH ROW
    EXECUTE FUNCTION reset_rejection_on_purchase();

-- 11. Автотег спектакля при создании сделки
CREATE OR REPLACE FUNCTION create_event_tag_on_deal()
RETURNS TRIGGER AS $$
DECLARE
    v_event events%ROWTYPE;
    v_show shows%ROWTYPE;
    v_city cities%ROWTYPE;
    v_tag_id UUID;
    v_tag_name TEXT;
BEGIN
    IF NEW.event_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    SELECT * INTO v_event FROM events WHERE id = NEW.event_id;
    IF NOT FOUND THEN RETURN NEW; END IF;
    
    SELECT * INTO v_show FROM shows WHERE id = v_event.show_id;
    SELECT * INTO v_city FROM cities WHERE id = v_event.city_id;
    
    v_tag_name := v_show.title || ' (' || v_city.name || ', ' || to_char(v_event.event_date, 'DD.MM') || ')';
    
    INSERT INTO tags (name, color, category, event_id, is_auto)
    VALUES (v_tag_name, '#3B82F6', 'event', NEW.event_id, true)
    ON CONFLICT (name, category) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_tag_id;
    
    IF NEW.client_id IS NOT NULL THEN
        INSERT INTO client_tags (client_id, tag_id)
        VALUES (NEW.client_id, v_tag_id)
        ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_deals_create_event_tag ON deals;
CREATE TRIGGER tr_deals_create_event_tag
    AFTER INSERT ON deals
    FOR EACH ROW
    EXECUTE FUNCTION create_event_tag_on_deal();

-- 12. Функция объединения дубликатов
CREATE OR REPLACE FUNCTION merge_clients(p_main_id UUID, p_duplicate_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_main clients%ROWTYPE;
    v_duplicate clients%ROWTYPE;
BEGIN
    SELECT * INTO v_main FROM clients WHERE id = p_main_id;
    SELECT * INTO v_duplicate FROM clients WHERE id = p_duplicate_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Client not found');
    END IF;
    
    UPDATE deals SET client_id = p_main_id WHERE client_id = p_duplicate_id;
    UPDATE calls SET client_id = p_main_id WHERE client_id = p_duplicate_id;
    UPDATE messages SET client_id = p_main_id WHERE client_id = p_duplicate_id;
    UPDATE tasks SET client_id = p_main_id WHERE client_id = p_duplicate_id;
    UPDATE activities SET client_id = p_main_id WHERE client_id = p_duplicate_id;
    
    INSERT INTO client_tags (client_id, tag_id, created_at)
    SELECT p_main_id, tag_id, created_at FROM client_tags WHERE client_id = p_duplicate_id
    ON CONFLICT DO NOTHING;
    
    INSERT INTO client_pitches (client_id, event_id, manager_id, created_at)
    SELECT p_main_id, event_id, manager_id, created_at FROM client_pitches WHERE client_id = p_duplicate_id
    ON CONFLICT DO NOTHING;
    
    UPDATE clients SET
        total_purchases = v_main.total_purchases + v_duplicate.total_purchases,
        total_revenue = v_main.total_revenue + v_duplicate.total_revenue,
        first_purchase_date = LEAST(v_main.first_purchase_date, v_duplicate.first_purchase_date),
        last_purchase_date = GREATEST(v_main.last_purchase_date, v_duplicate.last_purchase_date),
        client_type = CASE 
            WHEN v_main.client_type = 'kb' OR v_duplicate.client_type = 'kb' THEN 'kb'
            WHEN v_main.client_type = 'pk' OR v_duplicate.client_type = 'pk' THEN 'pk'
            ELSE 'lead'
        END,
        notes = COALESCE(v_main.notes, '') || 
            CASE WHEN v_duplicate.notes IS NOT NULL 
                THEN E'\n---\nОбъединено с ' || v_duplicate.full_name || ': ' || v_duplicate.notes 
                ELSE '' 
            END,
        updated_at = NOW()
    WHERE id = p_main_id;
    
    DELETE FROM clients WHERE id = p_duplicate_id;
    
    RETURN jsonb_build_object('success', true, 'merged_into', p_main_id);
END;
$$ LANGUAGE plpgsql;

-- 13. Функция распределения лида по правилам
CREATE OR REPLACE FUNCTION get_manager_for_lead(p_city_id UUID, p_event_id UUID DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
    v_manager_id UUID;
BEGIN
    SELECT manager_id INTO v_manager_id
    FROM lead_routing_rules
    WHERE is_active = true
        AND city_id = p_city_id
        AND (event_id = p_event_id OR (p_event_id IS NULL AND event_id IS NULL))
        AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
        AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
    ORDER BY 
        CASE WHEN event_id IS NOT NULL THEN 0 ELSE 1 END,
        priority DESC
    LIMIT 1;
    
    RETURN v_manager_id;
END;
$$ LANGUAGE plpgsql;
