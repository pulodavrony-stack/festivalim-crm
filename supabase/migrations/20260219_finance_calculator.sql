-- =============================================
-- Finance Calculator Schema
-- Модуль «Калькулятор проектов»
-- =============================================

CREATE TABLE IF NOT EXISTS orgotdel.project_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Установочные данные
    project_name TEXT NOT NULL,
    city TEXT NOT NULL,
    event_date DATE,
    plan_approval_date DATE,
    status TEXT NOT NULL DEFAULT 'draft', -- draft | approved | completed
    
    -- Параметры продаж
    total_tickets INTEGER NOT NULL DEFAULT 500,
    avg_ticket_price NUMERIC NOT NULL DEFAULT 2000,
    manager_sales_share NUMERIC NOT NULL DEFAULT 53,
    manager_discount NUMERIC NOT NULL DEFAULT 5,
    discounted_tickets_share NUMERIC NOT NULL DEFAULT 20,
    
    -- Комиссии
    manager_commission_percent NUMERIC NOT NULL DEFAULT 11,
    platform_commission_percent NUMERIC NOT NULL DEFAULT 8,
    
    -- Смета спектакля
    venue_rent NUMERIC NOT NULL DEFAULT 0,
    artist_fee NUMERIC NOT NULL DEFAULT 0,
    artist_per_diem NUMERIC NOT NULL DEFAULT 0,
    artist_per_diem_comment TEXT,
    artist_travel NUMERIC NOT NULL DEFAULT 0,
    artist_accommodation NUMERIC NOT NULL DEFAULT 0,
    delivery_cdek NUMERIC NOT NULL DEFAULT 0,
    printing NUMERIC NOT NULL DEFAULT 0,
    props NUMERIC NOT NULL DEFAULT 0,
    other_production_expenses NUMERIC NOT NULL DEFAULT 0,
    other_production_expenses_comment TEXT,
    
    -- Реклама и продвижение
    platform_promotion NUMERIC NOT NULL DEFAULT 0,
    vk_ads NUMERIC NOT NULL DEFAULT 0,
    odnoklassniki_ads NUMERIC NOT NULL DEFAULT 0,
    yandex_ads NUMERIC NOT NULL DEFAULT 0,
    facebook_ads NUMERIC NOT NULL DEFAULT 0,
    seeding_ads NUMERIC NOT NULL DEFAULT 0,
    outdoor_ads NUMERIC NOT NULL DEFAULT 0,
    distributors_ads NUMERIC NOT NULL DEFAULT 0,
    
    -- Командировочные сотрудникам
    staff_travel NUMERIC NOT NULL DEFAULT 0,
    staff_accommodation NUMERIC NOT NULL DEFAULT 0,
    staff_per_diem NUMERIC NOT NULL DEFAULT 0,
    
    -- Прочие расходы
    other_org_expenses NUMERIC NOT NULL DEFAULT 0,
    other_org_expenses_comment TEXT,
    
    -- Юнит-экономика входные параметры
    target_profitability NUMERIC NOT NULL DEFAULT 45,
    variable_sales_cost_percent NUMERIC NOT NULL DEFAULT 10,
    tax_percent NUMERIC NOT NULL DEFAULT 1,
    venue_rent_percent NUMERIC NOT NULL DEFAULT 8,
    production_cost_percent NUMERIC NOT NULL DEFAULT 26,
    avg_tickets_per_deal NUMERIC NOT NULL DEFAULT 2.0,
    conversion_to_sale NUMERIC NOT NULL DEFAULT 30,
    conversion_to_qualified_lead NUMERIC NOT NULL DEFAULT 80,
    conversion_site_to_request NUMERIC NOT NULL DEFAULT 3,
    
    -- Фактические значения (ФИКС) — JSON
    actual_values JSONB DEFAULT '{}',
    
    -- Комментарии к строкам — JSON
    comments JSONB DEFAULT '{}',
    
    -- Мета
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_calc_city ON orgotdel.project_calculations(city);
CREATE INDEX IF NOT EXISTS idx_project_calc_status ON orgotdel.project_calculations(status);
CREATE INDEX IF NOT EXISTS idx_project_calc_event_date ON orgotdel.project_calculations(event_date);

GRANT ALL ON orgotdel.project_calculations TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON orgotdel.project_calculations TO authenticated;
