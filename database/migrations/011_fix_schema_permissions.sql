-- =============================================
-- Migration 011: Fix schema permissions for browser access
-- Problem: Browser Supabase client (anon key) cannot access 
-- kstati/atlant/etazhi schemas because:
-- 1. No GRANT USAGE on schemas
-- 2. No GRANT on tables  
-- 3. Schemas not exposed via PostgREST
-- =============================================

-- ===========================================
-- 1. EXPOSE SCHEMAS VIA POSTGREST
-- ===========================================
-- This tells PostgREST to accept requests for these schemas
ALTER ROLE authenticator SET pgrst.db_schemas = 'public, storage, graphql_public, kstati, atlant, etazhi';

-- Reload PostgREST configuration
NOTIFY pgrst, 'reload config';

-- ===========================================
-- 2. GRANT USAGE ON SCHEMAS
-- ===========================================
GRANT USAGE ON SCHEMA kstati TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA atlant TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA etazhi TO anon, authenticated, service_role;

-- ===========================================
-- 3. GRANT TABLE PERMISSIONS
-- ===========================================

-- kstati schema
GRANT ALL ON ALL TABLES IN SCHEMA kstati TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA kstati TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA kstati TO anon;

-- atlant schema
GRANT ALL ON ALL TABLES IN SCHEMA atlant TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA atlant TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA atlant TO anon;

-- etazhi schema
GRANT ALL ON ALL TABLES IN SCHEMA etazhi TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA etazhi TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA etazhi TO anon;

-- ===========================================
-- 4. GRANT SEQUENCE PERMISSIONS (for inserts)
-- ===========================================
GRANT USAGE ON ALL SEQUENCES IN SCHEMA kstati TO authenticated, service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA atlant TO authenticated, service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA etazhi TO authenticated, service_role;

-- ===========================================
-- 5. DEFAULT PRIVILEGES FOR FUTURE TABLES
-- ===========================================
ALTER DEFAULT PRIVILEGES IN SCHEMA kstati GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA kstati GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA kstati GRANT SELECT ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA atlant GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA atlant GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA atlant GRANT SELECT ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA etazhi GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA etazhi GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA etazhi GRANT SELECT ON TABLES TO anon;

-- ===========================================
-- 6. ENABLE RLS + POLICIES ON ALL TABLES
-- ===========================================
DO $$
DECLARE
  schema_name TEXT;
  tbl TEXT;
BEGIN
  FOR schema_name IN SELECT unnest(ARRAY['kstati', 'atlant', 'etazhi'])
  LOOP
    FOR tbl IN 
      SELECT tablename FROM pg_tables WHERE schemaname = schema_name
    LOOP
      -- Enable RLS
      EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', schema_name, tbl);
      
      -- Policy: service_role full access
      EXECUTE format('DROP POLICY IF EXISTS "service_full_%s" ON %I.%I', tbl, schema_name, tbl);
      EXECUTE format('CREATE POLICY "service_full_%s" ON %I.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', tbl, schema_name, tbl);
      
      -- Policy: authenticated full access
      EXECUTE format('DROP POLICY IF EXISTS "auth_full_%s" ON %I.%I', tbl, schema_name, tbl);
      EXECUTE format('CREATE POLICY "auth_full_%s" ON %I.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl, schema_name, tbl);
      
      -- Policy: anon read access
      EXECUTE format('DROP POLICY IF EXISTS "anon_read_%s" ON %I.%I', tbl, schema_name, tbl);
      EXECUTE format('CREATE POLICY "anon_read_%s" ON %I.%I FOR SELECT TO anon USING (true)', tbl, schema_name, tbl);
      
      RAISE NOTICE 'Configured RLS for %.%', schema_name, tbl;
    END LOOP;
  END LOOP;
END $$;

-- ===========================================
-- 7. VERIFY
-- ===========================================
SELECT 'Schema permissions migration completed!' as result;
SELECT schemaname, count(*) as tables 
FROM pg_tables 
WHERE schemaname IN ('kstati', 'atlant', 'etazhi') 
GROUP BY schemaname 
ORDER BY schemaname;
