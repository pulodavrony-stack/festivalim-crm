-- =============================================
-- B2B MODULE: Companies, Contacts, Contracts
-- =============================================

-- 0. UPDATE MANAGERS TABLE (add access control fields)
ALTER TABLE managers ADD COLUMN IF NOT EXISTS has_b2c_access BOOLEAN DEFAULT true;
ALTER TABLE managers ADD COLUMN IF NOT EXISTS has_b2b_access BOOLEAN DEFAULT false;

UPDATE managers SET has_b2c_access = true, has_b2b_access = false 
WHERE role IN ('manager', 'marketer');

-- 1. COMPANIES TABLE
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    name TEXT NOT NULL,
    legal_name TEXT,
    short_name TEXT,
    company_type TEXT CHECK (company_type IN ('school', 'kindergarten', 'corp', 'gov', 'other')) DEFAULT 'corp',
    
    inn TEXT,
    kpp TEXT,
    ogrn TEXT,
    legal_address TEXT,
    actual_address TEXT,
    bank_name TEXT,
    bank_account TEXT,
    correspondent_account TEXT,
    bik TEXT,
    
    phone TEXT,
    email TEXT,
    website TEXT,
    city_id UUID REFERENCES cities(id) ON DELETE SET NULL,
    
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklist')),
    manager_id UUID REFERENCES managers(id) ON DELETE SET NULL,
    
    total_contracts INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    first_contract_date DATE,
    last_contract_date DATE,
    
    payment_terms TEXT,
    payment_delay_days INTEGER DEFAULT 0,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_manager ON companies(manager_id);
CREATE INDEX IF NOT EXISTS idx_companies_city ON companies(city_id);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_inn ON companies(inn);
CREATE INDEX IF NOT EXISTS idx_companies_type ON companies(company_type);

-- 2. COMPANY CONTACTS TABLE
CREATE TABLE IF NOT EXISTS company_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    full_name TEXT NOT NULL,
    position TEXT,
    phone TEXT,
    email TEXT,
    
    is_primary BOOLEAN DEFAULT false,
    is_decision_maker BOOLEAN DEFAULT false,
    
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_contacts_company ON company_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_company_contacts_client ON company_contacts(client_id);

-- 3. CONTRACTS TABLE
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES company_contacts(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES managers(id) ON DELETE SET NULL,
    
    contract_number TEXT NOT NULL,
    contract_date DATE NOT NULL,
    valid_from DATE,
    valid_to DATE,
    
    subject TEXT,
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    
    total_amount DECIMAL(12,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    final_amount DECIMAL(12,2) NOT NULL,
    
    payment_terms TEXT,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue')),
    paid_amount DECIMAL(12,2) DEFAULT 0,
    
    tickets_count INTEGER,
    ticket_price DECIMAL(12,2),
    
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'active', 'completed', 'cancelled')),
    
    contract_file_url TEXT,
    signed_at DATE,
    
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_company ON contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_event ON contracts(event_id);
CREATE INDEX IF NOT EXISTS idx_contracts_manager ON contracts(manager_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_payment_status ON contracts(payment_status);
CREATE INDEX IF NOT EXISTS idx_contracts_number ON contracts(contract_number);

-- 4. DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    
    document_type TEXT CHECK (document_type IN ('contract', 'invoice', 'act', 'receipt', 'other')),
    document_number TEXT,
    document_date DATE,
    
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_size INTEGER,
    
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'signed', 'cancelled')),
    
    created_by UUID REFERENCES managers(id) ON DELETE SET NULL,
    
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_contract ON documents(contract_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);

-- 5. UPDATE DEALS TABLE (add B2B fields)
ALTER TABLE deals ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES company_contacts(id) ON DELETE SET NULL;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS is_b2b BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_deals_company ON deals(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_contract ON deals(contract_id);

-- 6. CREATE B2B PIPELINE
INSERT INTO pipelines (name, code, is_default, sort_order)
VALUES ('B2B продажи', 'b2b', false, 5)
ON CONFLICT (code) DO NOTHING;

DO $$
DECLARE
    v_pipeline_id UUID;
BEGIN
    SELECT id INTO v_pipeline_id FROM pipelines WHERE code = 'b2b';
    
    IF v_pipeline_id IS NOT NULL THEN
        INSERT INTO pipeline_stages (pipeline_id, name, code, color, sort_order, is_final, is_success)
        VALUES 
            (v_pipeline_id, 'Первый контакт', 'first_contact', '#3B82F6', 1, false, false),
            (v_pipeline_id, 'Переговоры', 'negotiation', '#F59E0B', 2, false, false),
            (v_pipeline_id, 'КП отправлено', 'proposal_sent', '#8B5CF6', 3, false, false),
            (v_pipeline_id, 'Договор на подпись', 'contract_pending', '#EC4899', 4, false, false),
            (v_pipeline_id, 'Договор подписан', 'contract_signed', '#10B981', 5, false, false),
            (v_pipeline_id, 'Оплачено', 'paid', '#059669', 6, true, true),
            (v_pipeline_id, 'Услуга оказана', 'completed', '#047857', 7, true, true),
            (v_pipeline_id, 'Отказ', 'lost', '#EF4444', 8, true, false)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 7. TRIGGER: Update company statistics on contract change
CREATE OR REPLACE FUNCTION update_company_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE companies SET
        total_contracts = (SELECT COUNT(*) FROM contracts WHERE company_id = NEW.company_id),
        total_revenue = (SELECT COALESCE(SUM(final_amount), 0) FROM contracts WHERE company_id = NEW.company_id AND status IN ('signed', 'active', 'completed')),
        first_contract_date = (SELECT MIN(contract_date) FROM contracts WHERE company_id = NEW.company_id),
        last_contract_date = (SELECT MAX(contract_date) FROM contracts WHERE company_id = NEW.company_id),
        updated_at = NOW()
    WHERE id = NEW.company_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_contracts_update_company_stats ON contracts;
CREATE TRIGGER tr_contracts_update_company_stats
    AFTER INSERT OR UPDATE ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_company_stats();

-- 8. RLS Policies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON companies FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON company_contacts FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON contracts FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON documents FOR ALL USING (true);

SELECT 'B2B module tables created successfully!' as result;
