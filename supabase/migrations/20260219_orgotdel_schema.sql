-- =============================================
-- ORGOTDEL Schema Migration
-- Creates all tables for the Orgotdel module
-- =============================================

-- Create orgotdel schema
CREATE SCHEMA IF NOT EXISTS orgotdel;

-- Grant usage to authenticated and service_role
GRANT USAGE ON SCHEMA orgotdel TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA orgotdel TO postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA orgotdel TO anon, authenticated;

-- Set default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA orgotdel GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA orgotdel GRANT SELECT ON TABLES TO anon, authenticated;

-- =============================================
-- 1. DEPARTMENTS (Подразделения)
-- =============================================
CREATE TABLE IF NOT EXISTS orgotdel.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    ckp TEXT,
    metrics TEXT,
    kfu TEXT,
    head_position TEXT
);

-- =============================================
-- 2. CITIES (Города)
-- =============================================
CREATE TABLE IF NOT EXISTS orgotdel.cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    timezone TEXT NOT NULL DEFAULT 'Europe/Moscow',
    priority INTEGER NOT NULL DEFAULT 2,
    min_weeks INTEGER NOT NULL DEFAULT 4,
    max_weeks INTEGER NOT NULL DEFAULT 6,
    min_weeks_summer INTEGER NOT NULL DEFAULT 4,
    max_weeks_summer INTEGER NOT NULL DEFAULT 8,
    office TEXT NOT NULL DEFAULT 'Этажи'
);

-- =============================================
-- 3. HALLS (Площадки/Залы)
-- =============================================
CREATE TABLE IF NOT EXISTS orgotdel.halls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    city_id UUID NOT NULL REFERENCES orgotdel.cities(id) ON DELETE CASCADE,
    address TEXT,
    capacity INTEGER,
    comments TEXT
);

CREATE INDEX IF NOT EXISTS idx_halls_city_id ON orgotdel.halls(city_id);

-- =============================================
-- 4. VENUE DETAILS (Детали площадки - оплата аренды)
-- =============================================
CREATE TABLE IF NOT EXISTS orgotdel.venue_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hall_id UUID NOT NULL UNIQUE REFERENCES orgotdel.halls(id) ON DELETE CASCADE,
    rental_cost INTEGER,
    prepayment_amount INTEGER,
    prepayment_days_after_contract INTEGER,
    final_payment_amount INTEGER,
    final_payment_days_before_event INTEGER,
    contact_name TEXT,
    contact_phone TEXT,
    contact_telegram TEXT,
    contact_whatsapp TEXT
);

-- =============================================
-- 5. SHOWS (Спектакли)
-- =============================================
CREATE TABLE IF NOT EXISTS orgotdel.shows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL UNIQUE,
    rating TEXT
);

-- =============================================
-- 6. SHOW DETAILS (Детали спектакля - гонорар)
-- =============================================
CREATE TABLE IF NOT EXISTS orgotdel.show_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    show_id UUID NOT NULL UNIQUE REFERENCES orgotdel.shows(id) ON DELETE CASCADE,
    fee_amount INTEGER,
    fee_prepayment_amount INTEGER,
    fee_prepayment_days_after_contract INTEGER,
    fee_final_amount INTEGER,
    fee_final_days_before_event INTEGER,
    contact_name TEXT,
    contact_phone TEXT,
    contact_telegram TEXT,
    contact_whatsapp TEXT,
    notes TEXT
);

-- =============================================
-- 7. EVENTS (Опубликованные события)
-- =============================================
CREATE TABLE IF NOT EXISTS orgotdel.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    city TEXT NOT NULL,
    hall TEXT NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'negotiating',
    contract_date DATE,
    responsible_department TEXT DEFAULT 'organization',
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_date ON orgotdel.events(date);
CREATE INDEX IF NOT EXISTS idx_events_city ON orgotdel.events(city);
CREATE INDEX IF NOT EXISTS idx_events_is_deleted ON orgotdel.events(is_deleted);

