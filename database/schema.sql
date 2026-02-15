-- =============================================
-- ФЕСТИВАЛИМ CRM: Схема базы данных Supabase
-- Версия 2.0 — B2C театральное агентство
-- =============================================

-- Включаем расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- для быстрого поиска

-- =============================================
-- 1. СПРАВОЧНИКИ
-- =============================================

-- Города (фиксированный список)
CREATE TABLE cities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    region TEXT, -- область/край
    timezone TEXT DEFAULT 'Europe/Moscow',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Начальные города
INSERT INTO cities (name, region, sort_order) VALUES
    ('Москва', 'Москва', 1),
    ('Санкт-Петербург', 'Санкт-Петербург', 2),
    ('Воронеж', 'Воронежская область', 3),
    ('Ростов-на-Дону', 'Ростовская область', 4),
    ('Краснодар', 'Краснодарский край', 5),
    ('Сочи', 'Краснодарский край', 6),
    ('Казань', 'Татарстан', 7),
    ('Нижний Новгород', 'Нижегородская область', 8),
    ('Самара', 'Самарская область', 9),
    ('Екатеринбург', 'Свердловская область', 10);

-- Жанры спектаклей
CREATE TABLE genres (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    icon TEXT, -- эмодзи
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO genres (name, icon) VALUES
    ('Комедия', '😂'),
    ('Драма', '🎭'),
    ('Мюзикл', '🎵'),
    ('Детский', '👶'),
    ('Классика', '📚'),
    ('Современный', '🆕'),
    ('Моноспектакль', '👤'),
    ('Иммерсивный', '🌀');

-- Источники лидов
CREATE TABLE lead_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    source_type TEXT DEFAULT 'other' CHECK (source_type IN ('landing', 'telegram', 'whatsapp', 'vk', 'call', 'partner', 'other')),
    -- Для лендингов
    tilda_page_id TEXT,
    landing_url TEXT,
    -- UTM по умолчанию
    default_utm_source TEXT,
    default_utm_medium TEXT,
    default_utm_campaign TEXT,
    -- Статистика
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO lead_sources (name, code, source_type) VALUES
    ('Входящий звонок', 'uis_inbound', 'call'),
    ('Telegram-бот', 'telegram_bot', 'telegram'),
    ('WhatsApp', 'whatsapp', 'whatsapp'),
    ('VK', 'vk', 'vk'),
    ('Партнёр', 'partner', 'partner');

-- =============================================
-- 2. ПОЛЬЗОВАТЕЛИ (Менеджеры)
-- =============================================

CREATE TABLE managers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID UNIQUE, -- связь с Supabase Auth
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'manager' CHECK (role IN ('admin', 'rop', 'manager', 'marketer')),
    branch TEXT CHECK (branch IN ('atlant', 'etazhi')),
    
    -- Рабочие настройки
    cities_ids UUID[], -- какие города обрабатывает
    is_active BOOLEAN DEFAULT true,
    
    -- KPI цели (недельные)
    weekly_calls_target INTEGER DEFAULT 200,
    weekly_sales_target DECIMAL(12,2) DEFAULT 100000,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. СПЕКТАКЛИ И СОБЫТИЯ
-- =============================================

-- Спектакли (мастер-данные)
CREATE TABLE shows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER,
    age_restriction TEXT, -- "12+", "16+", etc
    
    -- Жанры (многие-ко-многим через массив)
    genre_ids UUID[],
    
    -- Медиа
    poster_url TEXT,
    trailer_url TEXT,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- События (конкретный спектакль в городе в дату)
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    show_id UUID REFERENCES shows(id) ON DELETE CASCADE,
    city_id UUID REFERENCES cities(id),
    
    -- Время и место
    event_date DATE NOT NULL,
    event_time TIME,
    venue_name TEXT,
    venue_address TEXT,
    
    -- Лендинг
    landing_source_id UUID REFERENCES lead_sources(id),
    landing_url TEXT,
    
    -- Билеты и цены
    total_tickets INTEGER,
    sold_tickets INTEGER DEFAULT 0,
    min_price DECIMAL(10,2),
    max_price DECIMAL(10,2),
    
    -- Статус
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'on_sale', 'sold_out', 'completed', 'cancelled')),
    
    -- Даты продаж
    sales_start_date DATE,
    sales_end_date DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для быстрого поиска событий
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_city ON events(city_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_show ON events(show_id);

-- =============================================
-- 4. КЛИЕНТЫ (Лид / ПК / КБ)
-- =============================================

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Основные данные
    full_name TEXT NOT NULL,
    phone TEXT,
    phone_normalized TEXT, -- только цифры для поиска дублей
    email TEXT,
    
    -- Город
    city_id UUID REFERENCES cities(id),
    
    -- ТИП КЛИЕНТА (ключевое поле!)
    client_type TEXT DEFAULT 'lead' CHECK (client_type IN ('lead', 'pk', 'kb')),
    -- lead = Лид (новый, горячий)
    -- pk = Потенциальный клиент (не купил, но заинтересован)
    -- kb = Клиентская база (купил хотя бы раз)
    
    -- Статус активности
    status TEXT DEFAULT 'new' CHECK (status IN (
        'new',           -- только пришёл
        'in_progress',   -- в работе
        'callback',      -- перезвонить
        'not_available', -- недоступен
        'interested',    -- заинтересован
        'active',        -- активный (для КБ)
        'vip',           -- VIP клиент
        'inactive',      -- давно не покупал
        'blacklist'      -- чёрный список
    )),
    
    -- Предпочтения из анкеты Telegram
    preferred_genres UUID[], -- ID жанров
    preferred_price_range TEXT CHECK (preferred_price_range IN ('economy', 'standard', 'premium', 'any')),
    survey_answers JSONB, -- полные ответы анкеты
    
    -- Telegram
    telegram_id BIGINT UNIQUE,
    telegram_username TEXT,
    telegram_chat_id BIGINT, -- для отправки сообщений
    
    -- WhatsApp
    whatsapp_phone TEXT,
    whatsapp_id TEXT,
    
    -- VK
    vk_id BIGINT,
    
    -- Источник
    source_id UUID REFERENCES lead_sources(id),
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    
    -- Привязка к менеджеру
    manager_id UUID REFERENCES managers(id),
    
    -- Статистика (денормализация для скорости)
    total_purchases INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    first_purchase_date DATE,
    last_purchase_date DATE,
    last_contact_date TIMESTAMPTZ,
    
    -- История изменения типа
    became_pk_at TIMESTAMPTZ,
    became_kb_at TIMESTAMPTZ,
    
    -- Заметки
    notes TEXT,
    
    -- Точки отказа (для системы VIP)
    rejection_points INTEGER DEFAULT 0,
    
    -- Последняя активность (для фильтрации)
    last_activity_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_clients_phone ON clients(phone_normalized);
CREATE INDEX idx_clients_last_activity ON clients(last_activity_at);
CREATE INDEX idx_clients_type ON clients(client_type);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_manager ON clients(manager_id);
CREATE INDEX idx_clients_city ON clients(city_id);
CREATE INDEX idx_clients_telegram ON clients(telegram_id);
CREATE INDEX idx_clients_whatsapp ON clients(whatsapp_phone);
CREATE INDEX idx_clients_name_trgm ON clients USING gin(full_name gin_trgm_ops);

-- =============================================
-- 5. ВОРОНКИ И ЭТАПЫ
-- =============================================

CREATE TABLE pipelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    client_type TEXT CHECK (client_type IN ('lead', 'pk', 'kb')), -- для какого типа клиентов
    is_default BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO pipelines (name, code, client_type, is_default, sort_order) VALUES
    ('Новые лиды', 'leads', 'lead', true, 1),
    ('Потенциальные клиенты', 'pk', 'pk', false, 2),
    ('Обзвон КБ', 'kb_calling', 'kb', false, 3),
    ('Рассылки', 'mailings', NULL, false, 4);

-- Этапы воронки "Рассылки"
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'В базе рассылок', 'in_base', '#6B7280', 1, false, false FROM pipelines WHERE code = 'mailings'
UNION ALL
SELECT id, 'Рассылка отправлена', 'sent', '#3B82F6', 2, false, false FROM pipelines WHERE code = 'mailings'
UNION ALL
SELECT id, 'Открыл', 'opened', '#F59E0B', 3, false, false FROM pipelines WHERE code = 'mailings'
UNION ALL
SELECT id, 'Заинтересован', 'interested', '#EC4899', 4, false, false FROM pipelines WHERE code = 'mailings'
UNION ALL
SELECT id, 'Оплатил', 'paid', '#10B981', 5, true, true FROM pipelines WHERE code = 'mailings'
UNION ALL
SELECT id, 'Отписался', 'unsubscribed', '#EF4444', 6, true, false FROM pipelines WHERE code = 'mailings';

CREATE TABLE pipeline_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    color TEXT DEFAULT '#6B7280',
    sort_order INTEGER DEFAULT 0,
    is_final BOOLEAN DEFAULT false,
    is_success BOOLEAN DEFAULT false,
    auto_transition_to TEXT, -- client_type для автоперехода после успеха
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Этапы воронки "Новые лиды"
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success, auto_transition_to) 
SELECT id, 'Новый', 'new', '#3B82F6', 1, false, false, NULL FROM pipelines WHERE code = 'leads'
UNION ALL
SELECT id, 'Взят в работу', 'in_progress', '#8B5CF6', 2, false, false, NULL FROM pipelines WHERE code = 'leads'
UNION ALL
SELECT id, 'Дозвонились', 'reached', '#F59E0B', 3, false, false, NULL FROM pipelines WHERE code = 'leads'
UNION ALL
SELECT id, 'Интерес', 'interested', '#EC4899', 4, false, false, NULL FROM pipelines WHERE code = 'leads'
UNION ALL
SELECT id, 'Оплачено', 'paid', '#10B981', 5, true, true, 'kb' FROM pipelines WHERE code = 'leads'
UNION ALL
SELECT id, 'Отложил', 'postponed', '#6B7280', 6, true, false, 'pk' FROM pipelines WHERE code = 'leads'
UNION ALL
SELECT id, 'Отказ', 'rejected', '#EF4444', 7, true, false, NULL FROM pipelines WHERE code = 'leads';

