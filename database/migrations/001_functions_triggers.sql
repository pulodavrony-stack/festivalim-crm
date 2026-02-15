-- =============================================
-- ФЕСТИВАЛИМ CRM: Функции, триггеры, RLS
-- Выполнить после создания основных таблиц
-- =============================================

-- 11. АНАЛИТИКА
CREATE TABLE IF NOT EXISTS manager_daily_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_id UUID REFERENCES managers(id) ON DELETE CASCADE,
    stat_date DATE NOT NULL,
    calls_total INTEGER DEFAULT 0,
    calls_answered INTEGER DEFAULT 0,
    calls_duration_total INTEGER DEFAULT 0,
    deals_created INTEGER DEFAULT 0,
    deals_won INTEGER DEFAULT 0,
    deals_lost INTEGER DEFAULT 0,
    revenue DECIMAL(12,2) DEFAULT 0,
    tickets_sold INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    messages_received INTEGER DEFAULT 0,
    tasks_completed INTEGER DEFAULT 0,
    tasks_overdue INTEGER DEFAULT 0,
    conversion_lead_to_deal DECIMAL(5,2),
    conversion_deal_to_sale DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(manager_id, stat_date)
);

CREATE INDEX IF NOT EXISTS idx_manager_stats_date ON manager_daily_stats(stat_date);

CREATE TABLE IF NOT EXISTS source_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES lead_sources(id) ON DELETE CASCADE,
    stat_date DATE NOT NULL,
    leads_count INTEGER DEFAULT 0,
    deals_count INTEGER DEFAULT 0,
    won_count INTEGER DEFAULT 0,
    revenue DECIMAL(12,2) DEFAULT 0,
    conversion_to_deal DECIMAL(5,2),
    conversion_to_sale DECIMAL(5,2),
    ad_spend DECIMAL(12,2),
    cost_per_lead DECIMAL(10,2),
    roi DECIMAL(10,2),
    UNIQUE(source_id, stat_date)
);