-- =============================================
-- 8. DRAFTS (Черновики - Сведение)
-- =============================================
CREATE TABLE IF NOT EXISTS orgotdel.drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    show_id UUID REFERENCES orgotdel.shows(id),
    show_title TEXT NOT NULL,
    hall_id UUID REFERENCES orgotdel.halls(id),
    hall_name TEXT NOT NULL,
    city_name TEXT NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'negotiating',
    published_event_id UUID REFERENCES orgotdel.events(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drafts_date ON orgotdel.drafts(date);
CREATE INDEX IF NOT EXISTS idx_drafts_status ON orgotdel.drafts(status);

-- =============================================
-- 9. PAYMENT EVENTS (Платежи)
-- =============================================
CREATE TABLE IF NOT EXISTS orgotdel.payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES orgotdel.events(id) ON DELETE CASCADE,
    payment_type TEXT NOT NULL,
    due_date DATE NOT NULL,
    amount INTEGER,
    payment_method TEXT,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_at DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_event_id ON orgotdel.payment_events(event_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_due_date ON orgotdel.payment_events(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_events_is_paid ON orgotdel.payment_events(is_paid);

-- =============================================
-- 10. TASKS (Задачи)
-- =============================================
CREATE TABLE IF NOT EXISTS orgotdel.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    purpose TEXT,
    measurement TEXT,
    due_date DATE,
    assignee_id UUID,
    department TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    priority INTEGER DEFAULT 2,
    link TEXT,
    comments TEXT,
    related_event_id UUID REFERENCES orgotdel.events(id),
    created_by_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON orgotdel.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_department ON orgotdel.tasks(department);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON orgotdel.tasks(status);

-- =============================================
-- 11. PLANNING ITEMS (Планирование гастролей)
-- =============================================
CREATE TABLE IF NOT EXISTS orgotdel.planning_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year_month TEXT NOT NULL,
    row_number INTEGER NOT NULL,
    date DATE,
    city_name TEXT,
    hall_name TEXT,
    show_title TEXT,
    time TEXT,
    notes TEXT,
    draft_id UUID REFERENCES orgotdel.drafts(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planning_items_year_month ON orgotdel.planning_items(year_month);

-- =============================================
-- 12. MONTH COMMENTS (Комментарии к месяцам)
-- =============================================
CREATE TABLE IF NOT EXISTS orgotdel.month_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year_month TEXT NOT NULL UNIQUE,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 13. AVAILABLE DATES (Свободные даты)
-- =============================================
CREATE TABLE IF NOT EXISTS orgotdel.available_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    show_title TEXT,
    hall_name TEXT,
    city_name TEXT,
    date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_available_dates_type ON orgotdel.available_dates(type);
CREATE INDEX IF NOT EXISTS idx_available_dates_date ON orgotdel.available_dates(date);

-- =============================================
-- 14. NOTIFICATIONS (Уведомления)
-- =============================================
CREATE TABLE IF NOT EXISTS orgotdel.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON orgotdel.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON orgotdel.notifications(is_read);

-- =============================================
-- Insert default departments
-- =============================================
INSERT INTO orgotdel.departments (code, name, head_position) VALUES
    ('management', 'Управление', 'Директор'),
    ('marketing', 'Маркетинг', 'Руководитель маркетинга'),
    ('promotion', 'Продвижение', 'Руководитель продвижения'),
    ('sales_etazhi', 'Продажи (Этажи)', 'Руководитель продаж'),
    ('sales_atlant', 'Продажи (Атлант)', 'Руководитель продаж'),
    ('organization', 'Орготдел', 'Руководитель орготдела'),
    ('hr', 'HR', 'HR-директор'),
    ('ticketing', 'Билетный стол', 'Руководитель билетного стола'),
    ('finance', 'Финансы', 'Финансовый директор'),
    ('training', 'Учебно-медийный', 'Руководитель')
ON CONFLICT (code) DO NOTHING;

-- =============================================
-- Grant permissions on new tables
-- =============================================
GRANT ALL ON ALL TABLES IN SCHEMA orgotdel TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA orgotdel TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA orgotdel TO anon;
