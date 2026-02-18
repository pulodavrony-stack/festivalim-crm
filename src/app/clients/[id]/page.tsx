'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSchemaClient, useTeam } from '@/components/providers/TeamProvider';
import { getPublicClient } from '@/lib/supabase-schema';
import { schemaInsert, schemaUpdate, schemaDelete } from '@/lib/schema-api';
import ClickToCall from '@/components/phone/ClickToCall';
import VoiceInput from '@/components/ui/VoiceInput';
import ComposeEmailModal from '@/components/email/ComposeEmailModal';

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
  manager_id?: string;
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

class ClientPageErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md p-6">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Ошибка загрузки страницы</h2>
            <p className="text-sm text-gray-500 mb-4">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-medium"
            >
              Перезагрузить
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function ClientPageWrapper() {
  return (
    <ClientPageErrorBoundary>
      <ClientPage />
    </ClientPageErrorBoundary>
  );
}

function ClientPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = useSchemaClient();
  const { isLoading: teamLoading, teamSchema } = useTeam();
  const [client, setClient] = useState<Client | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'activity' | 'deals' | 'info'>('activity');
  const [newNote, setNewNote] = useState('');
  const [managers, setManagers] = useState<Manager[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    full_name: '', phone: '', email: '', 
    telegram_username: '', whatsapp_phone: '', notes: ''
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEmailCompose, setShowEmailCompose] = useState(false);
  const [emailTo, setEmailTo] = useState('');

  // Additional contacts
  interface ClientContactPerson {
    id: string;
    client_id: string;
    full_name: string;
    position: string;
    phone: string;
    email: string;
    comments: string;
  }
  const [additionalContacts, setAdditionalContacts] = useState<ClientContactPerson[]>([]);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({
    full_name: '', position: '', phone: '', email: '', comments: ''
  });

  useEffect(() => {
    if (params.id && !teamLoading) {
      loadClient();
      loadManagers();
      loadAdditionalContacts();
    }
  }, [params.id, teamLoading]);

  async function loadAdditionalContacts() {
    const { data } = await supabase
      .from('client_contacts')
      .select('*')
      .eq('client_id', params.id)
      .order('created_at');
    if (data) setAdditionalContacts(data);
  }

  async function saveAdditionalContact() {
    if (!contactForm.full_name.trim()) return;
    if (editingContactId) {
      await schemaUpdate(teamSchema, 'client_contacts', {
        full_name: contactForm.full_name,
        position: contactForm.position || null,
        phone: contactForm.phone || null,
        email: contactForm.email || null,
        comments: contactForm.comments || null,
      }, { id: editingContactId });
    } else {
      await schemaInsert(teamSchema, 'client_contacts', {
        client_id: params.id,
        full_name: contactForm.full_name,
        position: contactForm.position || null,
        phone: contactForm.phone || null,
        email: contactForm.email || null,
        comments: contactForm.comments || null,
      });
    }
    setIsAddingContact(false);
    setEditingContactId(null);
    setContactForm({ full_name: '', position: '', phone: '', email: '', comments: '' });
    loadAdditionalContacts();
  }

  async function deleteAdditionalContact(id: string) {
    await schemaDelete(teamSchema, 'client_contacts', { id });
    loadAdditionalContacts();
  }

  async function loadManagers() {
    const publicClient = getPublicClient();
    const { data } = await publicClient
      .from('managers')
      .select('id, full_name, role, is_active')
      .eq('is_active', true)
      .order('full_name');
    if (data) setManagers(data);
  }

  function startEditing() {
    if (!client) return;
    setEditData({
      full_name: client.full_name || '',
      phone: client.phone || '',
      email: client.email || '',
      telegram_username: client.telegram_username || '',
      whatsapp_phone: client.whatsapp_phone || '',
      notes: client.notes || '',
    });
    setIsEditing(true);
  }

  async function saveEdit() {
    if (!client) return;
    const normalized = editData.phone.replace(/[^\d]/g, '');
    await schemaUpdate(teamSchema, 'clients', {
      full_name: editData.full_name,
      phone: editData.phone || null,
      phone_normalized: normalized || null,
      email: editData.email || null,
      telegram_username: editData.telegram_username || null,
      whatsapp_phone: editData.whatsapp_phone || null,
      notes: editData.notes || null,
    }, { id: client.id });
    setIsEditing(false);
    loadClient();
  }

  async function deleteClient() {
    if (!client) return;
    await schemaDelete(teamSchema, 'deals', { client_id: client.id });
    await schemaDelete(teamSchema, 'activities', { client_id: client.id });
    await schemaDelete(teamSchema, 'clients', { id: client.id });
    router.push('/clients');
  }

  async function assignManager(managerId: string | null) {
    if (!client) return;

    await schemaUpdate(teamSchema, 'clients', { manager_id: managerId }, { id: client.id });

    if (managerId) {
      // Need to use supabase for complex filter (status = active AND client_id = x)
      await supabase
        .from('deals')
        .update({ manager_id: managerId })
        .eq('client_id', client.id)
        .eq('status', 'active');
    }

    const managerName = managers.find(m => m.id === managerId)?.full_name || 'Не назначен';
    await schemaInsert(teamSchema, 'activities', {
      client_id: client.id,
      activity_type: 'note',
      content: `Назначен менеджер: ${managerName}`,
    });

    loadClient();
  }

  async function loadClient() {
    try {
      // Load client without complex joins that may fail across schemas
      const clientResult = await supabase
        .from('clients')
        .select('*')
        .eq('id', params.id)
        .single();

      if (clientResult.error) {
        console.error('Error loading client:', clientResult.error);
        setLoading(false);
        return;
      }

      if (clientResult.data) {
        // Separately load city and source names
        const clientData = { ...clientResult.data } as any;
        
        if (clientData.city_id) {
          const { data: cityData } = await supabase
            .from('cities')
            .select('name')
            .eq('id', clientData.city_id)
            .single();
          if (cityData) clientData.city = cityData;
        }

        if (clientData.source_id) {
          const { data: sourceData } = await supabase
            .from('lead_sources')
            .select('name')
            .eq('id', clientData.source_id)
            .single();
          if (sourceData) clientData.source = sourceData;
        }

        setClient(clientData);
      }

      // Load activities
      const { data: activitiesData } = await supabase
        .from('activities')
        .select('*')
        .eq('client_id', params.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (activitiesData) setActivities(activitiesData);

      // Load deals - try with joins first, fallback to simple query
      let dealsData = null;
      const dealsWithJoins = await supabase
        .from('deals')
        .select('*, stage:pipeline_stages(name, color)')
        .eq('client_id', params.id)
        .order('created_at', { ascending: false });
      
      if (dealsWithJoins.data) {
        dealsData = dealsWithJoins.data;
      } else {
        // Fallback: simple deals query without joins
        const simpleDealResult = await supabase
          .from('deals')
          .select('*')
          .eq('client_id', params.id)
          .order('created_at', { ascending: false });
        if (simpleDealResult.data) dealsData = simpleDealResult.data;
      }
      
      if (dealsData) setDeals(dealsData);
    } catch (err) {
      console.error('Error in loadClient:', err);
    } finally {
      setLoading(false);
    }
  }

  async function addNote() {
    if (!newNote.trim() || !client) return;

    await schemaInsert(teamSchema, 'activities', {
      client_id: client.id,
      activity_type: 'note',
      content: newNote,
    });

    setNewNote('');
    loadClient();
  }

  async function updateClientType(newType: 'lead' | 'pk' | 'kb') {
    if (!client) return;

    await schemaUpdate(teamSchema, 'clients', { client_type: newType }, { id: client.id });

    await schemaInsert(teamSchema, 'activities', {
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
          <h2 className="text-xl font-bold mb-2">Контакт не найден</h2>
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
                ← Контакты
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
              <button
                onClick={startEditing}
                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium"
              >
                ✏️ Редактировать
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-100 hover:bg-red-200 text-red-600 px-3 py-2 rounded-lg text-sm font-medium"
              >
                🗑️ Удалить
              </button>
              <ClickToCall 
                phoneNumber={client.phone}
                className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-1"
              >
                <span>📞</span>
                <span>Звонок</span>
              </ClickToCall>
              <button
                onClick={() => {
                  const phone = (client.whatsapp_phone || client.phone || '').replace(/[^\d]/g, '');
                  if (phone) window.open(`https://web.whatsapp.com/send?phone=${phone}`, '_blank');
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium"
              >
                💬 WhatsApp
              </button>
              <button
                onClick={() => {
                  const phone = (client.phone || '').replace(/[^\d]/g, '');
                  window.open(phone ? `https://web.max.ru/#/chat?phone=${phone}` : 'https://web.max.ru/', '_blank');
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm font-medium"
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
                              {activity.manager_id && ` • ${managers.find(m => m.id === activity.manager_id)?.full_name || ''}`}
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
                        {(Array.isArray(client.city) ? client.city[0]?.name : client.city?.name) || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Источник</label>
                      <div className="text-gray-900">
                        {(Array.isArray(client.source) ? client.source[0]?.name : client.source?.name) || '—'}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Менеджер</label>
                      <div className="text-gray-900">
                        {managers.find(m => m.id === client.manager_id)?.full_name || '—'}
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
                    <button
                      onClick={() => { setEmailTo(client.email); setShowEmailCompose(true); }}
                      className="block text-gray-900 hover:text-blue-600 text-left"
                      title="Нажмите чтобы написать письмо"
                    >
                      ✉️ {client.email}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Additional contacts */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">
                  Доп. контакты {additionalContacts.length > 0 && <span className="text-sm font-normal text-gray-400">({additionalContacts.length})</span>}
                </h3>
                <button
                  onClick={() => {
                    setEditingContactId(null);
                    setContactForm({ full_name: '', position: '', phone: '', email: '', comments: '' });
                    setIsAddingContact(true);
                  }}
                  className="text-xs bg-indigo-500 hover:bg-indigo-600 text-white px-2.5 py-1.5 rounded-lg font-medium"
                >
                  + Добавить
                </button>
              </div>

              {isAddingContact && (
                <div className="bg-indigo-50 rounded-lg p-3 mb-3 space-y-2">
                  <input
                    type="text"
                    value={contactForm.full_name}
                    onChange={(e) => setContactForm({ ...contactForm, full_name: e.target.value })}
                    placeholder="ФИО *"
                    className="w-full px-3 py-1.5 border rounded-lg text-sm focus:border-indigo-500 outline-none"
                  />
                  <input
                    type="text"
                    value={contactForm.position}
                    onChange={(e) => setContactForm({ ...contactForm, position: e.target.value })}
                    placeholder="Должность"
                    className="w-full px-3 py-1.5 border rounded-lg text-sm focus:border-indigo-500 outline-none"
                  />
                  <input
                    type="text"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    placeholder="Телефон"
                    className="w-full px-3 py-1.5 border rounded-lg text-sm focus:border-indigo-500 outline-none"
                  />
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    placeholder="Email"
                    className="w-full px-3 py-1.5 border rounded-lg text-sm focus:border-indigo-500 outline-none"
                  />
                  <textarea
                    value={contactForm.comments}
                    onChange={(e) => setContactForm({ ...contactForm, comments: e.target.value })}
                    placeholder="Комментарий"
                    rows={2}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm focus:border-indigo-500 outline-none resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveAdditionalContact}
                      disabled={!contactForm.full_name.trim()}
                      className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 text-white py-1.5 rounded-lg text-sm font-medium"
                    >
                      Сохранить
                    </button>
                    <button
                      onClick={() => { setIsAddingContact(false); setEditingContactId(null); }}
                      className="px-3 py-1.5 border text-gray-600 rounded-lg text-sm hover:bg-gray-50"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {additionalContacts.map(c => (
                  <div key={c.id} className="border rounded-lg p-3 hover:border-indigo-200 transition-colors">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{c.full_name}</p>
                        {c.position && <p className="text-xs text-indigo-600">{c.position}</p>}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditingContactId(c.id);
                            setContactForm({
                              full_name: c.full_name || '',
                              position: c.position || '',
                              phone: c.phone || '',
                              email: c.email || '',
                              comments: c.comments || '',
                            });
                            setIsAddingContact(true);
                          }}
                          className="p-1 text-gray-400 hover:text-indigo-500"
                          title="Редактировать"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => deleteAdditionalContact(c.id)}
                          className="p-1 text-gray-400 hover:text-red-500"
                          title="Удалить"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    {c.phone && (
                      <button
                        onClick={() => {
                          const ph = c.phone.replace(/[^\d]/g, '');
                          window.open(`https://web.whatsapp.com/send?phone=${ph}`, '_blank');
                        }}
                        className="text-xs text-gray-600 hover:text-green-600 hover:underline"
                      >
                        📞 {c.phone}
                      </button>
                    )}
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="block text-xs text-gray-600 hover:text-blue-600 hover:underline">
                        ✉️ {c.email}
                      </a>
                    )}
                    {c.comments && <p className="text-xs text-gray-400 mt-1 italic">{c.comments}</p>}
                  </div>
                ))}
                {additionalContacts.length === 0 && !isAddingContact && (
                  <p className="text-sm text-gray-400 text-center py-2">Нет доп. контактов</p>
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
              {client.manager_id && managers.find(m => m.id === client.manager_id) && (
                <div className="mt-2 text-sm text-gray-500">
                  Текущий: <span className="font-medium text-gray-700">{managers.find(m => m.id === client.manager_id)?.full_name}</span>
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

      {/* Edit modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Редактировать контакт</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ФИО</label>
                <input
                  type="text"
                  value={editData.full_name}
                  onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:border-red-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                <input
                  type="text"
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:border-red-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:border-red-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telegram</label>
                <input
                  type="text"
                  value={editData.telegram_username}
                  onChange={(e) => setEditData({ ...editData, telegram_username: e.target.value })}
                  placeholder="username (без @)"
                  className="w-full px-3 py-2 border rounded-lg focus:border-red-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                <input
                  type="text"
                  value={editData.whatsapp_phone}
                  onChange={(e) => setEditData({ ...editData, whatsapp_phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:border-red-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Заметки</label>
                <textarea
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border rounded-lg focus:border-red-500 outline-none resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={saveEdit}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg font-medium"
              >
                Сохранить
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">⚠️</div>
              <h3 className="text-lg font-bold text-gray-900">Удалить контакт?</h3>
              <p className="text-sm text-gray-500 mt-2">
                <span className="font-medium text-gray-900">{client.full_name}</span>
                <br />
                Будут удалены все сделки и история. Это действие нельзя отменить.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={deleteClient}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg font-medium"
              >
                Удалить
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email compose modal */}
      <ComposeEmailModal
        isOpen={showEmailCompose}
        onClose={() => setShowEmailCompose(false)}
        toEmail={emailTo}
        clientName={client.full_name}
      />
    </div>
  );
}