-- Этапы воронки "ПК"
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success, auto_transition_to)
SELECT id, 'В базе ПК', 'in_base', '#6B7280', 1, false, false, NULL FROM pipelines WHERE code = 'pk'
UNION ALL
SELECT id, 'К обзвону', 'to_call', '#3B82F6', 2, false, false, NULL FROM pipelines WHERE code = 'pk'
UNION ALL
SELECT id, 'Дозвонились', 'reached', '#F59E0B', 3, false, false, NULL FROM pipelines WHERE code = 'pk'
UNION ALL
SELECT id, 'Интерес', 'interested', '#EC4899', 4, false, false, NULL FROM pipelines WHERE code = 'pk'
UNION ALL
SELECT id, 'Оплачено', 'paid', '#10B981', 5, true, true, 'kb' FROM pipelines WHERE code = 'pk'
UNION ALL
SELECT id, 'Отказ', 'rejected', '#EF4444', 6, true, false, NULL FROM pipelines WHERE code = 'pk';

-- Этапы воронки "Обзвон КБ"
INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
SELECT id, 'К обзвону', 'to_call', '#6B7280', 1, false, false FROM pipelines WHERE code = 'kb_calling'
UNION ALL
SELECT id, 'Дозвонились', 'reached', '#3B82F6', 2, false, false FROM pipelines WHERE code = 'kb_calling'
UNION ALL
SELECT id, 'Интерес', 'interested', '#F59E0B', 3, false, false FROM pipelines WHERE code = 'kb_calling'
UNION ALL
SELECT id, 'Оплачено', 'paid', '#10B981', 4, true, true FROM pipelines WHERE code = 'kb_calling'
UNION ALL
SELECT id, 'Не сейчас', 'not_now', '#6B7280', 5, true, false FROM pipelines WHERE code = 'kb_calling'
UNION ALL
SELECT id, 'Отказ', 'rejected', '#EF4444', 6, true, false FROM pipelines WHERE code = 'kb_calling';

