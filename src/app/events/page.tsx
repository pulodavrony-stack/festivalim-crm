'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSchemaClient, useTeam } from '@/components/providers/TeamProvider';

interface Event {
  id: string;
  event_date: string;
  event_time: string;
  venue_name: string;
  venue_address: string;
  status: string;
  total_tickets: number;
  sold_tickets: number;
  min_price: number;
  max_price: number;
  show: {
    id: string;
    title: string;
    poster_url: string;
  };
  city: {
    id: string;
    name: string;
  };
}

const statusLabels: Record<string, { label: string; color: string }> = {
  planned: { label: 'Запланировано', color: 'bg-gray-500' },
  on_sale: { label: 'В продаже', color: 'bg-green-500' },
  sold_out: { label: 'Распродано', color: 'bg-red-500' },
  completed: { label: 'Завершено', color: 'bg-blue-500' },
  cancelled: { label: 'Отменено', color: 'bg-gray-400' },
};

export default function EventsPage() {
  const supabase = useSchemaClient();
  const { teamSchema, isLoading: teamLoading } = useTeam();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');

  useEffect(() => {
    if (!teamLoading) {
      loadEvents();
    }
  }, [filter, teamLoading, teamSchema]);

  async function loadEvents() {
    let query = supabase
      .from('events')
      .select(`
        *,
        show:shows(id, title, poster_url),
        city:cities(id, name)
      `)
      .order('event_date', { ascending: filter === 'past' ? false : true });

    if (filter === 'upcoming') {
      query = query.gte('event_date', new Date().toISOString().split('T')[0]);
    } else if (filter === 'past') {
      query = query.lt('event_date', new Date().toISOString().split('T')[0]);
    }

    const { data } = await query.limit(50);
    
    if (data) setEvents(data);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-2xl">🎭</Link>
              <h1 className="text-xl font-bold text-gray-900">
                События
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/events/new"
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                + Добавить событие
              </Link>
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                ← Назад
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex space-x-2 mb-6">
          {[
            { value: 'upcoming', label: 'Предстоящие' },
            { value: 'past', label: 'Прошедшие' },
            { value: 'all', label: 'Все' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value as 'upcoming' | 'past' | 'all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f.value
                  ? 'bg-red-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Events Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎭</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Нет событий
            </h3>
            <p className="text-gray-500 mb-4">
              Создайте первое событие для начала работы
            </p>
            <Link
              href="/events/new"
              className="inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              + Добавить событие
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Event image placeholder */}
                <div className="h-40 bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center">
                  <span className="text-6xl text-white/30">🎭</span>
                </div>

                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${
                        statusLabels[event.status]?.color || 'bg-gray-500'
                      }`}
                    >
                      {statusLabels[event.status]?.label || event.status}
                    </span>
                    <span className="text-sm text-gray-500">{event.city?.name}</span>
                  </div>

                  <h3 className="font-semibold text-gray-900 mb-1">
                    {event.show?.title || 'Без названия'}
                  </h3>

                  <div className="text-sm text-gray-500 mb-3">
                    {new Date(event.event_date).toLocaleDateString('ru-RU', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })}
                    {event.event_time && ` в ${event.event_time.slice(0, 5)}`}
                  </div>

                  {event.venue_name && (
                    <div className="text-sm text-gray-500 mb-3">
                      📍 {event.venue_name}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-semibold text-gray-900">
                        {event.sold_tickets || 0}
                      </span>
                      <span className="text-gray-500">
                        /{event.total_tickets || '∞'} билетов
                      </span>
                    </div>
                    {event.min_price && (
                      <div className="text-sm font-medium text-green-600">
                        от {event.min_price.toLocaleString('ru-RU')} ₽
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
