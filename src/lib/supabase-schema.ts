// =============================================
// SUPABASE SCHEMA CLIENT: Multi-tenant support
// =============================================

import { createBrowserClient } from '@supabase/ssr';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_SCHEMA } from '@/types/team';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Cache клиентов по схемам
const schemaClients: Map<string, SupabaseClient> = new Map();

/**
 * Создает Supabase клиент для конкретной PostgreSQL-схемы
 * @param schema - имя схемы (kstati, atlant, etazhi)
 */
export function createSchemaClient(schema: string = DEFAULT_SCHEMA): SupabaseClient {
  // Проверяем кеш
  if (schemaClients.has(schema)) {
    return schemaClients.get(schema)!;
  }
  
  // Создаем новый клиент с указанной схемой
  const client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    db: {
      schema: schema
    }
  });
  
  // Кешируем
  schemaClients.set(schema, client);
  
  return client;
}

/**
 * Создает серверный Supabase клиент для конкретной схемы (bypass RLS)
 * @param schema - имя схемы
 */
export function createSchemaAdminClient(schema: string = DEFAULT_SCHEMA): SupabaseClient {
  if (!supabaseServiceKey) {
    return createSchemaClient(schema);
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: schema
    }
  });
}

/**
 * Клиент для public схемы (teams, managers)
 */
export function getPublicClient(): SupabaseClient {
  return createSchemaClient('public');
}

/**
 * Серверный клиент для public схемы
 */
export function getPublicAdminClient(): SupabaseClient {
  return createSchemaAdminClient('public');
}

// Реэкспортируем стандартный клиент для обратной совместимости
// Он будет использовать схему из контекста команды
export { supabase } from './supabase';