-- =============================================
-- 6. СДЕЛКИ
-- =============================================

CREATE TABLE deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Связи
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES managers(id),
    event_id UUID REFERENCES events(id), -- привязка к конкретному событию
    pipeline_id UUID REFERENCES pipelines(id),
    stage_id UUID REFERENCES pipeline_stages(id),
    source_id UUID REFERENCES lead_sources(id),
    
    -- Данные сделки
    title TEXT,
    
    -- Финансы
    tickets_count INTEGER DEFAULT 0,
    amount DECIMAL(12,2) DEFAULT 0, -- "касса"
    discount_percent INTEGER DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    
    -- Статус
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost')),
    lost_reason TEXT,
    
    -- Даты
    next_contact_date TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    
    -- Для недельной отчётности
    report_week_start DATE, -- понедельник недели, к которой относится сделка
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_deals_client ON deals(client_id);
CREATE INDEX idx_deals_manager ON deals(manager_id);
CREATE INDEX idx_deals_event ON deals(event_id);
CREATE INDEX idx_deals_stage ON deals(stage_id);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_report_week ON deals(report_week_start);

-- =============================================
-- 7. ЗВОНКИ (UIS)
-- =============================================

CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Связи
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES managers(id),
    
    -- Данные звонка
    uis_call_id TEXT UNIQUE,
    direction TEXT CHECK (direction IN ('inbound', 'outbound')),
    phone TEXT NOT NULL,
    phone_normalized TEXT,
    
    -- Время
    started_at TIMESTAMPTZ NOT NULL,
    answered_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER DEFAULT 0,
    wait_seconds INTEGER DEFAULT 0,
    
    -- Статус
    status TEXT CHECK (status IN ('answered', 'missed', 'busy', 'failed', 'voicemail')),
    
    -- Запись
    record_url TEXT,
    
    -- Результат (заполняет менеджер)
    result TEXT,
    notes TEXT,
    
    -- Для отчётности
    report_date DATE, -- дата для статистики (выходные → понедельник)
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calls_client ON calls(client_id);
CREATE INDEX idx_calls_phone ON calls(phone_normalized);
CREATE INDEX idx_calls_manager ON calls(manager_id);
CREATE INDEX idx_calls_date ON calls(started_at);
CREATE INDEX idx_calls_report_date ON calls(report_date);

