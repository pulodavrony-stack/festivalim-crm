import { NextResponse } from 'next/server';

const MIGRATION_SQL = `
-- Create orgotdel schema
CREATE SCHEMA IF NOT EXISTS orgotdel;

-- Grant usage
GRANT USAGE ON SCHEMA orgotdel TO postgres, anon, authenticated, service_role;

-- Departments
CREATE TABLE IF NOT EXISTS orgotdel.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    ckp TEXT,
    metrics TEXT,
    kfu TEXT,
    head_position TEXT
);

-- Cities
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

-- Halls
CREATE TABLE IF NOT EXISTS orgotdel.halls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    city_id UUID NOT NULL REFERENCES orgotdel.cities(id) ON DELETE CASCADE,
    address TEXT,
    capacity INTEGER,
    comments TEXT
);

-- Venue Details
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

-- Shows
CREATE TABLE IF NOT EXISTS orgotdel.shows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL UNIQUE,
    rating TEXT
);

-- Show Details
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

-- Events
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

-- Drafts
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

-- Payment Events
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

-- Tasks
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

-- Planning Items
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

-- Month Comments
CREATE TABLE IF NOT EXISTS orgotdel.month_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year_month TEXT NOT NULL UNIQUE,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Available Dates
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

-- Notifications
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
`;

const INSERT_DEPARTMENTS_SQL = `
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
`;

export async function POST() {
  return NextResponse.json({
    success: true,
    message: 'Скопируйте SQL ниже и выполните в Supabase Dashboard → SQL Editor',
    instructions: [
      '1. Откройте https://supabase.com/dashboard/project/rlttkzmpazgdkypvhtpd/sql',
      '2. Вставьте SQL из поля "sql" ниже',
      '3. Нажмите "Run"',
    ],
    sql: MIGRATION_SQL + '\n' + INSERT_DEPARTMENTS_SQL,
  });
}

export async function GET() {
  return NextResponse.json({
    message: 'Используйте POST для запуска миграции или скопируйте SQL ниже в Supabase Dashboard',
    sql: MIGRATION_SQL + '\n' + INSERT_DEPARTMENTS_SQL,
  });
}
