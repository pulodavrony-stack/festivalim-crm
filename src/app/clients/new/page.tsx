'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSchemaClient, useTeam } from '@/components/providers/TeamProvider';

interface City {
  id: string;
  name: string;
}

interface Source {
  id: string;
  name: string;
}

export default function NewClientPage() {
  const router = useRouter();
  const supabase = useSchemaClient();
  const { isLoading: teamLoading } = useTeam();
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    city_id: '',
    source_id: '',
    client_type: 'lead' as 'lead' | 'pk' | 'kb',
    notes: '',
  });

  useEffect(() => {
    if (!teamLoading) {
      loadOptions();
    }
  }, [teamLoading]);

  async function loadOptions() {
    const [citiesResult, sourcesResult] = await Promise.all([
      supabase.from('cities').select('id, name').order('name'),
      supabase.from('lead_sources').select('id, name').eq('is_active', true),
    ]);

    if (citiesResult.data) setCities(citiesResult.data);
    if (sourcesResult.data) setSources(sourcesResult.data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const phoneNormalized = form.phone.replace(/[^\d]/g, '');

    const { data, error } = await supabase
      .from('clients')
      .insert({
        full_name: form.full_name,
        phone: form.phone,
        phone_normalized: phoneNormalized || null,
        email: form.email || null,
        city_id: form.city_id || null,
        source_id: form.source_id || null,
        client_type: form.client_type,
        notes: form.notes || null,
        status: 'new',
      })
      .select()
      .single();

    if (error) {
      alert('Ошибка: ' + error.message);
      setLoading(false);
      return;
    }

    await supabase.from('activities').insert({
      client_id: data.id,
      activity_type: 'client_created',
      content: 'Клиент создан вручную',
    });

    router.push(`/clients/${data.id}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/clients" className="text-gray-500 hover:text-gray-700">
                ← Клиенты
              </Link>
              <span className="text-gray-300">/</span>
              <h1 className="text-xl font-bold text-gray-900">
                Новый клиент
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ФИО *
              </label>
              <input
                type="text"
                required
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Иванов Иван Иванович"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Телефон *
              </label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+7 (999) 123-45-67"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="client@example.com"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Город
                </label>
                <select
                  value={form.city_id}
                  onChange={(e) => setForm({ ...form, city_id: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
                >
                  <option value="">Выберите город</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Источник
                </label>
                <select
                  value={form.source_id}
                  onChange={(e) => setForm({ ...form, source_id: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
                >
                  <option value="">Выберите источник</option>
                  {sources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Тип клиента
              </label>
              <div className="flex space-x-4">
                {[
                  { value: 'lead', label: 'Лид', color: 'bg-blue-500' },
                  { value: 'pk', label: 'ПК', color: 'bg-purple-500' },
                  { value: 'kb', label: 'КБ', color: 'bg-green-500' },
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setForm({ ...form, client_type: type.value as 'lead' | 'pk' | 'kb' })}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      form.client_type === type.value
                        ? `${type.color} text-white`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Заметки
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                placeholder="Дополнительная информация о клиенте..."
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4 mt-8">
            <Link
              href="/clients"
              className="px-6 py-3 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Отмена
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Создание...' : 'Создать клиента'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