-- =============================================
-- 8. СООБЩЕНИЯ (Мессенджеры)
-- =============================================

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Связи
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    manager_id UUID REFERENCES managers(id), -- кто отвечал
    deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    
    -- Канал
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'telegram', 'vk', 'sms')),
    
    -- Направление
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    
    -- Данные сообщения
    external_id TEXT, -- ID в мессенджере
    content TEXT,
    content_type TEXT DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'video', 'audio', 'document', 'location', 'sticker')),
    media_url TEXT,
    
    -- Статус доставки (для исходящих)
    delivery_status TEXT CHECK (delivery_status IN ('sent', 'delivered', 'read', 'failed')),
    
    -- ИИ анализ
    ai_sentiment TEXT CHECK (ai_sentiment IN ('positive', 'neutral', 'negative')),
    ai_intent TEXT, -- что хочет клиент
    ai_suggested_reply TEXT, -- предложенный ответ
    
    -- Шаблон (если использовался)
    template_id UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_client ON messages(client_id);
CREATE INDEX idx_messages_channel ON messages(channel);
CREATE INDEX idx_messages_date ON messages(created_at);

-- Шаблоны сообщений
CREATE TABLE message_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    name TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'telegram', 'vk', 'sms', 'all')),
    category TEXT, -- 'greeting', 'reminder', 'promo', 'followup'
    
    -- Контент
    content TEXT NOT NULL,
    variables TEXT[], -- ['client_name', 'show_name', 'date', 'city']
    
    -- WABA (для WhatsApp)
    waba_template_name TEXT,
    waba_template_status TEXT,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 9. ЗАДАЧИ
-- =============================================

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Связи
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES managers(id),
    created_by UUID REFERENCES managers(id),
    
    -- Данные задачи
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT DEFAULT 'call' CHECK (task_type IN ('call', 'message', 'meeting', 'other')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- Время
    due_date TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    
    -- Статус
    is_completed BOOLEAN DEFAULT false,
    
    -- Автозадача (создана системой)
    is_auto BOOLEAN DEFAULT false,
    auto_source TEXT, -- 'event_kb_calling', 'callback', etc
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tasks_manager ON tasks(manager_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_completed ON tasks(is_completed);

-- =============================================
-- 10. АКТИВНОСТЬ / ИСТОРИЯ
-- =============================================

CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Связи
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
    manager_id UUID REFERENCES managers(id),
    call_id UUID REFERENCES calls(id) ON DELETE SET NULL,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    
    -- Тип
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'note',
        'call_inbound',
        'call_outbound',
        'message_inbound',
        'message_outbound',
        'stage_change',
        'type_change',      -- смена типа клиента (Лид → ПК → КБ)
        'deal_created',
        'deal_won',
        'deal_lost',
        'task_created',
        'task_completed',
        'client_created',
        'manager_assigned'
    )),
    
    -- Данные
    content TEXT,
    metadata JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activities_client ON activities(client_id);
CREATE INDEX idx_activities_deal ON activities(deal_id);
CREATE INDEX idx_activities_date ON activities(created_at);
CREATE INDEX idx_activities_type ON activities(activity_type);

-- =============================================
-- 11. АНАЛИТИКА (материализованные данные)
-- =============================================

