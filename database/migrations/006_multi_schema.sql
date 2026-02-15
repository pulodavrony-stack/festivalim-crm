-- =============================================
-- MULTI-SCHEMA: Физическая изоляция команд
-- Команды: Кстати театр (kstati), ТФ Атлант (atlant), ТФ Этажи (etazhi)
-- =============================================

-- ===========================================
-- 1. ТАБЛИЦА TEAMS В PUBLIC СХЕМЕ
-- ===========================================
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    schema_name TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    
    -- Телефония UIS
    uis_api_key TEXT,
    uis_virtual_number TEXT,
    webrtc_token TEXT,
    
    -- Юридическое лицо
    legal_name TEXT,
    inn TEXT,
    kpp TEXT,
    ogrn TEXT,
    legal_address TEXT,
    bank_name TEXT,
    bank_bik TEXT,
    bank_account TEXT,
    correspondent_account TEXT,
    
    -- Каналы продаж и интеграции
    sales_channels JSONB DEFAULT '[]',        -- ["tilda", "site", "telegram", "instagram", "vk", "avito"]
    tilda_project_id TEXT,                    -- ID проекта в Tilda
    tilda_api_key TEXT,                       -- API ключ Tilda
    telegram_bot_token TEXT,                  -- Telegram бот для уведомлений
    telegram_channel_id TEXT,                 -- ID канала для постов
    whatsapp_business_id TEXT,                -- WhatsApp Business API
    whatsapp_api_token TEXT,
    instagram_account TEXT,                   -- @username
    vk_group_id TEXT,                         -- ID группы ВК
    
    -- Статистика (обновляется триггерами/cron)
    total_clients INTEGER DEFAULT 0,
    total_deals INTEGER DEFAULT 0,
    total_revenue DECIMAL(14,2) DEFAULT 0,
    total_tickets_sold INTEGER DEFAULT 0,
    stats_updated_at TIMESTAMPTZ,
    
    -- Настройки
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Вставляем 3 команды
INSERT INTO public.teams (name, slug, schema_name) VALUES
    ('Кстати театр', 'kstati', 'kstati'),
    ('ТФ Атлант', 'atlant', 'atlant'),
    ('ТФ Этажи', 'etazhi', 'etazhi')
ON CONFLICT (slug) DO NOTHING;

-- ===========================================
-- 2. ОБНОВЛЯЕМ MANAGERS В PUBLIC
-- ===========================================
ALTER TABLE public.managers ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id);
ALTER TABLE public.managers ADD COLUMN IF NOT EXISTS can_switch_teams BOOLEAN DEFAULT false;

-- Назначаем всех существующих менеджеров в команду "ТФ Атлант" по умолчанию
UPDATE public.managers 
SET team_id = (SELECT id FROM public.teams WHERE slug = 'atlant')
WHERE team_id IS NULL;

-- ===========================================
-- 3. СОЗДАЁМ СХЕМЫ
-- ===========================================
CREATE SCHEMA IF NOT EXISTS kstati;
CREATE SCHEMA IF NOT EXISTS atlant;
CREATE SCHEMA IF NOT EXISTS etazhi;

