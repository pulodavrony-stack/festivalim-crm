#!/usr/bin/env node
/**
 * Добавление менеджера
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Загружаем .env
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addManager() {
  console.log('👤 Добавление менеджера...\n');

  // Проверяем есть ли уже менеджеры
  const { data: existing } = await supabase.from('managers').select('id, full_name');
  
  if (existing && existing.length > 0) {
    console.log('📋 Существующие менеджеры:');
    existing.forEach(m => console.log(`   - ${m.full_name}`));
    console.log('\n✅ Менеджеры уже есть в системе');
    return;
  }

  // Добавляем менеджера
  const { data, error } = await supabase
    .from('managers')
    .insert({
      full_name: 'Игорь Олегович',
      email: 'igor@festivalim.ru',
      role: 'admin',
      is_active: true,
      weekly_calls_target: 200,
      weekly_sales_target: 100000,
    })
    .select()
    .single();

  if (error) {
    console.log('⚠️  Ошибка:', error.message);
    
    // Пробуем с минимальными полями
    const { data: data2, error: error2 } = await supabase
      .from('managers')
      .insert({
        full_name: 'Игорь Олегович',
        is_active: true,
      })
      .select()
      .single();
    
    if (error2) {
      console.log('❌ Не удалось добавить:', error2.message);
    } else {
      console.log('✅ Менеджер добавлен:', data2.full_name);
    }
  } else {
    console.log('✅ Менеджер добавлен:', data.full_name);
  }
}

addManager();