-- Статистика менеджера по дням
CREATE TABLE manager_daily_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_id UUID REFERENCES managers(id) ON DELETE CASCADE,
    stat_date DATE NOT NULL,
    
    -- Звонки
    calls_total INTEGER DEFAULT 0,
    calls_answered INTEGER DEFAULT 0,
    calls_duration_total INTEGER DEFAULT 0, -- секунды
    
    -- Сделки
    deals_created INTEGER DEFAULT 0,
    deals_won INTEGER DEFAULT 0,
    deals_lost INTEGER DEFAULT 0,
    
    -- Касса
    revenue DECIMAL(12,2) DEFAULT 0,
    tickets_sold INTEGER DEFAULT 0,
    
    -- Сообщения
    messages_sent INTEGER DEFAULT 0,
    messages_received INTEGER DEFAULT 0,
    
    -- Задачи
    tasks_completed INTEGER DEFAULT 0,
    tasks_overdue INTEGER DEFAULT 0,
    
    -- Конверсии (%)
    conversion_lead_to_deal DECIMAL(5,2),
    conversion_deal_to_sale DECIMAL(5,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(manager_id, stat_date)
);

CREATE INDEX idx_manager_stats_date ON manager_daily_stats(stat_date);

-- Статистика по источникам
CREATE TABLE source_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_id UUID REFERENCES lead_sources(id) ON DELETE CASCADE,
    stat_date DATE NOT NULL,
    
    leads_count INTEGER DEFAULT 0,
    deals_count INTEGER DEFAULT 0,
    won_count INTEGER DEFAULT 0,
    revenue DECIMAL(12,2) DEFAULT 0,
    
    -- Конверсии
    conversion_to_deal DECIMAL(5,2),
    conversion_to_sale DECIMAL(5,2),
    
    -- Стоимость (если известна)
    ad_spend DECIMAL(12,2),
    cost_per_lead DECIMAL(10,2),
    roi DECIMAL(10,2),
    
    UNIQUE(source_id, stat_date)
);

-- =============================================
-- 12. ФУНКЦИИ И ТРИГГЕРЫ
-- =============================================

