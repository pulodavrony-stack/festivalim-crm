// =============================================
// ФЕСТИВАЛИМ: Supabase Client
// =============================================

import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Клиент для браузера (использует cookies для SSR совместимости)
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Клиент для сервера (bypass RLS)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase;

// Типизация для таблиц (будет сгенерирована позже)
export type Database = {
  public: {
    Tables: {
      cities: {
        Row: {
          id: string;
          name: string;
          region: string | null;
          timezone: string;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['cities']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['cities']['Insert']>;
      };
      // ... остальные таблицы будут добавлены
    };
  };
};