-- ===========================================
-- 4. ФУНКЦИЯ СОЗДАНИЯ ВСЕХ ТАБЛИЦ В СХЕМЕ
-- ===========================================
CREATE OR REPLACE FUNCTION create_team_schema_tables(p_schema TEXT)
RETURNS void AS $$
BEGIN
    -- =============== СПРАВОЧНИКИ ===============
    
    -- Города
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.cities (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            region TEXT,
            timezone TEXT DEFAULT ''Europe/Moscow'',
            is_active BOOLEAN DEFAULT true,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )', p_schema);
    
    -- Жанры
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.genres (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            icon TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )', p_schema);
    
    -- Источники лидов
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.lead_sources (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            code TEXT UNIQUE,
            source_type TEXT,
            tilda_page_id TEXT,
            landing_url TEXT,
            default_utm_source TEXT,
            default_utm_medium TEXT,
            default_utm_campaign TEXT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )', p_schema);
    
    -- Спектакли
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.shows (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title TEXT NOT NULL,
            description TEXT,
            duration_minutes INTEGER,
            age_restriction TEXT,
            genre_ids UUID[],
            poster_url TEXT,
            trailer_url TEXT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )', p_schema);
    
    -- События
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.events (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            show_id UUID REFERENCES %I.shows(id) ON DELETE SET NULL,
            city_id UUID REFERENCES %I.cities(id) ON DELETE SET NULL,
            event_date DATE NOT NULL,
            event_time TIME,
            venue_name TEXT,
            venue_address TEXT,
            landing_source_id UUID REFERENCES %I.lead_sources(id) ON DELETE SET NULL,
            landing_url TEXT,
            total_tickets INTEGER,
            sold_tickets INTEGER DEFAULT 0,
            min_price DECIMAL(12,2),
            max_price DECIMAL(12,2),
            status TEXT DEFAULT ''planned'' CHECK (status IN (''planned'', ''on_sale'', ''sold_out'', ''completed'', ''cancelled'')),
            sales_start_date DATE,
            sales_end_date DATE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )', p_schema, p_schema, p_schema, p_schema);
    
    -- =============== КЛИЕНТЫ ===============
    
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.clients (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            full_name TEXT NOT NULL,
            phone TEXT,
            phone_normalized TEXT,
            email TEXT,
            city_id UUID REFERENCES %I.cities(id) ON DELETE SET NULL,
            
            client_type TEXT DEFAULT ''lead'' CHECK (client_type IN (''lead'', ''pk'', ''kb'')),
            status TEXT DEFAULT ''new'',
            
            preferred_genres UUID[],
            preferred_price_range TEXT,
            survey_answers JSONB DEFAULT ''{}'',
            
            telegram_id BIGINT,
            telegram_username TEXT,
            telegram_chat_id BIGINT,
            whatsapp_phone TEXT,
            whatsapp_id TEXT,
            vk_id BIGINT,
            
            source_id UUID REFERENCES %I.lead_sources(id) ON DELETE SET NULL,
            utm_source TEXT,
            utm_medium TEXT,
            utm_campaign TEXT,
            utm_content TEXT,
            
            manager_id UUID REFERENCES public.managers(id) ON DELETE SET NULL,
            
            total_purchases INTEGER DEFAULT 0,
            total_revenue DECIMAL(12,2) DEFAULT 0,
            first_purchase_date DATE,
            last_purchase_date DATE,
            last_contact_date TIMESTAMPTZ,
            
            became_pk_at TIMESTAMPTZ,
            became_kb_at TIMESTAMPTZ,
            
            notes TEXT,
            rejection_points INTEGER DEFAULT 0,
            last_activity_at TIMESTAMPTZ,
            
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )', p_schema, p_schema, p_schema);
    
    -- =============== ВОРОНКИ ===============
    
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.pipelines (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            code TEXT UNIQUE NOT NULL,
            client_type TEXT,
            is_default BOOLEAN DEFAULT false,
            sort_order INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )', p_schema);
    
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.pipeline_stages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            pipeline_id UUID REFERENCES %I.pipelines(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            code TEXT NOT NULL,
            color TEXT DEFAULT ''#6B7280'',
            sort_order INTEGER DEFAULT 0,
            is_final BOOLEAN DEFAULT false,
            is_success BOOLEAN DEFAULT false,
            auto_transition_to TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )', p_schema, p_schema);
    
    -- =============== СДЕЛКИ ===============
    
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.deals (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_id UUID REFERENCES %I.clients(id) ON DELETE CASCADE,
            manager_id UUID REFERENCES public.managers(id) ON DELETE SET NULL,
            event_id UUID REFERENCES %I.events(id) ON DELETE SET NULL,
            pipeline_id UUID REFERENCES %I.pipelines(id) ON DELETE SET NULL,
            stage_id UUID REFERENCES %I.pipeline_stages(id) ON DELETE SET NULL,
            source_id UUID REFERENCES %I.lead_sources(id) ON DELETE SET NULL,
            
            title TEXT,
            tickets_count INTEGER DEFAULT 0,
            amount DECIMAL(12,2) DEFAULT 0,
            discount_percent DECIMAL(5,2) DEFAULT 0,
            discount_amount DECIMAL(12,2) DEFAULT 0,
            status TEXT DEFAULT ''active'' CHECK (status IN (''active'', ''won'', ''lost'')),
            lost_reason TEXT,
            next_contact_date DATE,
            closed_at TIMESTAMPTZ,
            report_week_start DATE,
            
            company_id UUID,
            contact_id UUID,
            contract_id UUID,
            is_b2b BOOLEAN DEFAULT false,
            
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )', p_schema, p_schema, p_schema, p_schema, p_schema, p_schema);
    
    -- =============== ЗВОНКИ ===============
    
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.calls (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_id UUID REFERENCES %I.clients(id) ON DELETE CASCADE,
            deal_id UUID REFERENCES %I.deals(id) ON DELETE SET NULL,
            manager_id UUID REFERENCES public.managers(id) ON DELETE SET NULL,
            
            uis_call_id TEXT,
            direction TEXT CHECK (direction IN (''inbound'', ''outbound'')),
            phone TEXT,
            phone_normalized TEXT,
            started_at TIMESTAMPTZ DEFAULT NOW(),
            answered_at TIMESTAMPTZ,
            ended_at TIMESTAMPTZ,
            duration_seconds INTEGER DEFAULT 0,
            wait_seconds INTEGER DEFAULT 0,
            status TEXT DEFAULT ''answered'',
            record_url TEXT,
            result TEXT,
            notes TEXT,
            report_date DATE,
            
            created_at TIMESTAMPTZ DEFAULT NOW()
        )', p_schema, p_schema, p_schema);
    
    -- =============== СООБЩЕНИЯ ===============
    
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_id UUID REFERENCES %I.clients(id) ON DELETE CASCADE,
            manager_id UUID REFERENCES public.managers(id) ON DELETE SET NULL,
            deal_id UUID REFERENCES %I.deals(id) ON DELETE SET NULL,
            
            channel TEXT CHECK (channel IN (''whatsapp'', ''telegram'', ''vk'', ''sms'')),
            direction TEXT CHECK (direction IN (''incoming'', ''outgoing'')),
            external_id TEXT,
            content TEXT,
            content_type TEXT DEFAULT ''text'',
            media_url TEXT,
            delivery_status TEXT,
            
            status TEXT DEFAULT ''sent'',
            metadata JSONB DEFAULT ''{}'',
            
            created_at TIMESTAMPTZ DEFAULT NOW(),
            read_at TIMESTAMPTZ
        )', p_schema, p_schema, p_schema);
    
    -- =============== ЗАДАЧИ ===============
    
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.tasks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_id UUID REFERENCES %I.clients(id) ON DELETE CASCADE,
            deal_id UUID REFERENCES %I.deals(id) ON DELETE SET NULL,
            event_id UUID REFERENCES %I.events(id) ON DELETE SET NULL,
            manager_id UUID REFERENCES public.managers(id) ON DELETE SET NULL,
            created_by UUID REFERENCES public.managers(id) ON DELETE SET NULL,
            
            title TEXT NOT NULL,
            description TEXT,
            task_type TEXT DEFAULT ''call'',
            priority TEXT DEFAULT ''normal'',
            due_date DATE,
            due_time TIME,
            completed_at TIMESTAMPTZ,
            status TEXT DEFAULT ''pending'',
            is_completed BOOLEAN DEFAULT false,
            is_auto BOOLEAN DEFAULT false,
            auto_source TEXT,
            
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )', p_schema, p_schema, p_schema, p_schema);
    
    -- =============== АКТИВНОСТИ ===============
    
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.activities (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_id UUID REFERENCES %I.clients(id) ON DELETE CASCADE,
            deal_id UUID REFERENCES %I.deals(id) ON DELETE SET NULL,
            manager_id UUID REFERENCES public.managers(id) ON DELETE SET NULL,
            call_id UUID REFERENCES %I.calls(id) ON DELETE SET NULL,
            message_id UUID REFERENCES %I.messages(id) ON DELETE SET NULL,
            
            activity_type TEXT NOT NULL,
            content TEXT,
            metadata JSONB DEFAULT ''{}'',
            
            created_at TIMESTAMPTZ DEFAULT NOW()
        )', p_schema, p_schema, p_schema, p_schema, p_schema);
    
    -- =============== ТЕГИ ===============
    
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.tags (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            color TEXT DEFAULT ''#6B7280'',
            category TEXT CHECK (category IN (''event'', ''status'', ''custom'', ''vip'')),
            is_auto BOOLEAN DEFAULT false,
            event_id UUID REFERENCES %I.events(id) ON DELETE SET NULL,
            city_id UUID REFERENCES %I.cities(id) ON DELETE SET NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(name, category)
        )', p_schema, p_schema, p_schema);
    
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.client_tags (
            client_id UUID REFERENCES %I.clients(id) ON DELETE CASCADE,
            tag_id UUID REFERENCES %I.tags(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            created_by UUID REFERENCES public.managers(id),
            PRIMARY KEY (client_id, tag_id)
        )', p_schema, p_schema, p_schema);
    
    -- =============== ПИЧИНГ ===============
    
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.client_pitches (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_id UUID REFERENCES %I.clients(id) ON DELETE CASCADE,
            event_id UUID REFERENCES %I.events(id) ON DELETE CASCADE,
            manager_id UUID REFERENCES public.managers(id),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(client_id, event_id)
        )', p_schema, p_schema, p_schema);
    
    -- =============== РАСПРЕДЕЛЕНИЕ ЛИДОВ ===============
    
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.lead_routing_rules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            city_id UUID REFERENCES %I.cities(id) ON DELETE CASCADE,
            event_id UUID REFERENCES %I.events(id) ON DELETE SET NULL,
            manager_id UUID REFERENCES public.managers(id) ON DELETE CASCADE,
            is_active BOOLEAN DEFAULT true,
            priority INTEGER DEFAULT 0,
            valid_from DATE,
            valid_to DATE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )', p_schema, p_schema, p_schema);
    
    -- =============== НАПОМИНАНИЯ ===============
    
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.reminders (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_id UUID REFERENCES %I.clients(id) ON DELETE CASCADE,
            event_id UUID REFERENCES %I.events(id) ON DELETE CASCADE,
            remind_at TIMESTAMPTZ NOT NULL,
            channel TEXT,
            message_template_id UUID,
            status TEXT DEFAULT ''pending'',
            sent_at TIMESTAMPTZ,
            error_message TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )', p_schema, p_schema, p_schema);
    
    -- =============== АВТОМАТИЗАЦИИ ЭТАПОВ ===============
    
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.stage_automations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            stage_id UUID REFERENCES %I.pipeline_stages(id) ON DELETE CASCADE,
            action_type TEXT NOT NULL,
            action_config JSONB NOT NULL DEFAULT ''{}'',
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )', p_schema, p_schema);
    
    -- =============== B2B: КОМПАНИИ ===============
    
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.companies (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            legal_name TEXT,
            short_name TEXT,
            company_type TEXT DEFAULT ''corp'',
            inn TEXT,
            kpp TEXT,
            ogrn TEXT,
            legal_address TEXT,
            actual_address TEXT,
            bank_name TEXT,
            bank_account TEXT,
            correspondent_account TEXT,
            bik TEXT,
            phone TEXT,
            email TEXT,
            website TEXT,
            city_id UUID REFERENCES %I.cities(id) ON DELETE SET NULL,
            status TEXT DEFAULT ''active'',
            manager_id UUID REFERENCES public.managers(id) ON DELETE SET NULL,
            total_contracts INTEGER DEFAULT 0,
            total_revenue DECIMAL(12,2) DEFAULT 0,
            first_contract_date DATE,
            last_contract_date DATE,
            payment_terms TEXT,
            payment_delay_days INTEGER DEFAULT 0,
            discount_percent DECIMAL(5,2) DEFAULT 0,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )', p_schema, p_schema);
    
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.company_contacts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id UUID REFERENCES %I.companies(id) ON DELETE CASCADE,
            full_name TEXT NOT NULL,
            position TEXT,
            phone TEXT,
            email TEXT,
            is_primary BOOLEAN DEFAULT false,
            is_decision_maker BOOLEAN DEFAULT false,
            client_id UUID REFERENCES %I.clients(id) ON DELETE SET NULL,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )', p_schema, p_schema, p_schema);
    
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.contracts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id UUID REFERENCES %I.companies(id) ON DELETE CASCADE,
            contact_id UUID REFERENCES %I.company_contacts(id) ON DELETE SET NULL,
            manager_id UUID REFERENCES public.managers(id) ON DELETE SET NULL,
            contract_number TEXT NOT NULL,
            contract_date DATE NOT NULL,
            valid_from DATE,
            valid_to DATE,
            subject TEXT,
            event_id UUID REFERENCES %I.events(id) ON DELETE SET NULL,
            total_amount DECIMAL(12,2) NOT NULL,
            discount_percent DECIMAL(5,2) DEFAULT 0,
            discount_amount DECIMAL(12,2) DEFAULT 0,
            final_amount DECIMAL(12,2) NOT NULL,
            payment_terms TEXT,
            payment_status TEXT DEFAULT ''pending'',
            paid_amount DECIMAL(12,2) DEFAULT 0,
            tickets_count INTEGER,
            ticket_price DECIMAL(12,2),
            status TEXT DEFAULT ''draft'',
            contract_file_url TEXT,
            signed_at DATE,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )', p_schema, p_schema, p_schema, p_schema);
    
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS %I.documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id UUID REFERENCES %I.companies(id) ON DELETE CASCADE,
            contract_id UUID REFERENCES %I.contracts(id) ON DELETE CASCADE,
            document_type TEXT,
            document_number TEXT,
            document_date DATE,
            file_url TEXT NOT NULL,
            file_name TEXT,
            file_size INTEGER,
            status TEXT DEFAULT ''draft'',
            created_by UUID REFERENCES public.managers(id) ON DELETE SET NULL,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )', p_schema, p_schema, p_schema);
    
    -- Добавляем FK для deals после создания B2B таблиц
    EXECUTE format('
        ALTER TABLE %I.deals 
        DROP CONSTRAINT IF EXISTS deals_company_id_fkey,
        ADD CONSTRAINT deals_company_id_fkey 
            FOREIGN KEY (company_id) REFERENCES %I.companies(id) ON DELETE SET NULL
    ', p_schema, p_schema);
    
    EXECUTE format('
        ALTER TABLE %I.deals 
        DROP CONSTRAINT IF EXISTS deals_contact_id_fkey,
        ADD CONSTRAINT deals_contact_id_fkey 
            FOREIGN KEY (contact_id) REFERENCES %I.company_contacts(id) ON DELETE SET NULL
    ', p_schema, p_schema);
    
    EXECUTE format('
        ALTER TABLE %I.deals 
        DROP CONSTRAINT IF EXISTS deals_contract_id_fkey,
        ADD CONSTRAINT deals_contract_id_fkey 
            FOREIGN KEY (contract_id) REFERENCES %I.contracts(id) ON DELETE SET NULL
    ', p_schema, p_schema);
    
    -- =============== ИНДЕКСЫ ===============
    
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_clients_phone ON %I.clients(phone_normalized)', p_schema, p_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_clients_manager ON %I.clients(manager_id)', p_schema, p_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_clients_type ON %I.clients(client_type)', p_schema, p_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_deals_client ON %I.deals(client_id)', p_schema, p_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_deals_manager ON %I.deals(manager_id)', p_schema, p_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_deals_pipeline ON %I.deals(pipeline_id)', p_schema, p_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_deals_stage ON %I.deals(stage_id)', p_schema, p_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_calls_client ON %I.calls(client_id)', p_schema, p_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_tasks_manager ON %I.tasks(manager_id)', p_schema, p_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_tasks_due ON %I.tasks(due_date)', p_schema, p_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_messages_client ON %I.messages(client_id)', p_schema, p_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_activities_client ON %I.activities(client_id)', p_schema, p_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_events_date ON %I.events(event_date)', p_schema, p_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_companies_manager ON %I.companies(manager_id)', p_schema, p_schema);
    EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_contracts_company ON %I.contracts(company_id)', p_schema, p_schema);
    
    RAISE NOTICE 'Schema % tables created successfully', p_schema;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 5. СОЗДАЁМ ТАБЛИЦЫ ВО ВСЕХ СХЕМАХ
-- ===========================================
SELECT create_team_schema_tables('kstati');
SELECT create_team_schema_tables('atlant');
SELECT create_team_schema_tables('etazhi');

-- ===========================================
-- 6. ФУНКЦИЯ СОЗДАНИЯ ВОРОНОК В СХЕМЕ
-- ===========================================
CREATE OR REPLACE FUNCTION create_team_pipelines(p_schema TEXT)
RETURNS void AS $$
DECLARE
    v_pipeline_id UUID;
BEGIN
    -- Воронка "Новые клиенты"
    EXECUTE format('
        INSERT INTO %I.pipelines (id, name, code, client_type, is_default, sort_order)
        VALUES (''11111111-1111-1111-1111-111111111111'', ''Новые клиенты'', ''new_clients'', ''lead'', true, 1)
        ON CONFLICT (code) DO NOTHING
    ', p_schema);
    
    EXECUTE format('
        INSERT INTO %I.pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success) VALUES
        (''11111111-1111-1111-1111-111111111111'', ''Новые лиды'', ''new_leads'', ''#6366f1'', 1, false, false),
        (''11111111-1111-1111-1111-111111111111'', ''Приняты в работу'', ''accepted'', ''#8b5cf6'', 2, false, false),
        (''11111111-1111-1111-1111-111111111111'', ''Не вышел на связь'', ''no_contact'', ''#f59e0b'', 3, false, false),
        (''11111111-1111-1111-1111-111111111111'', ''Недозвон'', ''no_answer'', ''#ef4444'', 4, false, false),
        (''11111111-1111-1111-1111-111111111111'', ''Автоответчик'', ''voicemail'', ''#f97316'', 5, false, false),
        (''11111111-1111-1111-1111-111111111111'', ''В мессенджере без спича'', ''messenger_no_speech'', ''#06b6d4'', 6, false, false),
        (''11111111-1111-1111-1111-111111111111'', ''Отправил в мессенджер'', ''sent_messenger'', ''#0ea5e9'', 7, false, false),
        (''11111111-1111-1111-1111-111111111111'', ''Контакт не состоялся'', ''contact_failed'', ''#64748b'', 8, true, false),
        (''11111111-1111-1111-1111-111111111111'', ''Предоплата'', ''prepayment'', ''#22c55e'', 9, false, false),
        (''11111111-1111-1111-1111-111111111111'', ''Сделка'', ''deal_won'', ''#10b981'', 10, true, true),
        (''11111111-1111-1111-1111-111111111111'', ''Долгий ящик'', ''long_term'', ''#94a3b8'', 11, true, false)
        ON CONFLICT DO NOTHING
    ', p_schema);
    
    -- Воронка "КБ"
    EXECUTE format('
        INSERT INTO %I.pipelines (id, name, code, client_type, is_default, sort_order)
        VALUES (''22222222-2222-2222-2222-222222222222'', ''Клиентская база'', ''kb'', ''kb'', false, 2)
        ON CONFLICT (code) DO NOTHING
    ', p_schema);
    
    EXECUTE format('
        INSERT INTO %I.pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success) VALUES
        (''22222222-2222-2222-2222-222222222222'', ''База постоянных клиентов'', ''kb_base'', ''#6366f1'', 1, false, false),
        (''22222222-2222-2222-2222-222222222222'', ''После автооплат'', ''after_autopay'', ''#8b5cf6'', 2, false, false),
        (''22222222-2222-2222-2222-222222222222'', ''Уже был контакт'', ''had_contact'', ''#a855f7'', 3, false, false),
        (''22222222-2222-2222-2222-222222222222'', ''Принята в работу'', ''accepted'', ''#8b5cf6'', 4, false, false),
        (''22222222-2222-2222-2222-222222222222'', ''Контакт не состоялся'', ''contact_failed'', ''#64748b'', 5, true, false),
        (''22222222-2222-2222-2222-222222222222'', ''Недозвон'', ''no_answer'', ''#ef4444'', 6, false, false),
        (''22222222-2222-2222-2222-222222222222'', ''В мессенджере без спича'', ''messenger_no_speech'', ''#06b6d4'', 7, false, false),
        (''22222222-2222-2222-2222-222222222222'', ''Отправил в мессенджер'', ''sent_messenger'', ''#0ea5e9'', 8, false, false),
        (''22222222-2222-2222-2222-222222222222'', ''Предоплата'', ''prepayment'', ''#22c55e'', 9, false, false),
        (''22222222-2222-2222-2222-222222222222'', ''Сделка'', ''deal_won'', ''#10b981'', 10, true, true),
        (''22222222-2222-2222-2222-222222222222'', ''Долгий ящик'', ''long_term'', ''#94a3b8'', 11, true, false)
        ON CONFLICT DO NOTHING
    ', p_schema);
    
    -- Воронка "ПК"
    EXECUTE format('
        INSERT INTO %I.pipelines (id, name, code, client_type, is_default, sort_order)
        VALUES (''33333333-3333-3333-3333-333333333333'', ''Потенциальные клиенты'', ''pk'', ''pk'', false, 3)
        ON CONFLICT (code) DO NOTHING
    ', p_schema);
    
    EXECUTE format('
        INSERT INTO %I.pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success) VALUES
        (''33333333-3333-3333-3333-333333333333'', ''База ПК'', ''pk_base'', ''#6366f1'', 1, false, false),
        (''33333333-3333-3333-3333-333333333333'', ''Принята в работу'', ''accepted'', ''#8b5cf6'', 2, false, false),
        (''33333333-3333-3333-3333-333333333333'', ''Недозвон'', ''no_answer'', ''#ef4444'', 3, false, false),
        (''33333333-3333-3333-3333-333333333333'', ''Отправил в мессенджер после разговора'', ''sent_messenger_after'', ''#0ea5e9'', 4, false, false),
        (''33333333-3333-3333-3333-333333333333'', ''Контакт не состоялся'', ''contact_failed'', ''#64748b'', 5, true, false),
        (''33333333-3333-3333-3333-333333333333'', ''Предоплата'', ''prepayment'', ''#22c55e'', 6, false, false),
        (''33333333-3333-3333-3333-333333333333'', ''Сделка'', ''deal_won'', ''#10b981'', 7, true, true),
        (''33333333-3333-3333-3333-333333333333'', ''Следующий раз'', ''next_time'', ''#94a3b8'', 8, true, false)
        ON CONFLICT DO NOTHING
    ', p_schema);
    
    -- Воронка "B2B"
    EXECUTE format('
        INSERT INTO %I.pipelines (id, name, code, is_default, sort_order)
        VALUES (''44444444-4444-4444-4444-444444444444'', ''B2B продажи'', ''b2b'', false, 4)
        ON CONFLICT (code) DO NOTHING
    ', p_schema);
    
    EXECUTE format('
        INSERT INTO %I.pipeline_stages (pipeline_id, name, code, color, sort_order) VALUES
        (''44444444-4444-4444-4444-444444444444'', ''Первый контакт'', ''first_contact'', ''#3B82F6'', 1),
        (''44444444-4444-4444-4444-444444444444'', ''Переговоры'', ''negotiation'', ''#F59E0B'', 2),
        (''44444444-4444-4444-4444-444444444444'', ''КП отправлено'', ''proposal_sent'', ''#8B5CF6'', 3),
        (''44444444-4444-4444-4444-444444444444'', ''Договор на подпись'', ''contract_pending'', ''#EC4899'', 4),
        (''44444444-4444-4444-4444-444444444444'', ''Договор подписан'', ''contract_signed'', ''#10B981'', 5),
        (''44444444-4444-4444-4444-444444444444'', ''Оплачено'', ''paid'', ''#059669'', 6),
        (''44444444-4444-4444-4444-444444444444'', ''Услуга оказана'', ''completed'', ''#047857'', 7),
        (''44444444-4444-4444-4444-444444444444'', ''Отказ'', ''lost'', ''#EF4444'', 8)
        ON CONFLICT DO NOTHING
    ', p_schema);
    
    RAISE NOTICE 'Pipelines for schema % created', p_schema;
END;
$$ LANGUAGE plpgsql;

-- Создаём воронки во всех схемах
SELECT create_team_pipelines('kstati');
SELECT create_team_pipelines('atlant');
SELECT create_team_pipelines('etazhi');

-- ===========================================
-- 7. МИГРАЦИЯ СУЩЕСТВУЮЩИХ ДАННЫХ В ATLANT
-- ===========================================

-- ===========================================
-- БЕЗОПАСНОЕ КОПИРОВАНИЕ ДАННЫХ (с обработкой ошибок)
-- ===========================================

-- Копируем города
DO $$ BEGIN
    INSERT INTO atlant.cities (id, name, region, timezone, is_active, sort_order, created_at)
    SELECT id, name, region, timezone, is_active, COALESCE(sort_order, 0), created_at 
    FROM public.cities
    ON CONFLICT DO NOTHING;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Could not copy cities: %', SQLERRM;
END $$;

-- Копируем спектакли
DO $$ BEGIN
    INSERT INTO atlant.shows (id, title, description, duration_minutes, age_restriction, genre_ids, poster_url, trailer_url, is_active, created_at, updated_at)
    SELECT id, title, description, duration_minutes, age_restriction, genre_ids, poster_url, trailer_url, is_active, created_at, updated_at
    FROM public.shows
    ON CONFLICT DO NOTHING;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Could not copy shows: %', SQLERRM;
END $$;

-- Копируем источники
DO $$ BEGIN
    INSERT INTO atlant.lead_sources (id, name, code, source_type, is_active, created_at)
    SELECT id, name, code, source_type, is_active, created_at
    FROM public.lead_sources
    ON CONFLICT DO NOTHING;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Could not copy lead_sources: %', SQLERRM;
END $$;

-- Копируем события
DO $$ BEGIN
    INSERT INTO atlant.events (id, show_id, city_id, event_date, event_time, venue_name, venue_address, landing_url, total_tickets, sold_tickets, min_price, max_price, status, created_at, updated_at)
    SELECT id, show_id, city_id, event_date, event_time::time, venue_name, venue_address, landing_url, total_tickets, COALESCE(sold_tickets, 0), min_price, max_price, COALESCE(status, 'planned'), created_at, updated_at
    FROM public.events
    ON CONFLICT DO NOTHING;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Could not copy events: %', SQLERRM;
END $$;

-- Копируем клиентов (безопасное копирование с проверкой колонок)
DO $$
BEGIN
    -- Пробуем скопировать с полным набором колонок
    BEGIN
        INSERT INTO atlant.clients (id, full_name, phone, phone_normalized, email, city_id, client_type, status, telegram_id, telegram_username, whatsapp_phone, source_id, utm_source, utm_medium, utm_campaign, utm_content, manager_id, total_purchases, total_revenue, first_purchase_date, last_purchase_date, notes, rejection_points, last_activity_at, became_kb_at, created_at, updated_at)
        SELECT id, full_name, phone, phone_normalized, email, city_id, client_type, status, telegram_id, telegram_username, whatsapp_phone, source_id, utm_source, utm_medium, utm_campaign, utm_content, manager_id, 
               COALESCE(total_purchases, 0), COALESCE(total_revenue, 0), first_purchase_date, last_purchase_date, notes, 
               COALESCE(rejection_points, 0), last_activity_at, became_kb_at, created_at, updated_at
        FROM public.clients
        ON CONFLICT DO NOTHING;
    EXCEPTION WHEN undefined_column THEN
        -- Если колонки не существуют, копируем минимальный набор
        INSERT INTO atlant.clients (id, full_name, phone, email, city_id, client_type, status, manager_id, created_at, updated_at)
        SELECT id, full_name, phone, email, city_id, 
               COALESCE(client_type, 'lead'), COALESCE(status, 'new'), 
               manager_id, created_at, updated_at
        FROM public.clients
        ON CONFLICT DO NOTHING;
    END;
END $$;

-- Копируем воронки
DO $$ BEGIN
    INSERT INTO atlant.pipelines (id, name, code, client_type, is_default, sort_order, created_at)
    SELECT id, name, code, client_type, COALESCE(is_default, false), COALESCE(sort_order, 0), created_at
    FROM public.pipelines
    ON CONFLICT DO NOTHING;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Could not copy pipelines: %', SQLERRM;
END $$;

-- Копируем этапы воронок
DO $$ BEGIN
    INSERT INTO atlant.pipeline_stages (id, pipeline_id, name, code, color, sort_order, is_final, is_success, created_at)
    SELECT id, pipeline_id, name, code, color, COALESCE(sort_order, 0), COALESCE(is_final, false), COALESCE(is_success, false), created_at
    FROM public.pipeline_stages
    ON CONFLICT DO NOTHING;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Could not copy pipeline_stages: %', SQLERRM;
END $$;

-- Копируем сделки
DO $$ BEGIN
    INSERT INTO atlant.deals (id, client_id, manager_id, event_id, pipeline_id, stage_id, source_id, title, tickets_count, amount, discount_percent, discount_amount, status, lost_reason, next_contact_date, closed_at, report_week_start, created_at, updated_at)
    SELECT id, client_id, manager_id, event_id, pipeline_id, stage_id, source_id, title, 
           COALESCE(tickets_count, 0), COALESCE(amount, 0), COALESCE(discount_percent, 0), COALESCE(discount_amount, 0), 
           COALESCE(status, 'active'), lost_reason, next_contact_date, closed_at, report_week_start, created_at, updated_at
    FROM public.deals
    ON CONFLICT DO NOTHING;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Could not copy deals: %', SQLERRM;
END $$;

-- Копируем звонки
DO $$ BEGIN
    INSERT INTO atlant.calls (id, client_id, deal_id, manager_id, uis_call_id, direction, phone, phone_normalized, started_at, answered_at, ended_at, duration_seconds, wait_seconds, status, record_url, result, notes, report_date, created_at)
    SELECT id, client_id, deal_id, manager_id, uis_call_id, direction, phone, phone_normalized, started_at, answered_at, ended_at, 
           COALESCE(duration_seconds, 0), COALESCE(wait_seconds, 0), status, record_url, result, notes, report_date, created_at
    FROM public.calls
    ON CONFLICT DO NOTHING;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Could not copy calls: %', SQLERRM;
END $$;

-- Копируем сообщения
DO $$ BEGIN
    INSERT INTO atlant.messages (id, client_id, manager_id, channel, direction, content, status, external_id, metadata, created_at, read_at)
    SELECT id, client_id, manager_id, channel, direction, content, status, external_id, COALESCE(metadata, '{}'), created_at, read_at
    FROM public.messages
    ON CONFLICT DO NOTHING;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Could not copy messages: %', SQLERRM;
END $$;

-- Копируем задачи
DO $$ BEGIN
    INSERT INTO atlant.tasks (id, client_id, deal_id, manager_id, title, description, task_type, priority, status, due_date, completed_at, created_at, updated_at)
    SELECT id, client_id, deal_id, manager_id, title, description, COALESCE(task_type, 'call'), COALESCE(priority, 'normal'), COALESCE(status, 'pending'), 
           due_date::date, completed_at, created_at, updated_at
    FROM public.tasks
    ON CONFLICT DO NOTHING;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Could not copy tasks: %', SQLERRM;
END $$;

-- Копируем активности
DO $$ BEGIN
    INSERT INTO atlant.activities (id, client_id, deal_id, manager_id, activity_type, content, metadata, created_at)
    SELECT id, client_id, deal_id, manager_id, activity_type, content, COALESCE(metadata, '{}'), created_at
    FROM public.activities
    ON CONFLICT DO NOTHING;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Could not copy activities: %', SQLERRM;
END $$;

-- Копируем теги
DO $$ BEGIN
    INSERT INTO atlant.tags (id, name, color, category, is_auto, event_id, city_id, created_at)
    SELECT id, name, color, category, COALESCE(is_auto, false), event_id, city_id, created_at
    FROM public.tags
    ON CONFLICT DO NOTHING;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Could not copy tags: %', SQLERRM;
END $$;

-- Копируем связи клиент-тег
DO $$ BEGIN
    INSERT INTO atlant.client_tags (client_id, tag_id, created_at, created_by)
    SELECT client_id, tag_id, created_at, created_by
    FROM public.client_tags
    ON CONFLICT DO NOTHING;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Could not copy client_tags: %', SQLERRM;
END $$;

-- Копируем правила распределения
DO $$ BEGIN
    INSERT INTO atlant.lead_routing_rules (id, city_id, event_id, manager_id, is_active, priority, valid_from, valid_to, created_at, updated_at)
    SELECT id, city_id, event_id, manager_id, COALESCE(is_active, true), COALESCE(priority, 0), valid_from, valid_to, created_at, updated_at
    FROM public.lead_routing_rules
    ON CONFLICT DO NOTHING;
EXCEPTION WHEN others THEN
    RAISE NOTICE 'Could not copy lead_routing_rules: %', SQLERRM;
END $$;

-- ===========================================
-- 8. ВЫВОДИМ РЕЗУЛЬТАТ
-- ===========================================
SELECT 'Multi-schema migration completed!' as result;
SELECT t.name, t.schema_name, 
    (SELECT COUNT(*) FROM atlant.clients) as atlant_clients,
    (SELECT COUNT(*) FROM atlant.deals) as atlant_deals
FROM public.teams t;