-- Нормализация телефона
CREATE OR REPLACE FUNCTION normalize_phone(phone TEXT)
RETURNS TEXT AS $$
BEGIN
    IF phone IS NULL THEN RETURN NULL; END IF;
    RETURN regexp_replace(phone, '[^0-9]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Триггер нормализации телефона клиента
CREATE OR REPLACE FUNCTION update_client_phone_normalized()
RETURNS TRIGGER AS $$
BEGIN
    NEW.phone_normalized := normalize_phone(NEW.phone);
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_clients_phone_normalized
    BEFORE INSERT OR UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_client_phone_normalized();

-- Расчёт report_date (выходные → понедельник)
CREATE OR REPLACE FUNCTION calc_report_date(input_date TIMESTAMPTZ)
RETURNS DATE AS $$
DECLARE
    d DATE := input_date::DATE;
    dow INTEGER := EXTRACT(DOW FROM d);
BEGIN
    -- 0 = воскресенье, 6 = суббота
    IF dow = 0 THEN
        RETURN d + 1; -- воскресенье → понедельник
    ELSIF dow = 6 THEN
        RETURN d + 2; -- суббота → понедельник
    ELSE
        RETURN d;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Триггер для calls.report_date
CREATE OR REPLACE FUNCTION set_call_report_date()
RETURNS TRIGGER AS $$
BEGIN
    NEW.report_date := calc_report_date(NEW.started_at);
    NEW.phone_normalized := normalize_phone(NEW.phone);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_calls_report_date
    BEFORE INSERT OR UPDATE ON calls
    FOR EACH ROW
    EXECUTE FUNCTION set_call_report_date();

-- Расчёт report_week_start (понедельник недели)
CREATE OR REPLACE FUNCTION calc_week_start(input_date DATE)
RETURNS DATE AS $$
BEGIN
    RETURN date_trunc('week', input_date)::DATE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Триггер для deals.report_week_start
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

CREATE TRIGGER tr_deals_report_week
    BEFORE INSERT OR UPDATE ON deals
    FOR EACH ROW
    EXECUTE FUNCTION set_deal_report_week();

-- Автоперевод клиента в КБ после успешной сделки
CREATE OR REPLACE FUNCTION auto_upgrade_client_type()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'won' AND OLD.status != 'won' THEN
        -- Обновляем клиента
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
        
        -- Логируем изменение типа
        IF EXISTS (SELECT 1 FROM clients WHERE id = NEW.client_id AND client_type != 'kb') THEN
            INSERT INTO activities (client_id, deal_id, manager_id, activity_type, content)
            VALUES (NEW.client_id, NEW.id, NEW.manager_id, 'type_change', 'Клиент переведён в КБ после покупки');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_deals_upgrade_client
    AFTER UPDATE ON deals
    FOR EACH ROW
    EXECUTE FUNCTION auto_upgrade_client_type();

-- Поиск дубликата по телефону
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

-- Обновление last_activity_at при активности
CREATE OR REPLACE FUNCTION update_client_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE clients 
    SET last_activity_at = NOW(), updated_at = NOW()
    WHERE id = NEW.client_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для обновления последней активности
CREATE TRIGGER tr_calls_update_client_activity
    AFTER INSERT ON calls
    FOR EACH ROW
    WHEN (NEW.client_id IS NOT NULL)
    EXECUTE FUNCTION update_client_last_activity();

CREATE TRIGGER tr_messages_update_client_activity
    AFTER INSERT ON messages
    FOR EACH ROW
    WHEN (NEW.client_id IS NOT NULL)
    EXECUTE FUNCTION update_client_last_activity();

CREATE TRIGGER tr_activities_update_client_activity
    AFTER INSERT ON activities
    FOR EACH ROW
    WHEN (NEW.client_id IS NOT NULL)
    EXECUTE FUNCTION update_client_last_activity();

-- Функция добавления точки отказа и проверки VIP
CREATE OR REPLACE FUNCTION add_rejection_point(p_client_id UUID, p_city_name TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    v_client clients%ROWTYPE;
    v_city_name TEXT;
    v_vip_tag_id UUID;
    v_mailings_pipeline_id UUID;
    v_mailings_stage_id UUID;
BEGIN
    -- Получаем клиента
    SELECT * INTO v_client FROM clients WHERE id = p_client_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Client not found');
    END IF;
    
    -- Получаем название города
    IF p_city_name IS NOT NULL THEN
        v_city_name := p_city_name;
    ELSE
        SELECT name INTO v_city_name FROM cities WHERE id = v_client.city_id;
    END IF;
    
    -- Увеличиваем точки отказа
    UPDATE clients SET rejection_points = rejection_points + 1 WHERE id = p_client_id;
    
    -- Если клиент уже VIP и у него 3 точки - переводим в рассылки
    IF v_client.status = 'vip' AND v_client.rejection_points >= 2 THEN
        -- Получаем воронку рассылок
        SELECT id INTO v_mailings_pipeline_id FROM pipelines WHERE code = 'mailings';
        SELECT id INTO v_mailings_stage_id FROM pipeline_stages 
            WHERE pipeline_id = v_mailings_pipeline_id AND code = 'in_base' LIMIT 1;
        
        -- Создаём сделку в воронке рассылок
        IF v_mailings_pipeline_id IS NOT NULL AND v_mailings_stage_id IS NOT NULL THEN
            INSERT INTO deals (client_id, pipeline_id, stage_id, title, status)
            VALUES (p_client_id, v_mailings_pipeline_id, v_mailings_stage_id, 'Автоперенос из VIP', 'active');
        END IF;
        
        RETURN jsonb_build_object('success', true, 'action', 'moved_to_mailings');
    END IF;
    
    -- Если накопилось 5 точек - переводим в VIP
    IF v_client.rejection_points >= 4 THEN
        -- Удаляем все теги кроме VIP
        DELETE FROM client_tags WHERE client_id = p_client_id 
            AND tag_id NOT IN (SELECT id FROM tags WHERE category = 'vip');
        
        -- Создаём или находим VIP тег для города
        INSERT INTO tags (name, color, category, city_id, is_auto)
        VALUES ('VIP ' || COALESCE(v_city_name, 'Общий'), '#FFD700', 'vip', v_client.city_id, true)
        ON CONFLICT (name, category) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_vip_tag_id;
        
        -- Привязываем VIP тег
        INSERT INTO client_tags (client_id, tag_id) 
        VALUES (p_client_id, v_vip_tag_id)
        ON CONFLICT DO NOTHING;
        
        -- Обновляем статус и сбрасываем точки до 3
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

-- Сброс точек отказа при покупке
CREATE OR REPLACE FUNCTION reset_rejection_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'won' AND OLD.status != 'won' THEN
        UPDATE clients SET rejection_points = 0 WHERE id = NEW.client_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_deals_reset_rejection
    AFTER UPDATE ON deals
    FOR EACH ROW
    EXECUTE FUNCTION reset_rejection_on_purchase();

-- Автотег спектакля при создании сделки
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
    
    -- Получаем данные события
    SELECT * INTO v_event FROM events WHERE id = NEW.event_id;
    IF NOT FOUND THEN RETURN NEW; END IF;
    
    SELECT * INTO v_show FROM shows WHERE id = v_event.show_id;
    SELECT * INTO v_city FROM cities WHERE id = v_event.city_id;
    
    -- Формируем название тега
    v_tag_name := v_show.title || ' (' || v_city.name || ', ' || to_char(v_event.event_date, 'DD.MM') || ')';
    
    -- Создаём или находим тег
    INSERT INTO tags (name, color, category, event_id, is_auto)
    VALUES (v_tag_name, '#3B82F6', 'event', NEW.event_id, true)
    ON CONFLICT (name, category) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_tag_id;
    
    -- Привязываем тег к клиенту
    IF NEW.client_id IS NOT NULL THEN
        INSERT INTO client_tags (client_id, tag_id)
        VALUES (NEW.client_id, v_tag_id)
        ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_deals_create_event_tag
    AFTER INSERT ON deals
    FOR EACH ROW
    EXECUTE FUNCTION create_event_tag_on_deal();

-- Удаление тегов прошедших спектаклей
CREATE OR REPLACE FUNCTION remove_past_event_tags()
RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    -- Удаляем связи с тегами прошедших событий
    DELETE FROM client_tags 
    WHERE tag_id IN (
        SELECT t.id FROM tags t
        JOIN events e ON t.event_id = e.id
        WHERE e.event_date < CURRENT_DATE AND t.category = 'event'
    );
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    
    -- Можно также удалить сами теги
    DELETE FROM tags 
    WHERE category = 'event' 
    AND event_id IN (SELECT id FROM events WHERE event_date < CURRENT_DATE - INTERVAL '7 days');
    
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- Функция распределения лида по правилам
CREATE OR REPLACE FUNCTION get_manager_for_lead(p_city_id UUID, p_event_id UUID DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
    v_manager_id UUID;
BEGIN
    -- Ищем правило: сначала с конкретным событием, потом только по городу
    SELECT manager_id INTO v_manager_id
    FROM lead_routing_rules
    WHERE is_active = true
        AND city_id = p_city_id
        AND (event_id = p_event_id OR (p_event_id IS NULL AND event_id IS NULL))
        AND (valid_from IS NULL OR valid_from <= CURRENT_DATE)
        AND (valid_to IS NULL OR valid_to >= CURRENT_DATE)
    ORDER BY 
        CASE WHEN event_id IS NOT NULL THEN 0 ELSE 1 END, -- сначала правила с событием
        priority DESC
    LIMIT 1;
    
    RETURN v_manager_id;
END;
$$ LANGUAGE plpgsql;

-- Функция объединения дубликатов
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
    
    -- Переносим сделки
    UPDATE deals SET client_id = p_main_id WHERE client_id = p_duplicate_id;
    
    -- Переносим звонки
    UPDATE calls SET client_id = p_main_id WHERE client_id = p_duplicate_id;
    
    -- Переносим сообщения
    UPDATE messages SET client_id = p_main_id WHERE client_id = p_duplicate_id;
    
    -- Переносим задачи
    UPDATE tasks SET client_id = p_main_id WHERE client_id = p_duplicate_id;
    
    -- Переносим активности
    UPDATE activities SET client_id = p_main_id WHERE client_id = p_duplicate_id;
    
    -- Переносим теги (игнорируем дубликаты)
    INSERT INTO client_tags (client_id, tag_id, created_at)
    SELECT p_main_id, tag_id, created_at FROM client_tags WHERE client_id = p_duplicate_id
    ON CONFLICT DO NOTHING;
    
    -- Переносим пичинги
    INSERT INTO client_pitches (client_id, event_id, manager_id, created_at)
    SELECT p_main_id, event_id, manager_id, created_at FROM client_pitches WHERE client_id = p_duplicate_id
    ON CONFLICT DO NOTHING;
    
    -- Обновляем статистику основного клиента
    UPDATE clients SET
        total_purchases = v_main.total_purchases + v_duplicate.total_purchases,
        total_revenue = v_main.total_revenue + v_duplicate.total_revenue,
        first_purchase_date = LEAST(v_main.first_purchase_date, v_duplicate.first_purchase_date),
        last_purchase_date = GREATEST(v_main.last_purchase_date, v_duplicate.last_purchase_date),
        -- Берём лучший тип клиента
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
    
    -- Удаляем дубликат
    DELETE FROM clients WHERE id = p_duplicate_id;
    
    RETURN jsonb_build_object('success', true, 'merged_into', p_main_id);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 13. ROW LEVEL SECURITY
-- =============================================

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Базовые политики (открытый доступ для авторизованных)
CREATE POLICY "Allow all for authenticated" ON clients FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON deals FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON calls FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON messages FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON tasks FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON activities FOR ALL USING (true);

-- =============================================
-- 14. ТЕГИ КЛИЕНТОВ
-- =============================================

-- Таблица тегов
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6B7280',
    category TEXT CHECK (category IN ('event', 'status', 'custom', 'vip')), -- тип тега
    is_auto BOOLEAN DEFAULT false, -- автоматически создан
    event_id UUID REFERENCES events(id) ON DELETE SET NULL, -- для автотегов спектаклей
    city_id UUID REFERENCES cities(id) ON DELETE SET NULL, -- для VIP тегов с городом
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(name, category)
);

-- Связь клиент-тег
CREATE TABLE client_tags (
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES managers(id),
    PRIMARY KEY (client_id, tag_id)
);

CREATE INDEX idx_client_tags_client ON client_tags(client_id);
CREATE INDEX idx_client_tags_tag ON client_tags(tag_id);
CREATE INDEX idx_tags_category ON tags(category);
CREATE INDEX idx_tags_event ON tags(event_id);

-- =============================================
-- 15. СИСТЕМА ОТМЕТОК ПИЧИНГА
-- =============================================

-- Отметки "на какой спектакль пичил"
CREATE TABLE client_pitches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    manager_id UUID REFERENCES managers(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(client_id, event_id)
);

CREATE INDEX idx_client_pitches_client ON client_pitches(client_id);
CREATE INDEX idx_client_pitches_event ON client_pitches(event_id);

-- =============================================
-- 16. ПРАВИЛА РАСПРЕДЕЛЕНИЯ ЛИДОВ
-- =============================================

CREATE TABLE lead_routing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES managers(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0, -- чем выше, тем приоритетнее
    valid_from DATE, -- период действия правила
    valid_to DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_routing_rules_city ON lead_routing_rules(city_id);
CREATE INDEX idx_routing_rules_event ON lead_routing_rules(event_id);
CREATE INDEX idx_routing_rules_manager ON lead_routing_rules(manager_id);

-- =============================================
-- 17. НАПОМИНАНИЯ КЛИЕНТАМ
-- =============================================

CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE INDEX idx_reminders_client ON reminders(client_id);
CREATE INDEX idx_reminders_event ON reminders(event_id);
CREATE INDEX idx_reminders_status ON reminders(status);
CREATE INDEX idx_reminders_remind_at ON reminders(remind_at);

-- =============================================
-- 18. VIEWS для аналитики
-- =============================================

-- Недельная статистика менеджера
CREATE OR REPLACE VIEW manager_weekly_stats AS
SELECT 
    m.id as manager_id,
    m.full_name,
    calc_week_start(CURRENT_DATE) as week_start,
    
    -- Звонки за неделю
    COUNT(DISTINCT c.id) FILTER (WHERE c.report_date >= calc_week_start(CURRENT_DATE)) as calls_total,
    COUNT(DISTINCT c.id) FILTER (WHERE c.report_date >= calc_week_start(CURRENT_DATE) AND c.status = 'answered') as calls_answered,
    
    -- Сделки за неделю
    COUNT(DISTINCT d.id) FILTER (WHERE d.report_week_start = calc_week_start(CURRENT_DATE) AND d.status = 'won') as deals_won,
    COALESCE(SUM(d.amount) FILTER (WHERE d.report_week_start = calc_week_start(CURRENT_DATE) AND d.status = 'won'), 0) as revenue,
    
    -- Цели
    m.weekly_calls_target,
    m.weekly_sales_target,
    
    -- % выполнения
    ROUND(COUNT(DISTINCT c.id) FILTER (WHERE c.report_date >= calc_week_start(CURRENT_DATE))::DECIMAL / NULLIF(m.weekly_calls_target, 0) * 100, 1) as calls_progress,
    ROUND(COALESCE(SUM(d.amount) FILTER (WHERE d.report_week_start = calc_week_start(CURRENT_DATE) AND d.status = 'won'), 0) / NULLIF(m.weekly_sales_target, 0) * 100, 1) as sales_progress
    
FROM managers m
LEFT JOIN calls c ON c.manager_id = m.id
LEFT JOIN deals d ON d.manager_id = m.id
WHERE m.is_active = true
GROUP BY m.id, m.full_name, m.weekly_calls_target, m.weekly_sales_target;

-- Конверсия воронки
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
