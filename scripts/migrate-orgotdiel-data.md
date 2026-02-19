# Руководство по миграции данных ORGOTDIEL

## Предварительные требования

1. **Сначала запустите миграцию схемы** — выполните SQL из `/supabase/migrations/20260219_orgotdel_schema.sql` в SQL Editor панели Supabase Dashboard
2. **Получите учётные данные базы Neon от ORGOTDIEL** из секретов Replit

## Способ 1: Ручной экспорт/импорт через Supabase Dashboard

### Шаг 1: Экспорт данных из Neon PostgreSQL

Подключитесь к базе Neon используя учётные данные из Replit и выполните:

```sql
-- Экспорт городов
COPY (SELECT * FROM cities) TO STDOUT WITH CSV HEADER;

-- Экспорт площадок
COPY (SELECT * FROM halls) TO STDOUT WITH CSV HEADER;

-- Экспорт спектаклей
COPY (SELECT * FROM shows) TO STDOUT WITH CSV HEADER;

-- Экспорт событий
COPY (SELECT * FROM events) TO STDOUT WITH CSV HEADER;

-- Экспорт черновиков
COPY (SELECT * FROM drafts) TO STDOUT WITH CSV HEADER;

-- Экспорт платежей
COPY (SELECT * FROM payment_events) TO STDOUT WITH CSV HEADER;

-- Экспорт задач
COPY (SELECT * FROM tasks) TO STDOUT WITH CSV HEADER;

-- Экспорт планирования
COPY (SELECT * FROM planning_items) TO STDOUT WITH CSV HEADER;

-- Экспорт комментариев к месяцам
COPY (SELECT * FROM month_comments) TO STDOUT WITH CSV HEADER;

-- Экспорт свободных дат
COPY (SELECT * FROM available_dates) TO STDOUT WITH CSV HEADER;

-- Экспорт уведомлений
COPY (SELECT * FROM notifications) TO STDOUT WITH CSV HEADER;
```

### Шаг 2: Импорт в Supabase

Для каждой таблицы: Supabase Dashboard → Table Editor → orgotdel.{имя_таблицы} → Import data from CSV

## Способ 2: Через pg_dump и psql

### Шаг 1: Экспорт из Neon

```bash
# Замените на вашу строку подключения Neon
NEON_URL="postgresql://user:password@host/database"

# Экспорт только данных (без схемы)
pg_dump "$NEON_URL" \
  --data-only \
  --no-owner \
  --no-privileges \
  -t cities \
  -t halls \
  -t shows \
  -t venue_details \
  -t show_details \
  -t events \
  -t drafts \
  -t payment_events \
  -t tasks \
  -t planning_items \
  -t month_comments \
  -t available_dates \
  -t notifications \
  > orgotdiel_data.sql
```

### Шаг 2: Изменение файла дампа

Замените имена таблиц в SQL файле:
- `cities` → `orgotdel.cities`
- `halls` → `orgotdel.halls`
- и так далее...

Можно использовать sed:
```bash
sed -i '' \
  -e 's/public\.cities/orgotdel.cities/g' \
  -e 's/public\.halls/orgotdel.halls/g' \
  -e 's/public\.shows/orgotdel.shows/g' \
  -e 's/public\.venue_details/orgotdel.venue_details/g' \
  -e 's/public\.show_details/orgotdel.show_details/g' \
  -e 's/public\.events/orgotdel.events/g' \
  -e 's/public\.drafts/orgotdel.drafts/g' \
  -e 's/public\.payment_events/orgotdel.payment_events/g' \
  -e 's/public\.tasks/orgotdel.tasks/g' \
  -e 's/public\.planning_items/orgotdel.planning_items/g' \
  -e 's/public\.month_comments/orgotdel.month_comments/g' \
  -e 's/public\.available_dates/orgotdel.available_dates/g' \
  -e 's/public\.notifications/orgotdel.notifications/g' \
  orgotdiel_data.sql
```

### Шаг 3: Импорт в Supabase

```bash
# Строка подключения Supabase (из Dashboard → Settings → Database → Connection string)
SUPABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

psql "$SUPABASE_URL" < orgotdiel_data.sql
```

## Способ 3: Node.js скрипт

Если у вас есть DATABASE_URL от Neon, создайте скрипт:

```javascript
// scripts/migrate-data.mjs
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const NEON_URL = process.env.NEON_DATABASE_URL;
const SUPABASE_URL = 'https://rlttkzmpazgdkypvhtpd.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const neonClient = new pg.Client({ connectionString: NEON_URL });
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'orgotdel' },
});

async function migrateTable(tableName, neonTable = tableName) {
  const { rows } = await neonClient.query(`SELECT * FROM ${neonTable}`);
  console.log(`Миграция ${rows.length} записей из ${neonTable} в orgotdel.${tableName}`);
  
  if (rows.length > 0) {
    const { error } = await supabase.from(tableName).insert(rows);
    if (error) console.error(`Ошибка миграции ${tableName}:`, error.message);
    else console.log(`✓ Мигрировано ${tableName}`);
  }
}

async function run() {
  await neonClient.connect();
  
  // Миграция в порядке зависимостей (foreign keys)
  await migrateTable('cities');
  await migrateTable('halls');
  await migrateTable('shows');
  await migrateTable('venue_details');
  await migrateTable('show_details');
  await migrateTable('events');
  await migrateTable('drafts');
  await migrateTable('payment_events');
  await migrateTable('tasks');
  await migrateTable('planning_items');
  await migrateTable('month_comments');
  await migrateTable('available_dates');
  await migrateTable('notifications');
  
  await neonClient.end();
  console.log('Миграция завершена!');
}

run().catch(console.error);
```

Запуск:
```bash
NEON_DATABASE_URL="ваш-neon-url" SUPABASE_SERVICE_ROLE_KEY="ваш-ключ" node scripts/migrate-data.mjs
```

## Примечания

- Таблица `users` НЕ мигрируется — пользователи ORGOTDIEL будут использовать существующую авторизацию CRM
- Таблица `departments` заполняется при миграции схемы
- Обязательно запустите миграцию схемы ДО миграции данных
