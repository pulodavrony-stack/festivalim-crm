const { Client } = require('pg');

const connectionString = 'postgresql://postgres.rlttkzmpazgdkypvhtpd:rD5rBSeHDjBt4GAE@aws-0-eu-central-1.pooler.supabase.com:6543/postgres';

const sql = `
CREATE TABLE IF NOT EXISTS stage_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    action_config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stage_automations_stage_id ON stage_automations(stage_id);
`;

async function run() {
  console.log('Connecting to Supabase...');
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected!');
    
    console.log('Executing SQL...');
    const result = await client.query(sql);
    console.log('Result:', result);
    
    // Insert automations
    const insertSql = `
      INSERT INTO stage_automations (stage_id, action_type, action_config)
      SELECT id, 'create_task', '{"task_type": "call", "title": "Перезвонить клиенту", "delay_hours": 2, "priority": "high"}'::jsonb
      FROM pipeline_stages
      WHERE LOWER(name) LIKE '%недозвон%'
      ON CONFLICT DO NOTHING;
      
      INSERT INTO stage_automations (stage_id, action_type, action_config)
      SELECT id, 'create_task', '{"task_type": "call", "title": "Перезвонить (автоответчик)", "delay_hours": 4, "priority": "normal"}'::jsonb
      FROM pipeline_stages
      WHERE LOWER(name) LIKE '%автоответчик%'
      ON CONFLICT DO NOTHING;
      
      INSERT INTO stage_automations (stage_id, action_type, action_config)
      SELECT id, 'create_task', '{"task_type": "message", "title": "Проверить ответ в мессенджере", "delay_hours": 24, "priority": "normal"}'::jsonb
      FROM pipeline_stages
      WHERE LOWER(name) LIKE '%отправил в мессенджер%'
      ON CONFLICT DO NOTHING;
      
      INSERT INTO stage_automations (stage_id, action_type, action_config)
      SELECT id, 'create_task', '{"task_type": "call", "title": "Напомнить об оплате", "delay_hours": 48, "priority": "high"}'::jsonb
      FROM pipeline_stages
      WHERE LOWER(name) LIKE '%предоплата%'
      ON CONFLICT DO NOTHING;
    `;
    
    console.log('Inserting automations...');
    await client.query(insertSql);
    
    // Check results
    const check = await client.query('SELECT COUNT(*) FROM stage_automations');
    console.log('Total automations:', check.rows[0].count);
    
    console.log('Done!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
