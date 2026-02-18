'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSchemaClient, useTeam } from '@/components/providers/TeamProvider';
import { schemaInsert } from '@/lib/schema-api';

interface Show {
  id: string;
  title: string;
}

interface City {
  id: string;
  name: string;
}

export default function NewEventPage() {
  const router = useRouter();
  const supabase = useSchemaClient();
  const { teamSchema } = useTeam();
  const [loading, setLoading] = useState(false);
  const [shows, setShows] = useState<Show[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [form, setForm] = useState({
    show_id: '',
    city_id: '',
    event_date: '',
    event_time: '19:00',
    venue_name: '',
    venue_address: '',
    total_tickets: '',
    min_price: '',
    max_price: '',
    status: 'planned',
  });

  useEffect(() => {
    loadOptions();
  }, []);

  async function loadOptions() {
    const [showsResult, citiesResult] = await Promise.all([
      supabase.from('shows').select('id, title').eq('is_active', true).order('title'),
      supabase.from('cities').select('id, name').eq('is_active', true).order('sort_order'),
    ]);

    if (showsResult.data) setShows(showsResult.data);
    if (citiesResult.data) setCities(citiesResult.data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await schemaInsert(teamSchema, 'events', {
      show_id: form.show_id,
      city_id: form.city_id,
      event_date: form.event_date,
      event_time: form.event_time || null,
      venue_name: form.venue_name || null,
      venue_address: form.venue_address || null,
      total_tickets: form.total_tickets ? parseInt(form.total_tickets) : null,
      min_price: form.min_price ? parseFloat(form.min_price) : null,
      max_price: form.max_price ? parseFloat(form.max_price) : null,
      status: form.status,
      sold_tickets: 0,
    }, '*');

    if (error) {
      alert('Ошибка: ' + error);
      setLoading(false);
      return;
    }

    const eventId = Array.isArray(data) ? data[0]?.id : data?.id;
    if (eventId) router.push(`/events/${eventId}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/events" className="text-gray-500 hover:text-gray-700">
                ← События
              </Link>
              <span className="text-gray-300">/</span>
              <h1 className="text-xl font-bold text-gray-900">Новое событие</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          {/* Спектакль */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Спектакль *</label>
            <select
              required
              value={form.show_id}
              onChange={(e) => setForm({ ...form, show_id: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
            >
              <option value="">Выберите спектакль</option>
              {shows.map((show) => (
                <option key={show.id} value={show.id}>{show.title}</option>
              ))}
            </select>
          </div>

          {/* Город */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Город *</label>
            <select
              required
              value={form.city_id}
              onChange={(e) => setForm({ ...form, city_id: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
            >
              <option value="">Выберите город</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>{city.name}</option>
              ))}
            </select>
          </div>

          {/* Дата и время */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Дата *</label>
              <input
                type="date"
                required
                value={form.event_date}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Время</label>
              <input
                type="time"
                value={form.event_time}
                onChange={(e) => setForm({ ...form, event_time: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
              />
            </div>
          </div>

          {/* Площадка */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название площадки</label>
            <input
              type="text"
              value={form.venue_name}
              onChange={(e) => setForm({ ...form, venue_name: e.target.value })}
              placeholder="Например: Театр Драмы"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Адрес площадки</label>
            <input
              type="text"
              value={form.venue_address}
              onChange={(e) => setForm({ ...form, venue_address: e.target.value })}
              placeholder="Например: ул. Пушкина, 10"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
            />
          </div>

          {/* Билеты */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Количество билетов</label>
            <input
              type="number"
              value={form.total_tickets}
              onChange={(e) => setForm({ ...form, total_tickets: e.target.value })}
              placeholder="Например: 500"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
            />
          </div>

          {/* Цены */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Мин. цена (₽)</label>
              <input
                type="number"
                value={form.min_price}
                onChange={(e) => setForm({ ...form, min_price: e.target.value })}
                placeholder="1500"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Макс. цена (₽)</label>
              <input
                type="number"
                value={form.max_price}
                onChange={(e) => setForm({ ...form, max_price: e.target.value })}
                placeholder="5000"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
              />
            </div>
          </div>

          {/* Статус */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Статус</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'planned', label: 'Запланировано' },
                { value: 'on_sale', label: 'В продаже' },
                { value: 'sold_out', label: 'Распродано' },
              ].map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setForm({ ...form, status: s.value })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    form.status === s.value
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 pt-4">
            <Link
              href="/events"
              className="px-6 py-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Отмена
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Создание...' : 'Создать событие'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
