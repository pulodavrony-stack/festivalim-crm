// =============================================
// B2B MODULE TYPES
// =============================================

export type CompanyType = 'school' | 'kindergarten' | 'corp' | 'gov' | 'other';
export type CompanyStatus = 'active' | 'inactive' | 'blacklist';
export type ContractStatus = 'draft' | 'sent' | 'signed' | 'active' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue';
export type DocumentType = 'contract' | 'invoice' | 'act' | 'receipt' | 'other';
export type DocumentStatus = 'draft' | 'sent' | 'signed' | 'cancelled';

// Labels for UI
export const CompanyTypeLabels: Record<CompanyType, string> = {
  school: 'Школа',
  kindergarten: 'Детский сад',
  corp: 'Корпорация',
  gov: 'Госучреждение',
  other: 'Другое',
};

export const CompanyStatusLabels: Record<CompanyStatus, string> = {
  active: 'Активна',
  inactive: 'Неактивна',
  blacklist: 'Чёрный список',
};

export const ContractStatusLabels: Record<ContractStatus, string> = {
  draft: 'Черновик',
  sent: 'Отправлен',
  signed: 'Подписан',
  active: 'Активный',
  completed: 'Завершён',
  cancelled: 'Отменён',
};

export const PaymentStatusLabels: Record<PaymentStatus, string> = {
  pending: 'Ожидает оплаты',
  partial: 'Частично оплачен',
  paid: 'Оплачен',
  overdue: 'Просрочен',
};

export const DocumentTypeLabels: Record<DocumentType, string> = {
  contract: 'Договор',
  invoice: 'Счёт',
  act: 'Акт',
  receipt: 'Квитанция',
  other: 'Другое',
};

// =============================================
// INTERFACES
// =============================================

export interface Company {
  id: string;
  name: string;
  legal_name?: string;
  short_name?: string;
  company_type: CompanyType;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  legal_address?: string;
  actual_address?: string;
  bank_name?: string;
  bank_account?: string;
  correspondent_account?: string;
  bik?: string;
  phone?: string;
  email?: string;
  website?: string;
  city_id?: string;
  status: CompanyStatus;
  manager_id?: string;
  total_contracts: number;
  total_revenue: number;
  first_contract_date?: string;
  last_contract_date?: string;
  payment_terms?: string;
  payment_delay_days: number;
  discount_percent: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyContact {
  id: string;
  company_id: string;
  full_name: string;
  position?: string;
  phone?: string;
  email?: string;
  is_primary: boolean;
  is_decision_maker: boolean;
  client_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  company_id: string;
  contact_id?: string;
  manager_id?: string;
  contract_number: string;
  contract_date: string;
  valid_from?: string;
  valid_to?: string;
  subject?: string;
  event_id?: string;
  total_amount: number;
  discount_percent: number;
  discount_amount: number;
  final_amount: number;
  payment_terms?: string;
  payment_status: PaymentStatus;
  paid_amount: number;
  tickets_count?: number;
  ticket_price?: number;
  status: ContractStatus;
  contract_file_url?: string;
  signed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface B2BDocument {
  id: string;
  company_id?: string;
  contract_id?: string;
  document_type: DocumentType;
  document_number?: string;
  document_date?: string;
  file_url: string;
  file_name?: string;
  file_size?: number;
  status: DocumentStatus;
  created_by?: string;
  notes?: string;
  created_at: string;
}

// Full interfaces with relations
export interface CompanyFull extends Company {
  city?: { id: string; name: string };
  manager?: { id: string; full_name: string };
  contacts?: CompanyContact[];
  contracts?: Contract[];
}

export interface ContractFull extends Contract {
  company?: Company;
  contact?: CompanyContact;
  manager?: { id: string; full_name: string };
  event?: { id: string; event_date: string; show?: { title: string } };
  documents?: B2BDocument[];
}

// Input types for forms
export interface CreateCompanyInput {
  name: string;
  legal_name?: string;
  company_type: CompanyType;
  inn?: string;
  kpp?: string;
  legal_address?: string;
  actual_address?: string;
  phone?: string;
  email?: string;
  city_id?: string;
  manager_id?: string;
  notes?: string;
}

export interface CreateContractInput {
  company_id: string;
  contact_id?: string;
  contract_number: string;
  contract_date: string;
  event_id?: string;
  tickets_count: number;
  ticket_price: number;
  discount_percent?: number;
  payment_terms?: string;
  notes?: string;
}
