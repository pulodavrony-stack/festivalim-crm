// =============================================
// TEAM TYPES: Multi-tenant support
// =============================================

export type SalesChannel = 'tilda' | 'site' | 'telegram' | 'instagram' | 'vk' | 'avito' | 'yandex' | 'other';

export interface Team {
  id: string;
  name: string;
  slug: string;
  schema_name: string;
  logo_url?: string;
  
  // Телефония UIS
  uis_api_key?: string;
  uis_virtual_number?: string;
  webrtc_token?: string;
  
  // Юридическое лицо
  legal_name?: string;
  inn?: string;
  kpp?: string;
  ogrn?: string;
  legal_address?: string;
  bank_name?: string;
  bank_bik?: string;
  bank_account?: string;
  correspondent_account?: string;
  
  // Каналы продаж и интеграции
  sales_channels?: SalesChannel[];
  tilda_project_id?: string;
  tilda_api_key?: string;
  telegram_bot_token?: string;
  telegram_channel_id?: string;
  whatsapp_business_id?: string;
  whatsapp_api_token?: string;
  instagram_account?: string;
  vk_group_id?: string;
  
  // Статистика
  total_clients?: number;
  total_deals?: number;
  total_revenue?: number;
  total_tickets_sold?: number;
  stats_updated_at?: string;
  
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamContext {
  team: Team | null;
  teamId: string | null;
  teamSchema: string;
  isLoading: boolean;
  canSwitchTeams: boolean;
  allTeams: Team[];
  switchTeam: (teamId: string) => void;
  managerId: string | null;
  managerRole: string | null;
  isAdmin: boolean;
}

export const DEFAULT_SCHEMA = 'atlant';
