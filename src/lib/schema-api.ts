/**
 * Client-side utility for writing to schema tables via the server API.
 * Uses service_role key on the server to bypass RLS/permissions.
 */

interface SchemaWriteOptions {
  schema: string;
  table: string;
  action: 'insert' | 'upsert' | 'update' | 'delete' | 'select';
  data?: any;
  filters?: Record<string, any>;
  filtersIn?: Record<string, any[]>;
  select?: string;
  order?: { column: string; ascending?: boolean };
  limit?: number;
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

/**
 * Insert one or more rows into a schema table.
 */
export async function schemaInsert<T = any>(
  schema: string,
  table: string,
  data: any,
  select?: string
): Promise<SchemaWriteResult<T>> {
  return schemaWrite<T>({ schema, table, action: 'insert', data, select });
}

/**
 * Update rows in a schema table.
 */
export async function schemaUpdate<T = any>(
  schema: string,
  table: string,
  data: any,
  filters: Record<string, any>,
  select?: string
): Promise<SchemaWriteResult<T>> {
  return schemaWrite<T>({ schema, table, action: 'update', data, filters, select });
}

/**
 * Delete rows from a schema table.
 */
export async function schemaDelete(
  schema: string,
  table: string,
  filters: Record<string, any>
): Promise<SchemaWriteResult> {
  return schemaWrite({ schema, table, action: 'delete', filters });
}
