-- =============================================
-- FIX: Create B2B deals for Tula schools in kstati
-- + Add manager_id to clients for contact assignment
-- =============================================

-- 1. Создаём B2B сделки для всех клиентов Тулы в kstati
DO $$
DECLARE
    v_b2b_pipeline_id UUID;
    v_first_stage_id UUID;
    v_client RECORD;
    v_deals_created INTEGER := 0;
BEGIN
    -- Get B2B pipeline ID
    SELECT id INTO v_b2b_pipeline_id 
    FROM kstati.pipelines WHERE code = 'b2b';
    
    IF v_b2b_pipeline_id IS NULL THEN
        RAISE NOTICE 'B2B pipeline not found in kstati!';
        RETURN;
    END IF;
    
    -- Get first stage (first_contact)
    SELECT id INTO v_first_stage_id 
    FROM kstati.pipeline_stages 
    WHERE pipeline_id = v_b2b_pipeline_id AND code = 'first_contact';
    
    IF v_first_stage_id IS NULL THEN
        RAISE NOTICE 'first_contact stage not found!';
        RETURN;
    END IF;
    
    RAISE NOTICE 'B2B Pipeline: %, First Stage: %', v_b2b_pipeline_id, v_first_stage_id;
    
    -- Create deals for all Tula clients that don't have deals yet
    FOR v_client IN 
        SELECT c.id, c.full_name, c.notes
        FROM kstati.clients c
        WHERE c.notes LIKE '%Тула%' 
          AND NOT EXISTS (
              SELECT 1 FROM kstati.deals d WHERE d.client_id = c.id
          )
    LOOP
        INSERT INTO kstati.deals (
            client_id, pipeline_id, stage_id, 
            title, amount, is_b2b, status
        ) VALUES (
            v_client.id, 
            v_b2b_pipeline_id, 
            v_first_stage_id,
            'B2B: ' || v_client.full_name,
            0, 
            true, 
            'active'
        );
        v_deals_created := v_deals_created + 1;
    END LOOP;
    
    RAISE NOTICE '✅ Created % B2B deals in kstati schema', v_deals_created;
END $$;

-- 2. Добавляем колонку manager_id в kstati.clients если нет
ALTER TABLE kstati.clients ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.managers(id) ON DELETE SET NULL;
ALTER TABLE atlant.clients ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.managers(id) ON DELETE SET NULL;
ALTER TABLE etazhi.clients ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.managers(id) ON DELETE SET NULL;

-- Индексы
CREATE INDEX IF NOT EXISTS idx_kstati_clients_manager ON kstati.clients(manager_id);
CREATE INDEX IF NOT EXISTS idx_atlant_clients_manager ON atlant.clients(manager_id);
CREATE INDEX IF NOT EXISTS idx_etazhi_clients_manager ON etazhi.clients(manager_id);

-- 3. Verify
SELECT 'kstati.deals' as info, COUNT(*) as total, 
       COUNT(*) FILTER (WHERE is_b2b = true) as b2b_deals
FROM kstati.deals;

SELECT 'kstati.clients (Тула)' as info, COUNT(*) as total
FROM kstati.clients WHERE notes LIKE '%Тула%';
