import { readFileSync } from 'fs';
import pg from 'pg';

const SUPABASE_DB_URL = "postgresql://postgres:58Lm9IzmFiWE38fN@db.rlttkzmpazgdkypvhtpd.supabase.co:5432/postgres";

async function run() {
  const client = new pg.Client({ connectionString: SUPABASE_DB_URL });
  
  try {
    console.log('🔗 Подключение к Supabase...');
    await client.connect();
    console.log('✓ Подключено!\n');
    
    // Шаг 1: Создание схемы
    console.log('📦 Создание схемы orgotdel...');
    const schemaSQL = readFileSync('./supabase/migrations/20260219_orgotdel_schema.sql', 'utf-8');
    await client.query(schemaSQL);
    console.log('✓ Схема создана!\n');
    
    // Шаг 2: Импорт данных
    console.log('📥 Импорт данных из orgotdiel_data_clean.sql...');
    const dataSQL = readFileSync('/Users/pulodavrony/Downloads/orgotdiel_data_clean.sql', 'utf-8');
    await client.query(dataSQL);
    console.log('✓ Данные импортированы!\n');
    
    // Проверка количества записей
    const tables = ['cities', 'halls', 'shows', 'events', 'drafts', 'tasks', 'planning_items', 'available_dates'];
    console.log('📊 Количество записей в таблицах:');
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM orgotdel.${table}`);
        console.log(`   ${table}: ${result.rows[0].count}`);
      } catch (e) {
        console.log(`   ${table}: ошибка - ${e.message}`);
      }
    }
    
    console.log('\n🎉 Импорт завершён успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    if (error.message.includes('already exists')) {
      console.log('\n💡 Подсказка: возможно схема уже существует. Если нужно переимпортировать данные, очистите таблицы или удалите схему.');
    }
  } finally {
    await client.end();
  }
}

run();
