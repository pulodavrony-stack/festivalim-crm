// =============================================
// TEAM TYPES: Multi-tenant support
// =============================================

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
}

export const DEFAULT_SCHEMA = 'atlant';
