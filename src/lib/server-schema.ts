// =============================================
// SERVER SCHEMA: Multi-tenant support for API routes
// =============================================

import { NextRequest } from 'next/server';
import { createSchemaAdminClient, getPublicAdminClient } from './supabase-schema';
import { DEFAULT_SCHEMA } from '@/types/team';

/**
 * Получает схему из заголовка X-Team-Schema или возвращает схему по умолчанию
 */
export function getSchemaFromRequest(request: NextRequest): string {
  return request.headers.get('X-Team-Schema') || DEFAULT_SCHEMA;
}

/**
 * Создает Supabase admin клиент для схемы из запроса
 */
export function getSchemaClientFromRequest(request: NextRequest) {
  const schema = getSchemaFromRequest(request);
  return createSchemaAdminClient(schema);
}

/**
 * Получает схему менеджера по его ID
 */
export async function getManagerSchema(managerId: string): Promise<string> {
  const publicClient = getPublicAdminClient();
  
  const { data: manager } = await publicClient
    .from('managers')
    .select('team_id, teams(schema_name)')
    .eq('id', managerId)
    .single();
  
  if (manager?.teams && typeof manager.teams === 'object' && 'schema_name' in manager.teams) {
    return (manager.teams as { schema_name: string }).schema_name;
  }
  
  return DEFAULT_SCHEMA;
}