-- 12. ФУНКЦИИ
CREATE OR REPLACE FUNCTION normalize_phone(phone TEXT)
RETURNS TEXT AS $$
BEGIN
    IF phone IS NULL THEN RETURN NULL; END IF;
    RETURN regexp_replace(phone, '[^0-9]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION update_client_phone_normalized()
RETURNS TRIGGER AS $$
BEGIN
    NEW.phone_normalized := normalize_phone(NEW.phone);
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_clients_phone_normalized ON clients;
CREATE TRIGGER tr_clients_phone_normalized
    BEFORE INSERT OR UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_client_phone_normalized();

CREATE OR REPLACE FUNCTION calc_report_date(input_date TIMESTAMPTZ)
RETURNS DATE AS $$
DECLARE
    d DATE := input_date::DATE;
    dow INTEGER := EXTRACT(DOW FROM d);
BEGIN
    IF dow = 0 THEN RETURN d + 1;
    ELSIF dow = 6 THEN RETURN d + 2;
    ELSE RETURN d;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION set_call_report_date()
RETURNS TRIGGER AS $$
BEGIN
    NEW.report_date := calc_report_date(NEW.started_at);
    NEW.phone_normalized := normalize_phone(NEW.phone);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_calls_report_date ON calls;
CREATE TRIGGER tr_calls_report_date
    BEFORE INSERT OR UPDATE ON calls
    FOR EACH ROW
    EXECUTE FUNCTION set_call_report_date();

CREATE OR REPLACE FUNCTION calc_week_start(input_date DATE)
RETURNS DATE AS $$
BEGIN
    RETURN date_trunc('week', input_date)::DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION set_deal_report_week()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'won' AND NEW.closed_at IS NOT NULL THEN
        NEW.report_week_start := calc_week_start(calc_report_date(NEW.closed_at));
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_deals_report_week ON deals;
CREATE TRIGGER tr_deals_report_week
    BEFORE INSERT OR UPDATE ON deals
    FOR EACH ROW
    EXECUTE FUNCTION set_deal_report_week();

CREATE OR REPLACE FUNCTION find_client_by_phone(search_phone TEXT)
RETURNS TABLE(id UUID, full_name TEXT, client_type TEXT, total_purchases INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.full_name, c.client_type, c.total_purchases
    FROM clients c
    WHERE c.phone_normalized = normalize_phone(search_phone)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION auto_upgrade_client_type()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'won' AND OLD.status != 'won' THEN
        UPDATE clients 
        SET 
            client_type = 'kb',
            became_kb_at = COALESCE(became_kb_at, NOW()),
            total_purchases = total_purchases + 1,
            total_revenue = total_revenue + COALESCE(NEW.amount, 0),
            first_purchase_date = COALESCE(first_purchase_date, CURRENT_DATE),
            last_purchase_date = CURRENT_DATE,
            status = 'active',
            updated_at = NOW()
        WHERE id = NEW.client_id;
        
        IF EXISTS (SELECT 1 FROM clients WHERE id = NEW.client_id AND client_type != 'kb') THEN
            INSERT INTO activities (client_id, deal_id, manager_id, activity_type, content)
            VALUES (NEW.client_id, NEW.id, NEW.manager_id, 'type_change', 'Клиент переведён в КБ после покупки');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_deals_upgrade_client ON deals;
CREATE TRIGGER tr_deals_upgrade_client
    AFTER UPDATE ON deals
    FOR EACH ROW
    EXECUTE FUNCTION auto_upgrade_client_type();

-- 13. ROW LEVEL SECURITY
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated" ON clients;
DROP POLICY IF EXISTS "Allow all for authenticated" ON deals;
DROP POLICY IF EXISTS "Allow all for authenticated" ON calls;
DROP POLICY IF EXISTS "Allow all for authenticated" ON messages;
DROP POLICY IF EXISTS "Allow all for authenticated" ON tasks;
DROP POLICY IF EXISTS "Allow all for authenticated" ON activities;

CREATE POLICY "Allow all for authenticated" ON clients FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON deals FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON calls FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON messages FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON tasks FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON activities FOR ALL USING (true);

-- 14. VIEWS для аналитики
CREATE OR REPLACE VIEW manager_weekly_stats AS
SELECT 
    m.id as manager_id,
    m.full_name,
    calc_week_start(CURRENT_DATE) as week_start,
    COUNT(DISTINCT c.id) FILTER (WHERE c.report_date >= calc_week_start(CURRENT_DATE)) as calls_total,
    COUNT(DISTINCT c.id) FILTER (WHERE c.report_date >= calc_week_start(CURRENT_DATE) AND c.status = 'answered') as calls_answered,
    COUNT(DISTINCT d.id) FILTER (WHERE d.report_week_start = calc_week_start(CURRENT_DATE) AND d.status = 'won') as deals_won,
    COALESCE(SUM(d.amount) FILTER (WHERE d.report_week_start = calc_week_start(CURRENT_DATE) AND d.status = 'won'), 0) as revenue,
    m.weekly_calls_target,
    m.weekly_sales_target,
    ROUND(COUNT(DISTINCT c.id) FILTER (WHERE c.report_date >= calc_week_start(CURRENT_DATE))::DECIMAL / NULLIF(m.weekly_calls_target, 0) * 100, 1) as calls_progress,
    ROUND(COALESCE(SUM(d.amount) FILTER (WHERE d.report_week_start = calc_week_start(CURRENT_DATE) AND d.status = 'won'), 0) / NULLIF(m.weekly_sales_target, 0) * 100, 1) as sales_progress
FROM managers m
LEFT JOIN calls c ON c.manager_id = m.id
LEFT JOIN deals d ON d.manager_id = m.id
WHERE m.is_active = true
GROUP BY m.id, m.full_name, m.weekly_calls_target, m.weekly_sales_target;

CREATE OR REPLACE VIEW pipeline_conversion AS
SELECT 
    p.id as pipeline_id,
    p.name as pipeline_name,
    ps.id as stage_id,
    ps.name as stage_name,
    ps.sort_order,
    COUNT(d.id) as deals_count,
    COALESCE(SUM(d.amount), 0) as deals_amount,
    ROUND(COUNT(d.id)::DECIMAL / NULLIF((SELECT COUNT(*) FROM deals WHERE pipeline_id = p.id), 0) * 100, 1) as stage_percentage
FROM pipelines p
JOIN pipeline_stages ps ON ps.pipeline_id = p.id
LEFT JOIN deals d ON d.stage_id = ps.id AND d.status = 'active'
GROUP BY p.id, p.name, ps.id, ps.name, ps.sort_order
ORDER BY p.sort_order, ps.sort_order;
