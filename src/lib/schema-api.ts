/**
 * Client-side utility for reading/writing schema tables via the server API.
 * Uses service_role key on the server to bypass RLS/permissions.
 */

interface SchemaWriteOptions {
  schema: string;
  table: string;
  action: 'insert' | 'upsert' | 'update' | 'delete' | 'select';
  data?: any;
  filters?: Record<string, any>;
  filtersIn?: Record<string, any[]>;
  filtersGte?: Record<string, any>;
  filtersLte?: Record<string, any>;
  filtersNeq?: Record<string, any>;
  filtersIlike?: Record<string, string>;
  filtersNotNull?: string[];
  filtersIsNull?: string[];
  select?: string;
  order?: { column: string; ascending?: boolean } | { column: string; ascending?: boolean }[];
  limit?: number;
  single?: boolean;
}

interface SchemaWriteResult<T = any> {
  data: T | null;
  error: string | null;
}

export async function schemaWrite<T = any>(options: SchemaWriteOptions): Promise<SchemaWriteResult<T>> {
  try {
    const res = await fetch('/api/schema/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });

    const result = await res.json();

    if (!res.ok || result.error) {
      return { data: null, error: result.error || `HTTP ${res.status}` };
    }

    return { data: result.data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Network error' };
  }
}

export async function schemaInsert<T = any>(
  schema: string,
  table: string,
  data: any,
  select?: string
): Promise<SchemaWriteResult<T>> {
  return schemaWrite<T>({ schema, table, action: 'insert', data, select });
}

export async function schemaUpdate<T = any>(
  schema: string,
  table: string,
  data: any,
  filters: Record<string, any>,
  select?: string
): Promise<SchemaWriteResult<T>> {
  return schemaWrite<T>({ schema, table, action: 'update', data, filters, select });
}

export async function schemaDelete(
  schema: string,
  table: string,
  filters: Record<string, any>
): Promise<SchemaWriteResult> {
  return schemaWrite({ schema, table, action: 'delete', filters });
}

/**
 * Select rows from a schema table (server-side, bypasses RLS).
 */
export async function schemaSelect<T = any>(
  schema: string,
  table: string,
  options?: {
    select?: string;
    filters?: Record<string, any>;
    filtersIn?: Record<string, any[]>;
    filtersGte?: Record<string, any>;
    filtersLte?: Record<string, any>;
    filtersNeq?: Record<string, any>;
    filtersIlike?: Record<string, string>;
    filtersNotNull?: string[];
    filtersIsNull?: string[];
    order?: { column: string; ascending?: boolean } | { column: string; ascending?: boolean }[];
    limit?: number;
    single?: boolean;
  }
): Promise<SchemaWriteResult<T>> {
  return schemaWrite<T>({
    schema,
    table,
    action: 'select',
    select: options?.select,
    filters: options?.filters,
    filtersIn: options?.filtersIn,
    filtersGte: options?.filtersGte,
    filtersLte: options?.filtersLte,
    filtersNeq: options?.filtersNeq,
    filtersIlike: options?.filtersIlike,
    filtersNotNull: options?.filtersNotNull,
    filtersIsNull: options?.filtersIsNull,
    order: options?.order,
    limit: options?.limit,
    single: options?.single,
  });
}
