#!/usr/bin/env node
/**
 * Скрипт для применения миграций через Supabase
 * Запуск: node scripts/apply-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Загружаем .env файл вручную
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Не найдены переменные NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🚀 Применение миграции воронок...\n');

  try {
    // Шаг 1: Проверяем текущие воронки
    console.log('📋 Текущие воронки:');
    const { data: existingPipelines } = await supabase
      .from('pipelines')
      .select('id, name, code');
    
    if (existingPipelines) {
      existingPipelines.forEach(p => console.log(`   - ${p.name} (${p.code})`));
    }
    console.log('');

    // Шаг 2: Добавляем воронки
    const pipelines = [
      { name: 'Новые лиды', code: 'leads', sort_order: 1 },
      { name: 'Потенциальные клиенты', code: 'pk', sort_order: 2 },
      { name: 'Обзвон КБ', code: 'kb', sort_order: 3 },
      { name: 'Рассылки', code: 'mailings', sort_order: 4 },
    ];

    for (const pipeline of pipelines) {
      // Проверяем существует ли
      const { data: existing } = await supabase
        .from('pipelines')
        .select('id')
        .eq('code', pipeline.code)
        .single();

      if (existing) {
        console.log(`⏭️  Воронка "${pipeline.name}" уже существует`);
        continue;
      }

      const { data, error } = await supabase
        .from('pipelines')
        .insert(pipeline)
        .select()
        .single();

      if (error) {
        console.log(`⚠️  Ошибка добавления "${pipeline.name}": ${error.message}`);
      } else {
        console.log(`✅ Добавлена воронка "${pipeline.name}"`);
      }
    }

    // Шаг 3: Добавляем этапы для каждой воронки
    const stagesConfig = {
      leads: [
        { name: 'Новый', code: 'new_leads', color: '#3B82F6', sort_order: 1 },
        { name: 'В работе', code: 'in_progress_leads', color: '#F59E0B', sort_order: 2 },
        { name: 'Выбор билетов', code: 'negotiation_leads', color: '#8B5CF6', sort_order: 3 },
        { name: 'Оплата', code: 'payment_leads', color: '#EC4899', sort_order: 4 },
        { name: 'Успешно', code: 'won_leads', color: '#10B981', sort_order: 5, is_final: true, is_success: true },
        { name: 'Отказ', code: 'lost_leads', color: '#EF4444', sort_order: 6, is_final: true, is_success: false },
      ],
      pk: [
        { name: 'Перезвонить', code: 'callback_pk', color: '#6B7280', sort_order: 1 },
        { name: 'Думает', code: 'thinking_pk', color: '#F59E0B', sort_order: 2 },
        { name: 'Заинтересован', code: 'interested_pk', color: '#8B5CF6', sort_order: 3 },
        { name: 'Выбор билетов', code: 'negotiation_pk', color: '#EC4899', sort_order: 4 },
        { name: 'Оплата', code: 'payment_pk', color: '#3B82F6', sort_order: 5 },
        { name: 'Успешно', code: 'won_pk', color: '#10B981', sort_order: 6, is_final: true, is_success: true },
        { name: 'Отказ', code: 'lost_pk', color: '#EF4444', sort_order: 7, is_final: true, is_success: false },
      ],
      kb: [
        { name: 'В очереди', code: 'queue_kb', color: '#6B7280', sort_order: 1 },
        { name: 'Недозвон', code: 'no_answer_kb', color: '#F59E0B', sort_order: 2 },
        { name: 'Обсуждаем', code: 'discussing_kb', color: '#8B5CF6', sort_order: 3 },
        { name: 'Предложение', code: 'offer_kb', color: '#EC4899', sort_order: 4 },
        { name: 'Оплата', code: 'payment_kb', color: '#3B82F6', sort_order: 5 },
        { name: 'Повторная покупка', code: 'repeat_kb', color: '#10B981', sort_order: 6, is_final: true, is_success: true },
        { name: 'Отказ', code: 'lost_kb', color: '#EF4444', sort_order: 7, is_final: true, is_success: false },
      ],
      mailings: [
        { name: 'В базе рассылок', code: 'in_base_mail', color: '#6B7280', sort_order: 1 },
        { name: 'Рассылка отправлена', code: 'sent_mail', color: '#3B82F6', sort_order: 2 },
        { name: 'Открыл', code: 'opened_mail', color: '#F59E0B', sort_order: 3 },
        { name: 'Заинтересован', code: 'interested_mail', color: '#EC4899', sort_order: 4 },
        { name: 'Оплатил', code: 'paid_mail', color: '#10B981', sort_order: 5, is_final: true, is_success: true },
        { name: 'Отписался', code: 'unsub_mail', color: '#EF4444', sort_order: 6, is_final: true, is_success: false },
      ],
    };

    console.log('\n📊 Добавление этапов воронок...\n');

    for (const [pipelineCode, stages] of Object.entries(stagesConfig)) {
      // Получаем ID воронки
      const { data: pipeline } = await supabase
        .from('pipelines')
        .select('id')
        .eq('code', pipelineCode)
        .single();

      if (!pipeline) {
        console.log(`⚠️  Воронка ${pipelineCode} не найдена`);
        continue;
      }

      for (const stage of stages) {
        // Базовые поля этапа (без is_final, is_success - их может не быть в БД)
        const stageData = {
          pipeline_id: pipeline.id,
          name: stage.name,
          code: stage.code,
          color: stage.color,
          sort_order: stage.sort_order,
        };

        // Проверяем существует ли этап
        const { data: existingStage } = await supabase
          .from('pipeline_stages')
          .select('id')
          .eq('pipeline_id', pipeline.id)
          .eq('code', stage.code)
          .single();

        if (existingStage) {
          continue; // Пропускаем существующие
        }

        const { error } = await supabase
          .from('pipeline_stages')
          .insert(stageData);

        if (error) {
          console.log(`⚠️  Ошибка: ${stage.name} - ${error.message}`);
        }
      }

      // Подсчитываем этапы
      const { count } = await supabase
        .from('pipeline_stages')
        .select('id', { count: 'exact', head: true })
        .eq('pipeline_id', pipeline.id);

      console.log(`✅ Воронка "${pipelineCode}": ${count} этапов`);
    }

    // Финальная проверка
    console.log('\n📋 Итоговые воронки:');
    const { data: finalPipelines } = await supabase
      .from('pipelines')
      .select('id, name, code')
      .order('sort_order');

    if (finalPipelines) {
      for (const p of finalPipelines) {
        const { count } = await supabase
          .from('pipeline_stages')
          .select('id', { count: 'exact', head: true })
          .eq('pipeline_id', p.id);
        console.log(`   ✓ ${p.name} (${p.code}) - ${count} этапов`);
      }
    }

    console.log('\n🎉 Миграция завершена успешно!');
    console.log('   Обновите страницу воронки в браузере.\n');

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

applyMigration();
