-- =============================================
-- Создание недостающих таблиц
-- =============================================

-- Таблица сообщений (messages)
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    manager_id UUID REFERENCES managers(id) ON DELETE SET NULL,
    direction TEXT CHECK (direction IN ('incoming', 'outgoing')),
    channel TEXT CHECK (channel IN ('whatsapp', 'telegram', 'sms', 'email')),
    content TEXT,
    status TEXT DEFAULT 'sent',
    external_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_messages_client ON messages(client_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- Таблица задач (tasks)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES managers(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT DEFAULT 'call',
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_manager ON tasks(manager_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Таблица активностей (activities)
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES managers(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL,
    content TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_client ON activities(client_id);
CREATE INDEX IF NOT EXISTS idx_activities_created ON activities(created_at DESC);

-- Таблица источников лидов (lead_sources)
CREATE TABLE IF NOT EXISTS lead_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    source_type TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Добавляем колонку source_id в clients если нет
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'source_id'
    ) THEN
        ALTER TABLE clients ADD COLUMN source_id UUID REFERENCES lead_sources(id);
    END IF;
END $$;

-- Добавляем колонки для отчётов в calls если нет
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calls' AND column_name = 'report_date'
    ) THEN
        ALTER TABLE calls ADD COLUMN report_date DATE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'calls' AND column_name = 'phone_normalized'
    ) THEN
        ALTER TABLE calls ADD COLUMN phone_normalized TEXT;
    END IF;
END $$;

-- Добавляем колонку report_week_start в deals если нет
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'deals' AND column_name = 'report_week_start'
    ) THEN
        ALTER TABLE deals ADD COLUMN report_week_start DATE;
    END IF;
END $$;

-- Добавляем недостающие колонки в clients
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'phone_normalized'
    ) THEN
        ALTER TABLE clients ADD COLUMN phone_normalized TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'became_kb_at'
    ) THEN
        ALTER TABLE clients ADD COLUMN became_kb_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'total_purchases'
    ) THEN
        ALTER TABLE clients ADD COLUMN total_purchases INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'total_revenue'
    ) THEN
        ALTER TABLE clients ADD COLUMN total_revenue DECIMAL(12,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'first_purchase_date'
    ) THEN
        ALTER TABLE clients ADD COLUMN first_purchase_date DATE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'last_purchase_date'
    ) THEN
        ALTER TABLE clients ADD COLUMN last_purchase_date DATE;
    END IF;
END $$;

-- Добавляем колонки в managers если нет
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'managers' AND column_name = 'weekly_calls_target'
    ) THEN
        ALTER TABLE managers ADD COLUMN weekly_calls_target INTEGER DEFAULT 200;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'managers' AND column_name = 'weekly_sales_target'
    ) THEN
        ALTER TABLE managers ADD COLUMN weekly_sales_target DECIMAL(12,2) DEFAULT 100000;
    END IF;
END $$;

SELECT 'Таблицы и колонки созданы успешно!' as result;
