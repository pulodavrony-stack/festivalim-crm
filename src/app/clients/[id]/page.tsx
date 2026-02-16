'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import ClickToCall from '@/components/phone/ClickToCall';
import VoiceInput from '@/components/ui/VoiceInput';

interface Client {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  client_type: 'lead' | 'pk' | 'kb';
  status: string;
  city_id: string;
  city?: { name: string } | { name: string }[];
  source?: { name: string };
  manager?: { id: string; full_name: string };
  manager_id?: string;
  telegram_username: string;
  whatsapp_phone: string;
  preferred_genres: string[];
  preferred_price_range: string;
  notes: string;
  total_purchases: number;
  total_revenue: number;
  first_purchase_date: string;
  last_purchase_date: string;
  last_contact_date: string;
  created_at: string;
  updated_at: string;
}

interface Manager {
  id: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

interface Activity {
  id: string;
  activity_type: string;
  content: string;
  created_at: string;
  manager?: { full_name: string };
}

interface Deal {
  id: string;
  title: string;
  amount: number;
  status: string;
  stage?: { name: string; color: string };
  event?: { event_date: string; show?: { title: string } | { title: string }[] };
  created_at: string;
}

const activityIcons: Record<string, string> = {
  note: '📝',
  call_inbound: '📞',
  call_outbound: '📱',
  message_inbound: '💬',
  message_outbound: '✉️',
  stage_change: '🔄',
  type_change: '⬆️',
  deal_created: '🤝',
  deal_won: '🎉',
  deal_lost: '❌',
  client_created: '➕',
};

const clientTypeLabels = {
  lead: { label: 'Лид', color: 'bg-blue-100 text-blue-700' },
  pk: { label: 'Потенциальный клиент', color: 'bg-purple-100 text-purple-700' },
  kb: { label: 'Клиентская база', color: 'bg-green-100 text-green-700' },
};

export default function ClientPage() {
  const params = useParams();
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'activity' | 'deals' | 'info'>('activity');
  const [newNote, setNewNote] = useState('');
  const [managers, setManagers] = useState<Manager[]>([]);

  useEffect(() => {
    if (params.id) {
      loadClient();
      loadManagers();
    }
  }, [params.id]);

  async function loadManagers() {
    const { data } = await supabase
      .from('managers')
      .select('id, full_name, role, is_active')
      .eq('is_active', true)
      .order('full_name');
    if (data) setManagers(data);
  }

  async function assignManager(managerId: string | null) {
    if (!client) return;
    
    await supabase
      .from('clients')
      .update({ manager_id: managerId })
      .eq('id', client.id);

    // Also update all active deals for this client
    if (managerId) {
      await supabase
        .from('deals')
        .update({ manager_id: managerId })
        .eq('client_id', client.id)
        .eq('status', 'active');
    }

    const managerName = managers.find(m => m.id === managerId)?.full_name || 'Не назначен';
    await supabase.from('activities').insert({
      client_id: client.id,
      activity_type: 'note',
      content: `Назначен менеджер: ${managerName}`,
    });

    loadClient();
  }

  async function loadClient() {
    const [clientResult, activitiesResult, dealsResult] = await Promise.all([
      supabase
        .from('clients')
        .select(`
          *,
          city:cities(name),
          source:lead_sources(name),
          manager:managers(id, full_name)
        `)
        .eq('id', params.id)
        .single(),
      supabase
        .from('activities')
        .select(`
          *,
          manager:managers(full_name)
        `)
        .eq('client_id', params.id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('deals')
        .select(`
          *,
          stage:pipeline_stages(name, color),
          event:events(event_date, show:shows(title))
        `)
        .eq('client_id', params.id)
        .order('created_at', { ascending: false }),
    ]);

    if (clientResult.data) setClient(clientResult.data);
    if (activitiesResult.data) setActivities(activitiesResult.data);
    if (dealsResult.data) setDeals(dealsResult.data);
    setLoading(false);
  }

  async function addNote() {
    if (!newNote.trim() || !client) return;

    await supabase.from('activities').insert({
      client_id: client.id,
      activity_type: 'note',
      content: newNote,
    });

    setNewNote('');
    loadClient();
  }

  async function updateClientType(newType: 'lead' | 'pk' | 'kb') {
    if (!client) return;

    await supabase
      .from('clients')
      .update({ client_type: newType })
      .eq('id', client.id);

    await supabase.from('activities').insert({
      client_id: client.id,
      activity_type: 'type_change',
      content: `Тип изменён на ${clientTypeLabels[newType].label}`,
    });

    loadClient();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-bold mb-2">Клиент не найден</h2>
          <Link href="/clients" className="text-red-500 hover:underline">
            ← Вернуться к списку
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/clients" className="text-gray-500 hover:text-gray-700">
                ← Клиенты
              </Link>
              <span className="text-gray-300">/</span>
              <h1 className="text-xl font-bold text-gray-900">
                {client.full_name}
              </h1>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  clientTypeLabels[client.client_type]?.color
                }`}
              >
                {clientTypeLabels[client.client_type]?.label}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <ClickToCall 
                phoneNumber={client.phone}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2"
              >
                <span>📞</span>
                <span>Звонок</span>
              </ClickToCall>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-messenger', { detail: { service: 'whatsapp', phone: client.whatsapp_phone || client.phone } }))}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                💬 WhatsApp
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-messenger', { detail: { service: 'max', phone: client.phone } }))}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                💜 MAX
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-3 gap-6">
          {/* Left column - Main info */}
          <div className="col-span-2 space-y-6">
            {/* Quick stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-2xl font-bold text-gray-900">
                  {client.total_purchases || 0}
                </div>
                <div className="text-sm text-gray-500">Покупок</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-2xl font-bold text-green-600">
                  {(client.total_revenue || 0).toLocaleString('ru-RU')} ₽
                </div>
                <div className="text-sm text-gray-500">Сумма</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-2xl font-bold text-gray-900">
                  {deals.filter((d) => d.status === 'active').length}
                </div>
                <div className="text-sm text-gray-500">Активных сделок</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-sm font-medium text-gray-900">
                  {client.last_contact_date
                    ? new Date(client.last_contact_date).toLocaleDateString('ru-RU')
                    : '—'}
                </div>
                <div className="text-sm text-gray-500">Последний контакт</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="border-b flex">
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'activity'
                      ? 'border-b-2 border-red-500 text-red-500'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  История
                </button>
                <button
                  onClick={() => setActiveTab('deals')}
                  className={`px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'deals'
                      ? 'border-b-2 border-red-500 text-red-500'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Сделки ({deals.length})
                </button>
                <button
                  onClick={() => setActiveTab('info')}
                  className={`px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'info'
                      ? 'border-b-2 border-red-500 text-red-500'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Информация
                </button>
              </div>

              <div className="p-4">
                {activeTab === 'activity' && (
                  <div className="space-y-4">
                    {/* Add note */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Введите или надиктуйте заметку..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addNote()}
                        className="flex-1 px-4 py-2 border rounded-lg focus:border-red-500 outline-none"
                      />
                      <VoiceInput
                        size="md"
                        onResult={(text) => setNewNote(text)}
                        onAppend={(text) => setNewNote(prev => prev ? prev + ' ' + text : text)}
                      />
                      <button
                        onClick={addNote}
                        disabled={!newNote.trim()}
                        className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg"
                      >
                        Добавить
                      </button>
                    </div>

                    {/* Activity list */}
                    <div className="space-y-3">
                      {activities.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50"
                        >
                          <div className="text-xl">
                            {activityIcons[activity.activity_type] || '📌'}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm text-gray-900">
                              {activity.content}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(activity.created_at).toLocaleString('ru-RU')}
                              {activity.manager && ` • ${activity.manager.full_name}`}
                            </div>
                          </div>
                        </div>
                      ))}
                      {activities.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          Нет активности
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'deals' && (
                  <div className="space-y-3">
                    {deals.map((deal) => {
                      const showData = Array.isArray(deal.event?.show) ? deal.event?.show[0] : deal.event?.show;
                      return (
                      <div
                        key={deal.id}
                        className="flex items-center justify-between p-4 rounded-lg border hover:shadow-md transition-shadow"
                      >
                        <div>
                          <div className="font-medium text-gray-900">
                            {showData?.title || deal.title || 'Сделка'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {deal.event?.event_date &&
                              new Date(deal.event.event_date).toLocaleDateString('ru-RU')}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          {deal.stage && (
                            <span
                              className="px-3 py-1 rounded-full text-xs font-medium text-white"
                              style={{ backgroundColor: deal.stage.color }}
                            >
                              {deal.stage.name}
                            </span>
                          )}
                          <span className="text-lg font-semibold text-green-600">
                            {(deal.amount || 0).toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                      </div>
                    );
                    })}
                    {deals.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        Нет сделок
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'info' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-500">Email</label>
                      <div className="text-gray-900">
                        {client.email || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Telegram</label>
                      <div className="text-gray-900">
                        {client.telegram_username ? `@${client.telegram_username}` : '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Город</label>
                      <div className="text-gray-900">
                        {client.city?.name || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Источник</label>
                      <div className="text-gray-900">
                        {client.source?.name || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Менеджер</label>
                      <div className="text-gray-900">
                        {client.manager?.full_name || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Ценовой сегмент</label>
                      <div className="text-gray-900">
                        {client.preferred_price_range || '—'}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm text-gray-500">Заметки</label>
                      <div className="text-gray-900 whitespace-pre-wrap">
                        {client.notes || '—'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right column - Actions */}
          <div className="space-y-6">
            {/* Contact info */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">
                Контакты
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-500">Телефон</label>
                  <ClickToCall 
                    phoneNumber={client.phone}
                    className="block text-lg font-medium text-gray-900 hover:text-red-500"
                  />
                </div>
                {client.email && (
                  <div>
                    <label className="text-sm text-gray-500">Email</label>
                    <a
                      href={`mailto:${client.email}`}
                      className="block text-gray-900 hover:text-red-500"
                    >
                      {client.email}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Assign manager */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">
                Менеджер
              </h3>
              <select
                value={client.manager_id || ''}
                onChange={(e) => assignManager(e.target.value || null)}
                className="w-full px-3 py-2 border rounded-lg focus:border-red-500 outline-none text-sm"
              >
                <option value="">Не назначен</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.role === 'admin' ? 'Админ' : m.role === 'team_admin' ? 'Тим-лид' : m.role === 'rop' ? 'РОП' : 'Менеджер'})
                  </option>
                ))}
              </select>
              {client.manager?.full_name && (
                <div className="mt-2 text-sm text-gray-500">
                  Текущий: <span className="font-medium text-gray-700">{client.manager.full_name}</span>
                </div>
              )}
            </div>

            {/* Change type */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">
                Изменить тип
              </h3>
              <div className="space-y-2">
                {(['lead', 'pk', 'kb'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => updateClientType(type)}
                    disabled={client.client_type === type}
                    className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      client.client_type === type
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {clientTypeLabels[type].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Create deal */}
            <Link
              href={`/clients/${client.id}/deal/new`}
              className="block w-full bg-red-500 hover:bg-red-600 text-white text-center px-4 py-3 rounded-xl font-medium transition-colors"
            >
              + Создать сделку
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
