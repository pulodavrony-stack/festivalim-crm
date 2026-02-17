-- Migration 010: Sales Scripts + Client Additional Contacts
-- Creates sales_scripts and client_contacts tables in each team schema

DO $$
DECLARE
  schema_name TEXT;
BEGIN
  FOR schema_name IN SELECT unnest(ARRAY['kstati', 'atlant', 'etazhi'])
  LOOP
    -- Sales scripts (team-level)
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.sales_scripts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT %L,
        category TEXT DEFAULT %L,
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )', schema_name, '', 'general');

    -- Client additional contacts (contact persons within an organization)
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.client_contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id UUID NOT NULL REFERENCES %I.clients(id) ON DELETE CASCADE,
        full_name TEXT NOT NULL,
        position TEXT,
        phone TEXT,
        email TEXT,
        comments TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )', schema_name, schema_name);

    -- Indexes
    EXECUTE format('
      CREATE INDEX IF NOT EXISTS idx_%s_client_contacts_client ON %I.client_contacts(client_id)
    ', schema_name, schema_name);

    EXECUTE format('
      CREATE INDEX IF NOT EXISTS idx_%s_sales_scripts_active ON %I.sales_scripts(is_active, sort_order)
    ', schema_name, schema_name);

    -- Grants
    EXECUTE format('GRANT ALL ON %I.sales_scripts TO service_role', schema_name);
    EXECUTE format('GRANT ALL ON %I.sales_scripts TO authenticated', schema_name);
    EXECUTE format('GRANT SELECT ON %I.sales_scripts TO anon', schema_name);

    EXECUTE format('GRANT ALL ON %I.client_contacts TO service_role', schema_name);
    EXECUTE format('GRANT ALL ON %I.client_contacts TO authenticated', schema_name);
    EXECUTE format('GRANT SELECT ON %I.client_contacts TO anon', schema_name);

    -- RLS
    EXECUTE format('ALTER TABLE %I.sales_scripts ENABLE ROW LEVEL SECURITY', schema_name);
    EXECUTE format('ALTER TABLE %I.client_contacts ENABLE ROW LEVEL SECURITY', schema_name);

    -- Policies for sales_scripts
    EXECUTE format('DROP POLICY IF EXISTS "sales_scripts_service" ON %I.sales_scripts', schema_name);
    EXECUTE format('
      CREATE POLICY "sales_scripts_service" ON %I.sales_scripts
      FOR ALL TO service_role USING (true) WITH CHECK (true)
    ', schema_name);
    EXECUTE format('DROP POLICY IF EXISTS "sales_scripts_auth" ON %I.sales_scripts', schema_name);
    EXECUTE format('
      CREATE POLICY "sales_scripts_auth" ON %I.sales_scripts
      FOR ALL TO authenticated USING (true) WITH CHECK (true)
    ', schema_name);

    -- Policies for client_contacts
    EXECUTE format('DROP POLICY IF EXISTS "client_contacts_service" ON %I.client_contacts', schema_name);
    EXECUTE format('
      CREATE POLICY "client_contacts_service" ON %I.client_contacts
      FOR ALL TO service_role USING (true) WITH CHECK (true)
    ', schema_name);
    EXECUTE format('DROP POLICY IF EXISTS "client_contacts_auth" ON %I.client_contacts', schema_name);
    EXECUTE format('
      CREATE POLICY "client_contacts_auth" ON %I.client_contacts
      FOR ALL TO authenticated USING (true) WITH CHECK (true)
    ', schema_name);

    RAISE NOTICE 'Created tables for schema: %', schema_name;
  END LOOP;
END $$;

-- Insert default sales scripts for kstati
INSERT INTO kstati.sales_scripts (title, content, category, sort_order) VALUES
(
  'Первый звонок - B2B школы',
  'Здравствуйте, [ФИО]!

Меня зовут [ваше имя], я представляю театральную компанию «Кстати театр».

Мы организуем выездные спектакли для школ и детских учреждений. Наши спектакли:
- Интерактивные, с вовлечением детей
- Адаптированы под разные возрастные группы
- Включают все необходимое оборудование

Хотел бы узнать, практикуете ли вы выездные культурные мероприятия для учеников?

[Если да] → Отлично! Могу рассказать подробнее о наших программах. Какие возрастные группы вас интересуют?

[Если нет] → Понимаю. Многие школы начинают с пробного мероприятия. Могу отправить вам информацию для ознакомления?

Завершение:
- Договориться о следующем шаге (встреча / отправка КП / повторный звонок)
- Записать все контакты и комментарии',
  'b2b',
  1
),
(
  'Повторный звонок - B2B',
  'Здравствуйте, [ФИО]!

Это [ваше имя] из «Кстати театр». Мы с вами общались [дата].

[Если отправляли КП] → Удалось ли ознакомиться с нашим предложением?
[Если договаривались о встрече] → Напоминаю о нашей договоренности.

Ключевые моменты:
- Уточнить количество детей и возраст
- Обсудить удобные даты
- Рассказать о ценах и пакетах
- Предложить пробное мероприятие со скидкой

Если сомневаются:
→ Можем организовать бесплатный показ фрагмента
→ Есть отзывы от других школ вашего города
→ Гибкий график - подстраиваемся под расписание',
  'b2b',
  2
),
(
  'Работа с возражениями',
  '❌ "Нет бюджета"
→ Мы можем предложить несколько вариантов по стоимости. Также есть вариант, когда родители оплачивают билеты - школа не тратит из бюджета.

❌ "Нам это не интересно"  
→ Понимаю. А какие культурные мероприятия вы проводите? Может, наш формат подойдет?

❌ "Уже работаем с другими"
→ Отлично, что вы цените культурное развитие! Наш формат может дополнить существующую программу. Чем мы отличаемся: [преимущества]

❌ "Перезвоните позже"
→ Конечно! Когда вам будет удобно? Я поставлю напоминание.

❌ "Отправьте на почту"
→ С удовольствием! Подскажите email и ФИО, на чье имя адресовать. Когда мне перезвонить, чтобы обсудить?',
  'objections',
  3
);
