import { readFileSync } from 'fs';
import pg from 'pg';

// Supabase direct database connection
// Получите строку подключения в Supabase Dashboard → Settings → Database → Connection string → URI
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL;

if (!SUPABASE_DB_URL) {
  console.error('Ошибка: укажите SUPABASE_DB_URL');
  console.log('Пример: SUPABASE_DB_URL="postgresql://postgres.rlttkzmpazgdkypvhtpd:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" node scripts/import-orgotdiel-data.mjs');
  process.exit(1);
}

async function run() {
  const client = new pg.Client({ connectionString: SUPABASE_DB_URL });
  
  try {
    console.log('Подключение к Supabase...');
    await client.connect();
    
    console.log('Чтение SQL файла...');
    const sqlFile = process.argv[2] || '/Users/pulodavrony/Downloads/orgotdiel_data_clean.sql';
    const sql = readFileSync(sqlFile, 'utf-8');
    console.log(`Используется файл: ${sqlFile}`);
    
    console.log('Выполнение SQL (это может занять некоторое время)...');
    await client.query(sql);
    
    console.log('✓ Импорт данных завершён успешно!');
    
    // Проверка количества записей
    const tables = ['cities', 'halls', 'shows', 'events', 'drafts', 'tasks', 'planning_items'];
    console.log('\nКоличество записей:');
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM orgotdel.${table}`);
        console.log(`  ${table}: ${result.rows[0].count}`);
      } catch (e) {
        console.log(`  ${table}: ошибка - ${e.message}`);
      }
    }
    
  } catch (error) {
    console.error('Ошибка:', error.message);
  } finally {
    await client.end();
  }
}

run();
