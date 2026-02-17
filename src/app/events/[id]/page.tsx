'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

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
    description: string;
    poster_url: string;
  };
  city: {
    id: string;
    name: string;
  };
}

interface Deal {
  id: string;
  title: string;
  amount: number;
  status: string;
  created_at: string;
  client: {
    id: string;
    full_name: string;
    phone: string;
  } | {
    id: string;
    full_name: string;
    phone: string;
  }[];
}

const statusOptions = [
  { value: 'planned', label: 'Запланировано', color: 'bg-gray-500' },
  { value: 'on_sale', label: 'В продаже', color: 'bg-green-500' },
  { value: 'sold_out', label: 'Распродано', color: 'bg-red-500' },
  { value: 'completed', label: 'Завершено', color: 'bg-blue-500' },
  { value: 'cancelled', label: 'Отменено', color: 'bg-gray-400' },
];

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Event>>({});

  const loadEvent = useCallback(async () => {
    const { data } = await supabase
      .from('events')
      .select(`
        *,
        show:shows(id, title, description, poster_url),
        city:cities(id, name)
      `)
      .eq('id', params.id)
      .single();

    if (data) {
      setEvent(data);
      setForm(data);
    }
    setLoading(false);
  }, [params.id]);

  const loadDeals = useCallback(async () => {
    const { data } = await supabase
      .from('deals')
      .select(`
        id, title, amount, status, created_at,
        client:clients(id, full_name, phone)
      `)
      .eq('event_id', params.id)
      .order('created_at', { ascending: false });

    if (data) setDeals(data);
  }, [params.id]);

  useEffect(() => {
    loadEvent();
    loadDeals();
  }, [loadEvent, loadDeals]);

  async function updateStatus(newStatus: string) {
    await supabase
      .from('events')
      .update({ status: newStatus })
      .eq('id', params.id);
    
    loadEvent();
  }

  async function saveChanges() {
    await supabase
      .from('events')
      .update({
        venue_name: form.venue_name,
        venue_address: form.venue_address,
        event_time: form.event_time,
        total_tickets: form.total_tickets,
        min_price: form.min_price,
        max_price: form.max_price,
      })
      .eq('id', params.id);
    
    setEditing(false);
    loadEvent();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🎭</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Событие не найдено</h2>
          <Link href="/events" className="text-red-500 hover:underline">
            Вернуться к списку
          </Link>
        </div>
      </div>
    );
  }

  const progress = event.total_tickets ? (event.sold_tickets / event.total_tickets) * 100 : 0;
  const revenue = deals.filter(d => d.status === 'won').reduce((sum, d) => sum + (d.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/events" className="text-gray-500 hover:text-gray-700">
                ← События
              </Link>
              <span className="text-gray-300">/</span>
              <h1 className="text-xl font-bold text-gray-900">{event.show?.title}</h1>
            </div>
            <div className="flex items-center gap-2">
              {statusOptions.map((s) => (
                <button
                  key={s.value}
                  onClick={() => updateStatus(s.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    event.status === s.value
                      ? `${s.color} text-white`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Event Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Info */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{event.show?.title}</h2>
                  <p className="text-gray-500 mt-1">{event.city?.name}</p>
                </div>
                <button
                  onClick={() => setEditing(!editing)}
                  className="text-blue-500 hover:text-blue-600"
                >
                  {editing ? 'Отмена' : 'Редактировать'}
                </button>
              </div>

              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Время</label>
                      <input
                        type="time"
                        value={form.event_time || ''}
                        onChange={(e) => setForm({ ...form, event_time: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Всего билетов</label>
                      <input
                        type="number"
                        value={form.total_tickets || ''}
                        onChange={(e) => setForm({ ...form, total_tickets: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 border rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Площадка</label>
                    <input
                      type="text"
                      value={form.venue_name || ''}
                      onChange={(e) => setForm({ ...form, venue_name: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Адрес</label>
                    <input
                      type="text"
                      value={form.venue_address || ''}
                      onChange={(e) => setForm({ ...form, venue_address: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Мин. цена</label>
                      <input
                        type="number"
                        value={form.min_price || ''}
                        onChange={(e) => setForm({ ...form, min_price: parseFloat(e.target.value) })}
                        className="w-full px-4 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Макс. цена</label>
                      <input
                        type="number"
                        value={form.max_price || ''}
                        onChange={(e) => setForm({ ...form, max_price: parseFloat(e.target.value) })}
                        className="w-full px-4 py-2 border rounded-lg"
                      />
                    </div>
                  </div>
                  <button
                    onClick={saveChanges}
                    className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-medium"
                  >
                    Сохранить
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-gray-500">Дата</div>
                    <div className="font-medium">
                      {new Date(event.event_date).toLocaleDateString('ru-RU', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Время</div>
                    <div className="font-medium">{event.event_time?.slice(0, 5) || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Площадка</div>
                    <div className="font-medium">{event.venue_name || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Адрес</div>
                    <div className="font-medium">{event.venue_address || '—'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Цены</div>
                    <div className="font-medium">
                      {event.min_price && event.max_price
                        ? `${event.min_price.toLocaleString()} — ${event.max_price.toLocaleString()} ₽`
                        : '—'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Deals */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Сделки ({deals.length})</h3>
                <div className="text-green-600 font-medium">
                  Выручка: {revenue.toLocaleString('ru-RU')} ₽
                </div>
              </div>

              {deals.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Пока нет сделок
                </div>
              ) : (
                <div className="divide-y">
                  {deals.map((deal) => {
                    const clientData = Array.isArray(deal.client) ? deal.client[0] : deal.client;
                    return (
                    <div key={deal.id} className="py-3 flex items-center justify-between">
                      <div>
                        <Link
                          href={`/clients/${clientData?.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {clientData?.full_name}
                        </Link>
                        <div className="text-sm text-gray-500">{clientData?.phone}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{deal.amount?.toLocaleString()} ₽</div>
                        <div className={`text-xs ${
                          deal.status === 'won' ? 'text-green-500' :
                          deal.status === 'lost' ? 'text-red-500' : 'text-gray-500'
                        }`}>
                          {deal.status === 'won' ? 'Оплачено' :
                           deal.status === 'lost' ? 'Отказ' : 'В работе'}
                        </div>
                      </div>
                    </div>
                  );})}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Sales Progress */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Продажи</h3>
              
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Продано</span>
                  <span className="font-medium">
                    {event.sold_tickets || 0} / {event.total_tickets || '∞'}
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      progress >= 90 ? 'bg-green-500' :
                      progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-600">
                    {revenue.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">Выручка, ₽</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-600">
                    {deals.filter(d => d.status === 'won').length}
                  </div>
                  <div className="text-xs text-gray-500">Продаж</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Действия</h3>
              <div className="space-y-2">
                <Link
                  href={`/pipeline?event=${event.id}`}
                  className="block w-full text-center py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                >
                  Открыть воронку
                </Link>
                <button
                  onClick={() => router.push(`/clients?event=${event.id}`)}
                  className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Контакты события
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
