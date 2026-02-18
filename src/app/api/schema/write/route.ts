import { NextRequest, NextResponse } from 'next/server';
import { createSchemaAdminClient } from '@/lib/supabase-schema';

const ALLOWED_TABLES = [
  'clients', 'activities', 'deals', 'pipeline_stages', 'pipelines',
  'client_tags', 'tags', 'client_contacts', 'client_pitches',
  'reminders', 'cities', 'lead_sources', 'events', 'shows',
  'event_shows', 'venues', 'event_clients',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      schema, table, action, data,
      filters, filtersIn, filtersGte, filtersLte, filtersNeq,
      filtersIlike, filtersNotNull, filtersIsNull,
      select, order, limit: queryLimit, single,
    } = body;

    if (!schema || !table || !action) {
      return NextResponse.json({ error: 'Missing schema, table, or action' }, { status: 400 });
    }

    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: `Table "${table}" is not allowed` }, { status: 403 });
    }

    const supabase = createSchemaAdminClient(schema);

    function applyFilters(q: any) {
      if (filters) {
        for (const [key, value] of Object.entries(filters)) {
          q = q.eq(key, value);
        }
      }
      if (filtersIn) {
        for (const [key, values] of Object.entries(filtersIn)) {
          q = q.in(key, values as any[]);
        }
      }
      if (filtersGte) {
        for (const [key, value] of Object.entries(filtersGte)) {
          q = q.gte(key, value);
        }
      }
      if (filtersLte) {
        for (const [key, value] of Object.entries(filtersLte)) {
          q = q.lte(key, value);
        }
      }
      if (filtersNeq) {
        for (const [key, value] of Object.entries(filtersNeq)) {
          q = q.neq(key, value);
        }
      }
      if (filtersIlike) {
        for (const [key, value] of Object.entries(filtersIlike)) {
          q = q.ilike(key, value as string);
        }
      }
      if (filtersNotNull) {
        for (const col of filtersNotNull as string[]) {
          q = q.not(col, 'is', null);
        }
      }
      if (filtersIsNull) {
        for (const col of filtersIsNull as string[]) {
          q = q.is(col, null);
        }
      }
      return q;
    }

    let query: any;

    switch (action) {
      case 'insert': {
        query = supabase.from(table).insert(data);
        if (select) query = query.select(select);
        break;
      }
      case 'upsert': {
        query = supabase.from(table).upsert(data);
        if (select) query = query.select(select);
        break;
      }
      case 'update': {
        query = applyFilters(supabase.from(table).update(data));
        if (select) query = query.select(select);
        break;
      }
      case 'delete': {
        query = applyFilters(supabase.from(table).delete());
        break;
      }
      case 'select': {
        query = applyFilters(supabase.from(table).select(select || '*'));
        if (order) {
          if (Array.isArray(order)) {
            for (const o of order) {
              query = query.order(o.column, { ascending: o.ascending ?? false });
            }
          } else {
            query = query.order(order.column, { ascending: order.ascending ?? false });
          }
        }
        if (queryLimit) query = query.limit(queryLimit);
        if (single) query = query.single();
        break;
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const result = await query;

    if (result.error) {
      console.error(`[Schema API] Error:`, result.error);
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ data: result.data, count: result.count });
  } catch (error: any) {
    console.error('[Schema API] Exception:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
