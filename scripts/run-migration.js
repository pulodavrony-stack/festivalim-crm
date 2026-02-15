// Скрипт для выполнения миграции в Supabase
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rlttkzmpazgdkypvhtpd.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY не установлен');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('Запуск миграции воронок...\n');

  try {
    // 1. Добавляем воронки (без client_type, если колонки нет)
    console.log('1. Добавление воронок...');
    
    const pipelines = [
      { id: '11111111-1111-1111-1111-111111111111', name: 'Новые клиенты', code: 'new_clients', is_default: true, sort_order: 1 },
      { id: '22222222-2222-2222-2222-222222222222', name: 'Клиентская база', code: 'kb', is_default: false, sort_order: 2 },
      { id: '33333333-3333-3333-3333-333333333333', name: 'Потенциальные клиенты', code: 'pk', is_default: false, sort_order: 3 },
    ];

    for (const pipeline of pipelines) {
      const { error } = await supabase.from('pipelines').upsert(pipeline, { onConflict: 'id' });
      if (error) {
        console.error(`  ✗ Ошибка ${pipeline.name}:`, error.message);
      } else {
        console.log(`  ✓ ${pipeline.name}`);
      }
    }

    // 2. Добавляем этапы для "Новые клиенты" (без is_final, is_success)
    console.log('\n2. Добавление этапов "Новые клиенты"...');
    const stagesNewClients = [
      { id: 'a1000001-0001-0001-0001-000000000001', pipeline_id: '11111111-1111-1111-1111-111111111111', name: 'Новые лиды', code: 'new_leads', color: '#6366f1', sort_order: 1 },
      { id: 'a1000001-0001-0001-0001-000000000002', pipeline_id: '11111111-1111-1111-1111-111111111111', name: 'Приняты в работу', code: 'accepted', color: '#8b5cf6', sort_order: 2 },
      { id: 'a1000001-0001-0001-0001-000000000003', pipeline_id: '11111111-1111-1111-1111-111111111111', name: 'Не вышел на связь', code: 'no_contact', color: '#f59e0b', sort_order: 3 },
      { id: 'a1000001-0001-0001-0001-000000000004', pipeline_id: '11111111-1111-1111-1111-111111111111', name: 'Недозвон', code: 'no_answer', color: '#ef4444', sort_order: 4 },
      { id: 'a1000001-0001-0001-0001-000000000005', pipeline_id: '11111111-1111-1111-1111-111111111111', name: 'Автоответчик', code: 'voicemail', color: '#f97316', sort_order: 5 },
      { id: 'a1000001-0001-0001-0001-000000000006', pipeline_id: '11111111-1111-1111-1111-111111111111', name: 'В мессенджере без спича', code: 'messenger_no_speech', color: '#06b6d4', sort_order: 6 },
      { id: 'a1000001-0001-0001-0001-000000000007', pipeline_id: '11111111-1111-1111-1111-111111111111', name: 'Отправил в мессенджер', code: 'sent_messenger', color: '#0ea5e9', sort_order: 7 },
      { id: 'a1000001-0001-0001-0001-000000000008', pipeline_id: '11111111-1111-1111-1111-111111111111', name: 'Контакт не состоялся', code: 'contact_failed', color: '#64748b', sort_order: 8 },
      { id: 'a1000001-0001-0001-0001-000000000009', pipeline_id: '11111111-1111-1111-1111-111111111111', name: 'Предоплата', code: 'prepayment', color: '#22c55e', sort_order: 9 },
      { id: 'a1000001-0001-0001-0001-000000000010', pipeline_id: '11111111-1111-1111-1111-111111111111', name: 'Сделка', code: 'deal_won', color: '#10b981', sort_order: 10 },
      { id: 'a1000001-0001-0001-0001-000000000011', pipeline_id: '11111111-1111-1111-1111-111111111111', name: 'Долгий ящик', code: 'long_term', color: '#94a3b8', sort_order: 11 },
    ];

    for (const stage of stagesNewClients) {
      const { error } = await supabase.from('pipeline_stages').upsert(stage, { onConflict: 'id' });
      if (error) console.error(`  ✗ ${stage.name}:`, error.message);
      else console.log(`  ✓ ${stage.name}`);
    }

    // 3. Добавляем этапы для "КБ"
    console.log('\n3. Добавление этапов "Клиентская база"...');
    const stagesKB = [
      { id: 'b2000002-0002-0002-0002-000000000001', pipeline_id: '22222222-2222-2222-2222-222222222222', name: 'База постоянных клиентов', code: 'kb_base', color: '#6366f1', sort_order: 1 },
      { id: 'b2000002-0002-0002-0002-000000000002', pipeline_id: '22222222-2222-2222-2222-222222222222', name: 'После автооплат', code: 'after_autopay', color: '#8b5cf6', sort_order: 2 },
      { id: 'b2000002-0002-0002-0002-000000000003', pipeline_id: '22222222-2222-2222-2222-222222222222', name: 'Уже был контакт', code: 'had_contact', color: '#a855f7', sort_order: 3 },
      { id: 'b2000002-0002-0002-0002-000000000004', pipeline_id: '22222222-2222-2222-2222-222222222222', name: 'Принята в работу', code: 'accepted', color: '#8b5cf6', sort_order: 4 },
      { id: 'b2000002-0002-0002-0002-000000000005', pipeline_id: '22222222-2222-2222-2222-222222222222', name: 'Контакт не состоялся', code: 'contact_failed', color: '#64748b', sort_order: 5 },
      { id: 'b2000002-0002-0002-0002-000000000006', pipeline_id: '22222222-2222-2222-2222-222222222222', name: 'Недозвон', code: 'no_answer', color: '#ef4444', sort_order: 6 },
      { id: 'b2000002-0002-0002-0002-000000000007', pipeline_id: '22222222-2222-2222-2222-222222222222', name: 'В мессенджере без спича', code: 'messenger_no_speech', color: '#06b6d4', sort_order: 7 },
      { id: 'b2000002-0002-0002-0002-000000000008', pipeline_id: '22222222-2222-2222-2222-222222222222', name: 'Отправил в мессенджер', code: 'sent_messenger', color: '#0ea5e9', sort_order: 8 },
      { id: 'b2000002-0002-0002-0002-000000000009', pipeline_id: '22222222-2222-2222-2222-222222222222', name: 'Предоплата', code: 'prepayment', color: '#22c55e', sort_order: 9 },
      { id: 'b2000002-0002-0002-0002-000000000010', pipeline_id: '22222222-2222-2222-2222-222222222222', name: 'Сделка', code: 'deal_won', color: '#10b981', sort_order: 10 },
      { id: 'b2000002-0002-0002-0002-000000000011', pipeline_id: '22222222-2222-2222-2222-222222222222', name: 'Долгий ящик', code: 'long_term', color: '#94a3b8', sort_order: 11 },
    ];

    for (const stage of stagesKB) {
      const { error } = await supabase.from('pipeline_stages').upsert(stage, { onConflict: 'id' });
      if (error) console.error(`  ✗ ${stage.name}:`, error.message);
      else console.log(`  ✓ ${stage.name}`);
    }

    // 4. Добавляем этапы для "ПК"
    console.log('\n4. Добавление этапов "Потенциальные клиенты"...');
    const stagesPK = [
      { id: 'c3000003-0003-0003-0003-000000000001', pipeline_id: '33333333-3333-3333-3333-333333333333', name: 'База ПК', code: 'pk_base', color: '#6366f1', sort_order: 1 },
      { id: 'c3000003-0003-0003-0003-000000000002', pipeline_id: '33333333-3333-3333-3333-333333333333', name: 'Принята в работу', code: 'accepted', color: '#8b5cf6', sort_order: 2 },
      { id: 'c3000003-0003-0003-0003-000000000003', pipeline_id: '33333333-3333-3333-3333-333333333333', name: 'Недозвон', code: 'no_answer', color: '#ef4444', sort_order: 3 },
      { id: 'c3000003-0003-0003-0003-000000000004', pipeline_id: '33333333-3333-3333-3333-333333333333', name: 'Отправил в мессенджер после разговора', code: 'sent_messenger_after', color: '#0ea5e9', sort_order: 4 },
      { id: 'c3000003-0003-0003-0003-000000000005', pipeline_id: '33333333-3333-3333-3333-333333333333', name: 'Контакт не состоялся', code: 'contact_failed', color: '#64748b', sort_order: 5 },
      { id: 'c3000003-0003-0003-0003-000000000006', pipeline_id: '33333333-3333-3333-3333-333333333333', name: 'Предоплата', code: 'prepayment', color: '#22c55e', sort_order: 6 },
      { id: 'c3000003-0003-0003-0003-000000000007', pipeline_id: '33333333-3333-3333-3333-333333333333', name: 'Сделка', code: 'deal_won', color: '#10b981', sort_order: 7 },
      { id: 'c3000003-0003-0003-0003-000000000008', pipeline_id: '33333333-3333-3333-3333-333333333333', name: 'Следующий раз', code: 'next_time', color: '#94a3b8', sort_order: 8 },
    ];

    for (const stage of stagesPK) {
      const { error } = await supabase.from('pipeline_stages').upsert(stage, { onConflict: 'id' });
      if (error) console.error(`  ✗ ${stage.name}:`, error.message);
      else console.log(`  ✓ ${stage.name}`);
    }

    // 5. Проверяем результат
    console.log('\n5. Проверка результата...');
    const { data: pipelinesCheck } = await supabase.from('pipelines').select('name, code').order('sort_order');
    const { data: stagesCheck } = await supabase.from('pipeline_stages').select('name, pipeline_id').order('sort_order');
    
    console.log(`\n✓ Миграция завершена!`);
    console.log(`\nВоронки (${pipelinesCheck?.length || 0}):`);
    pipelinesCheck?.forEach(p => console.log(`  • ${p.name} (${p.code})`));
    
    console.log(`\nВсего этапов: ${stagesCheck?.length || 0}`);

  } catch (err) {
    console.error('Ошибка миграции:', err);
    process.exit(1);
  }
}

runMigration();
