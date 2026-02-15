// Скрипт для выполнения SQL миграции через Supabase SDK
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const migrations = [
  // 1. Воронки
  `CREATE TABLE IF NOT EXISTS pipelines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    is_default BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  
  // 2. Этапы воронки
  `CREATE TABLE IF NOT EXISTS pipeline_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    color TEXT DEFAULT '#6B7280',
    sort_order INTEGER DEFAULT 0,
    is_final BOOLEAN DEFAULT false,
    final_status TEXT CHECK (final_status IN ('won', 'lost')),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  
  // 3. Сделки
  `CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    pipeline_id UUID REFERENCES pipelines(id),
    stage_id UUID REFERENCES pipeline_stages(id),
    manager_id UUID REFERENCES managers(id),
    title TEXT,
    amount DECIMAL(12,2) DEFAULT 0,
    tickets_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'cancelled')),
    lost_reason TEXT,
    source_id UUID REFERENCES lead_sources(id),
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ,
    report_week_start DATE
  )`,
  
  // 4. Звонки
  `CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES managers(id),
    deal_id UUID REFERENCES deals(id),
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    status TEXT DEFAULT 'answered' CHECK (status IN ('answered', 'missed', 'busy', 'no_answer', 'failed')),
    phone TEXT,
    phone_normalized TEXT,
    duration INTEGER DEFAULT 0,
    talk_duration INTEGER DEFAULT 0,
    wait_duration INTEGER DEFAULT 0,
    record_url TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    answered_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    report_date DATE,
    is_first_contact BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  
  // 5. Сообщения
  `CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT UNIQUE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES managers(id),
    deal_id UUID REFERENCES deals(id),
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'telegram', 'sms', 'email')),
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video', 'location', 'template')),
    content TEXT,
    media_url TEXT,
    template_name TEXT,
    status TEXT DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    error_message TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  
  // 6. Задачи
  `CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
    manager_id UUID REFERENCES managers(id),
    created_by_id UUID REFERENCES managers(id),
    task_type TEXT DEFAULT 'call' CHECK (task_type IN ('call', 'message', 'meeting', 'reminder', 'other')),
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'overdue')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    result TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  
  // 7. Активности
  `CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES managers(id),
    call_id UUID REFERENCES calls(id),
    message_id UUID REFERENCES messages(id),
    task_id UUID REFERENCES tasks(id),
    activity_type TEXT NOT NULL,
    content TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  
  // 8. Билеты
  `CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id),
    client_id UUID REFERENCES clients(id),
    seat_info TEXT,
    price DECIMAL(10,2),
    status TEXT DEFAULT 'reserved' CHECK (status IN ('reserved', 'paid', 'cancelled', 'refunded', 'used')),
    barcode TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  
  // 9. Платежи
  `CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id),
    amount DECIMAL(12,2) NOT NULL,
    payment_type TEXT DEFAULT 'full' CHECK (payment_type IN ('full', 'partial', 'deposit', 'refund')),
    payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'online', 'transfer', 'other')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    external_id TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  
  // 10. Начальные данные - воронка
  `INSERT INTO pipelines (name, code, is_default, sort_order) 
   SELECT 'Продажи', 'sales', true, 1 
   WHERE NOT EXISTS (SELECT 1 FROM pipelines WHERE code = 'sales')`,
  
  // 11. Этапы воронки
  `INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, final_status)
   SELECT p.id, 'Новый', 'new', '#3B82F6', 1, false, NULL
   FROM pipelines p WHERE p.code = 'sales'
   AND NOT EXISTS (SELECT 1 FROM pipeline_stages WHERE code = 'new' AND pipeline_id = p.id)`,
  
  `INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, final_status)
   SELECT p.id, 'В работе', 'in_progress', '#F59E0B', 2, false, NULL
   FROM pipelines p WHERE p.code = 'sales'
   AND NOT EXISTS (SELECT 1 FROM pipeline_stages WHERE code = 'in_progress' AND pipeline_id = p.id)`,
  
  `INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, final_status)
   SELECT p.id, 'Выбор билетов', 'choosing', '#8B5CF6', 3, false, NULL
   FROM pipelines p WHERE p.code = 'sales'
   AND NOT EXISTS (SELECT 1 FROM pipeline_stages WHERE code = 'choosing' AND pipeline_id = p.id)`,
  
  `INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, final_status)
   SELECT p.id, 'Оплата', 'payment', '#EC4899', 4, false, NULL
   FROM pipelines p WHERE p.code = 'sales'
   AND NOT EXISTS (SELECT 1 FROM pipeline_stages WHERE code = 'payment' AND pipeline_id = p.id)`,
  
  `INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, final_status)
   SELECT p.id, 'Успешно', 'won', '#10B981', 5, true, 'won'
   FROM pipelines p WHERE p.code = 'sales'
   AND NOT EXISTS (SELECT 1 FROM pipeline_stages WHERE code = 'won' AND pipeline_id = p.id)`,
  
  `INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, final_status)
   SELECT p.id, 'Отказ', 'lost', '#EF4444', 6, true, 'lost'
   FROM pipelines p WHERE p.code = 'sales'
   AND NOT EXISTS (SELECT 1 FROM pipeline_stages WHERE code = 'lost' AND pipeline_id = p.id)`,
  
  // 12. Индексы
  `CREATE INDEX IF NOT EXISTS idx_deals_client ON deals(client_id)`,
  `CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage_id)`,
  `CREATE INDEX IF NOT EXISTS idx_deals_manager ON deals(manager_id)`,
  `CREATE INDEX IF NOT EXISTS idx_calls_client ON calls(client_id)`,
  `CREATE INDEX IF NOT EXISTS idx_calls_manager ON calls(manager_id)`,
  `CREATE INDEX IF NOT EXISTS idx_activities_client ON activities(client_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_manager ON tasks(manager_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)`,
  
  // 13. Функция нормализации телефона
  `CREATE OR REPLACE FUNCTION normalize_phone(phone TEXT)
   RETURNS TEXT AS $$
   BEGIN
     IF phone IS NULL THEN RETURN NULL; END IF;
     RETURN regexp_replace(phone, '[^0-9]', '', 'g');
   END;
   $$ LANGUAGE plpgsql IMMUTABLE`,
  
  // 14. Функция поиска клиента по телефону
  `CREATE OR REPLACE FUNCTION find_client_by_phone(search_phone TEXT)
   RETURNS TABLE(id UUID, full_name TEXT, client_type TEXT, total_purchases INTEGER) AS $$
   BEGIN
     RETURN QUERY
     SELECT c.id, c.full_name, c.client_type, c.total_purchases
     FROM clients c
     WHERE c.phone_normalized = normalize_phone(search_phone)
     LIMIT 1;
   END;
   $$ LANGUAGE plpgsql`,
  
  // 15. RLS
  `ALTER TABLE deals ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE calls ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE messages ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE tasks ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE activities ENABLE ROW LEVEL SECURITY`,
  
  `DROP POLICY IF EXISTS "Allow all for authenticated" ON deals`,
  `CREATE POLICY "Allow all for authenticated" ON deals FOR ALL USING (true)`,
  
  `DROP POLICY IF EXISTS "Allow all for authenticated" ON calls`,
  `CREATE POLICY "Allow all for authenticated" ON calls FOR ALL USING (true)`,
  
  `DROP POLICY IF EXISTS "Allow all for authenticated" ON messages`,
  `CREATE POLICY "Allow all for authenticated" ON messages FOR ALL USING (true)`,
  
  `DROP POLICY IF EXISTS "Allow all for authenticated" ON tasks`,
  `CREATE POLICY "Allow all for authenticated" ON tasks FOR ALL USING (true)`,
  
  `DROP POLICY IF EXISTS "Allow all for authenticated" ON activities`,
  `CREATE POLICY "Allow all for authenticated" ON activities FOR ALL USING (true)`,
];

async function runMigrations() {
  console.log('🚀 Starting migrations...\n');
  
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < migrations.length; i++) {
    const sql = migrations[i];
    const preview = sql.slice(0, 60).replace(/\n/g, ' ');
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
      
      if (error) {
        // Если RPC не работает, пробуем через REST
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ sql_query: sql }),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
      }
      
      console.log(`✅ [${i + 1}/${migrations.length}] ${preview}...`);
      success++;
    } catch (err: any) {
      console.log(`❌ [${i + 1}/${migrations.length}] ${preview}...`);
      console.log(`   Error: ${err.message}\n`);
      failed++;
    }
  }
  
  console.log(`\n📊 Results: ${success} success, ${failed} failed`);
}

runMigrations();
