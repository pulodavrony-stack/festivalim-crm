import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Используем service role key для обхода RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/cron/cleanup-tags — удаление тегов прошедших спектаклей
export async function GET(request: Request) {
  // Проверка авторизации (простой secret)
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  
  if (secret !== (process.env.CRON_SECRET || 'festivalim-cron-2024')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Находим теги прошедших спектаклей
    const { data: pastTags, error: findError } = await supabase
      .from('tags')
      .select(`
        id, name, event_id,
        event:events!inner(id, event_date)
      `)
      .eq('category', 'event')
      .not('event_id', 'is', null);

    if (findError) {
      console.error('[Cron] Error finding tags:', findError);
      return NextResponse.json({ error: findError.message }, { status: 500 });
    }

    const today = new Date().toISOString().split('T')[0];
    const pastTagIds: string[] = [];

    for (const tag of (pastTags || [])) {
      const event = Array.isArray(tag.event) ? tag.event[0] : tag.event;
      if (event && event.event_date < today) {
        pastTagIds.push(tag.id);
      }
    }

    if (pastTagIds.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Нет тегов для удаления',
        deleted_links: 0,
        deleted_tags: 0
      });
    }

    // 2. Удаляем связи клиент-тег
    const { count: deletedLinks } = await supabase
      .from('client_tags')
      .delete({ count: 'exact' })
      .in('tag_id', pastTagIds);

    // 3. Удаляем сами теги (только те, что старше 7 дней)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    const oldPastTagIds: string[] = [];
    for (const tag of (pastTags || [])) {
      const event = Array.isArray(tag.event) ? tag.event[0] : tag.event;
      if (event && event.event_date < weekAgoStr) {
        oldPastTagIds.push(tag.id);
      }
    }

    let deletedTags = 0;
    if (oldPastTagIds.length > 0) {
      const { count } = await supabase
        .from('tags')
        .delete({ count: 'exact' })
        .in('id', oldPastTagIds);
      deletedTags = count || 0;
    }

    console.log(`[Cron] Cleanup: ${deletedLinks} links removed, ${deletedTags} old tags removed`);

    return NextResponse.json({
      success: true,
      message: `Удалено ${deletedLinks} связей, ${deletedTags} старых тегов`,
      deleted_links: deletedLinks || 0,
      deleted_tags: deletedTags,
      past_tags_found: pastTagIds.length
    });
  } catch (err: any) {
    console.error('[Cron] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
