'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import ClickToCall from '@/components/phone/ClickToCall';
import VoiceInput from '@/components/ui/VoiceInput';
import ClientEditModal from './ClientEditModal';

interface Client {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  client_type: 'lead' | 'pk' | 'kb';
  telegram_username: string;
  whatsapp_phone: string;
  notes: string;
  total_purchases: number;
  total_revenue: number;
  last_contact_date: string;
  created_at: string;
  city?: { name: string } | { name: string }[];
  source?: { name: string };
  manager?: { full_name: string };
}

interface Activity {
  id: string;
  activity_type: string;
  content: string;
  created_at: string;
}

interface Deal {
  id: string;
  title: string;
  amount: number;
  status: string;
  stage?: { name: string; color: string };
  event?: {
    id: string;
    event_date: string;
    venue_name: string;
    show?: { title: string } | { title: string }[];
    city?: { name: string } | { name: string }[];
  };
}

interface Tag {
  id: string;
  name: string;
  color: string;
  category?: string;
  is_auto: boolean;
}

interface EventForPitch {
  id: string;
  event_date: string;
  venue_name: string;
  status: string;
  show?: { title: string } | { title: string }[];
  city?: { name: string } | { name: string }[];
}

interface ClientPitch {
  id: string;
  event_id: string;
  event?: EventForPitch;
}

interface Reminder {
  id: string;
  event_id: string;
  remind_at: string;
  channel?: string;
  status: string;
  event?: EventForPitch;
}

interface ClientQuickViewProps {
  clientId: string;
  isOpen: boolean;
  onClose: () => void;
  position?: 'left' | 'right';
  onOpenMessenger?: (phone?: string, telegram?: string) => void;
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
  pk: { label: 'ПК', color: 'bg-purple-100 text-purple-700' },
  kb: { label: 'КБ', color: 'bg-green-100 text-green-700' },
};

export default function ClientQuickView({ clientId, isOpen, onClose, position = 'right', onOpenMessenger }: ClientQuickViewProps) {
  const [client, setClient] = useState<Client | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [pitches, setPitches] = useState<ClientPitch[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [availableEvents, setAvailableEvents] = useState<EventForPitch[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showPitchSelector, setShowPitchSelector] = useState(false);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [newReminder, setNewReminder] = useState({ event_id: '', days_before: '3', channel: 'whatsapp' });

  useEffect(() => {
    if (isOpen && clientId) {
      loadClient();
    }
  }, [isOpen, clientId]);

  async function loadClient() {
    setLoading(true);
    
    const [clientResult, activitiesResult, dealsResult, tagsResult, pitchesResult, eventsResult, remindersResult] = await Promise.all([
      supabase
        .from('clients')
        .select(`
          *,
          city:cities(name),
          source:lead_sources(name),
          manager:managers(full_name)
        `)
        .eq('id', clientId)
        .single(),
      supabase
        .from('activities')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('deals')
        .select(`
          *,
          stage:pipeline_stages(name, color),
          event:events(id, event_date, venue_name, show:shows(title), city:cities(name))
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false }),
      supabase
        .from('client_tags')
        .select('tag:tags(*)')
        .eq('client_id', clientId),
      supabase
        .from('client_pitches')
        .select('*, event:events(id, event_date, venue_name, status, show:shows(title), city:cities(name))')
        .eq('client_id', clientId),
      supabase
        .from('events')
        .select('id, event_date, venue_name, status, show:shows(title), city:cities(name)')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .in('status', ['planned', 'on_sale'])
        .order('event_date'),
      supabase
        .from('reminders')
        .select('*, event:events(id, event_date, venue_name, status, show:shows(title), city:cities(name))')
        .eq('client_id', clientId)
        .order('remind_at'),
    ]);

    if (clientResult.data) setClient(clientResult.data);
    if (activitiesResult.data) setActivities(activitiesResult.data);
    if (dealsResult.data) setDeals(dealsResult.data);
    if (tagsResult.data) setTags(tagsResult.data.map((t: any) => t.tag).filter(Boolean));
    if (pitchesResult.data) setPitches(pitchesResult.data);
    if (eventsResult.data) setAvailableEvents(eventsResult.data);
    if (remindersResult.data) setReminders(remindersResult.data);
    setLoading(false);
  }

  async function addPitch(eventId: string) {
    const { error } = await supabase
      .from('client_pitches')
      .insert({ client_id: clientId, event_id: eventId });
    
    if (!error) {
      loadClient();
      setShowPitchSelector(false);
    }
  }

  async function removePitch(pitchId: string) {
    const { error } = await supabase
      .from('client_pitches')
      .delete()
      .eq('id', pitchId);
    
    if (!error) {
      loadClient();
    }
  }

  async function createReminder() {
    if (!newReminder.event_id) return;
    
    const event = availableEvents.find(e => e.id === newReminder.event_id);
    if (!event) return;
    
    // Calculate remind_at based on event date and days_before
    const eventDate = new Date(event.event_date);
    const remindDate = new Date(eventDate);
    remindDate.setDate(remindDate.getDate() - parseInt(newReminder.days_before));
    remindDate.setHours(10, 0, 0, 0); // Set to 10:00 AM
    
    const { error } = await supabase
      .from('reminders')
      .insert({
        client_id: clientId,
        event_id: newReminder.event_id,
        remind_at: remindDate.toISOString(),
        channel: newReminder.channel,
        status: 'pending',
      });
    
    if (!error) {
      loadClient();
      setShowReminderForm(false);
      setNewReminder({ event_id: '', days_before: '3', channel: 'whatsapp' });
    }
  }

  async function cancelReminder(reminderId: string) {
    const { error } = await supabase
      .from('reminders')
      .update({ status: 'cancelled' })
      .eq('id', reminderId);
    
    if (!error) {
      loadClient();
    }
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

  if (!isOpen) return null;

  return (
    <>
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className={`absolute inset-y-0 ${position === 'left' ? 'left-0 pr-10' : 'right-0 pl-10'} flex max-w-full`}>
        <div 
          className="w-screen max-w-md transform transition-transform duration-300 ease-in-out"
          style={{ transform: isOpen ? 'translateX(0)' : (position === 'left' ? 'translateX(-100%)' : 'translateX(100%)') }}
        >
          <div className="flex h-full flex-col bg-white shadow-xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {client && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${clientTypeLabels[client.client_type]?.color}`}>
                      {clientTypeLabels[client.client_type]?.label}
                    </span>
                  )}
                  <h2 className="text-xl font-semibold text-white">
                    {loading ? 'Загрузка...' : client?.full_name}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Quick actions */}
              {client && (
                <div className="mt-4 space-y-2">
                  <div className="flex gap-2">
                    <ClickToCall 
                      phoneNumber={client.phone}
                      className="flex-1 bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg text-sm font-medium text-center transition-colors"
                    >
                      📞 Звонок
                    </ClickToCall>
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('open-messenger', { detail: { service: 'whatsapp', phone: client.whatsapp_phone || client.phone } }))}
                      className="flex-1 bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg text-sm font-medium text-center transition-colors"
                    >
                      💬 WhatsApp
                    </button>
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('open-messenger', { detail: { service: 'max', phone: client.phone } }))}
                      className="flex-1 bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg text-sm font-medium text-center transition-colors"
                    >
                      💜 MAX
                    </button>
                  </div>
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="w-full bg-white/10 hover:bg-white/20 text-white/90 px-3 py-1.5 rounded-lg text-xs font-medium text-center transition-colors"
                  >
                    ✏️ Редактировать
                  </button>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
                </div>
              ) : client ? (
                <div className="p-6 space-y-6">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {client.total_purchases || 0}
                      </div>
                      <div className="text-xs text-gray-500">Покупок</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <div className="text-lg font-bold text-green-600">
                        {(client.total_revenue || 0).toLocaleString('ru-RU')} ₽
                      </div>
                      <div className="text-xs text-gray-500">Сумма</div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <div className="text-lg font-bold text-gray-900">
                        {deals.filter(d => d.status === 'active').length}
                      </div>
                      <div className="text-xs text-gray-500">Активных</div>
                    </div>
                  </div>

                  {/* Tags */}
                  {tags.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-2">Теги</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ backgroundColor: tag.color + '20', color: tag.color }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contact info */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Телефон</span>
                      <ClickToCall phoneNumber={client.phone} className="text-sm font-medium" />
                    </div>
                    {client.email && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Email</span>
                        <span className="text-sm font-medium text-gray-900">{client.email}</span>
                      </div>
                    )}
                    {client.telegram_username && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Telegram</span>
                        <button 
                          onClick={() => window.dispatchEvent(new CustomEvent('open-messenger', { detail: { service: 'max', phone: client.phone } }))}
                          className="text-sm font-medium text-purple-600 hover:underline"
                        >
                          @{client.telegram_username}
                        </button>
                      </div>
                    )}
                    {client.city?.name && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Город</span>
                        <span className="text-sm font-medium text-gray-900">{client.city.name}</span>
                      </div>
                    )}
                    {client.source?.name && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Источник</span>
                        <span className="text-sm font-medium text-gray-900">{client.source.name}</span>
                      </div>
                    )}
                  </div>

                  {/* История спектаклей - полный список */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Спектакли клиента
                      {deals.filter(d => d.event).length > 0 && (
                        <span className="ml-2 text-xs font-normal text-gray-500">
                          ({deals.filter(d => d.event).length})
                        </span>
                      )}
                    </h3>
                    {deals.filter(d => d.event).length > 0 ? (
                      <div className="space-y-2">
                        {/* Предстоящие */}
                        {deals.filter(d => d.event && new Date(d.event.event_date) >= new Date()).length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs text-gray-500 mb-1.5">Предстоящие</p>
                            {deals
                              .filter(d => d.event && new Date(d.event.event_date) >= new Date())
                              .sort((a, b) => new Date(a.event!.event_date).getTime() - new Date(b.event!.event_date).getTime())
                              .map((deal) => (
                                <div key={deal.id} className="bg-green-50 border border-green-100 rounded-lg p-3 mb-2">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">
                                        {deal.event?.show?.title || 'Спектакль'}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {deal.event?.city?.name} • {deal.event?.venue_name}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-semibold text-gray-900">
                                        {new Date(deal.event!.event_date).toLocaleDateString('ru-RU', {
                                          day: 'numeric',
                                          month: 'short',
                                        })}
                                      </p>
                                      <p className="text-xs text-green-600 font-medium">
                                        {(deal.amount || 0).toLocaleString('ru-RU')} ₽
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                        {/* Прошедшие */}
                        {deals.filter(d => d.event && new Date(d.event.event_date) < new Date()).length > 0 && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1.5">Прошедшие</p>
                            {deals
                              .filter(d => d.event && new Date(d.event.event_date) < new Date())
                              .sort((a, b) => new Date(b.event!.event_date).getTime() - new Date(a.event!.event_date).getTime())
                              .map((deal) => (
                                <div key={deal.id} className="bg-gray-50 rounded-lg p-3 mb-2">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <p className="text-sm font-medium text-gray-700">
                                        {deal.event?.show?.title || 'Спектакль'}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {deal.event?.city?.name}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm text-gray-600">
                                        {new Date(deal.event!.event_date).toLocaleDateString('ru-RU', {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric',
                                        })}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {(deal.amount || 0).toLocaleString('ru-RU')} ₽
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-2">Нет посещённых спектаклей</p>
                    )}
                  </div>

                  {/* Пичинг - на какие спектакли предлагали */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Пичил на спектакли
                        {pitches.length > 0 && (
                          <span className="ml-2 text-xs font-normal text-gray-500">({pitches.length})</span>
                        )}
                      </h3>
                      <button
                        onClick={() => setShowPitchSelector(!showPitchSelector)}
                        className="text-xs text-red-500 hover:text-red-600 font-medium"
                      >
                        + Добавить
                      </button>
                    </div>
                    
                    {showPitchSelector && (
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 mb-2">Выберите спектакль:</p>
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {availableEvents
                            .filter(e => !pitches.some(p => p.event_id === e.id))
                            .map((event) => (
                              <button
                                key={event.id}
                                onClick={() => addPitch(event.id)}
                                className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-100 text-sm"
                              >
                                <span className="font-medium">{event.show?.title}</span>
                                <span className="text-gray-500"> • {event.city?.name} • </span>
                                <span className="text-gray-500">
                                  {new Date(event.event_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                                </span>
                              </button>
                            ))}
                          {availableEvents.filter(e => !pitches.some(p => p.event_id === e.id)).length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-2">Нет доступных спектаклей</p>
                          )}
                        </div>
                      </div>
                    )}

                    {pitches.length > 0 ? (
                      <div className="space-y-1.5">
                        {pitches.map((pitch) => (
                          <div key={pitch.id} className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {pitch.event?.show?.title || 'Спектакль'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {pitch.event?.city?.name} • {new Date(pitch.event?.event_date || '').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                              </p>
                            </div>
                            <button
                              onClick={() => removePitch(pitch.id)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-2">Не пичил ни на один спектакль</p>
                    )}
                  </div>

                  {/* Напоминания */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Напоминания
                        {reminders.filter(r => r.status === 'pending').length > 0 && (
                          <span className="ml-2 text-xs font-normal text-gray-500">
                            ({reminders.filter(r => r.status === 'pending').length})
                          </span>
                        )}
                      </h3>
                      <button
                        onClick={() => setShowReminderForm(!showReminderForm)}
                        className="text-xs text-red-500 hover:text-red-600 font-medium"
                      >
                        + Создать
                      </button>
                    </div>

                    {showReminderForm && (
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg space-y-2">
                        <select
                          value={newReminder.event_id}
                          onChange={(e) => setNewReminder({ ...newReminder, event_id: e.target.value })}
                          className="w-full px-2 py-1.5 border rounded text-sm focus:border-red-500 outline-none"
                        >
                          <option value="">Выберите спектакль...</option>
                          {availableEvents.map((event) => (
                            <option key={event.id} value={event.id}>
                              {event.show?.title} • {event.city?.name} • {new Date(event.event_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <select
                            value={newReminder.days_before}
                            onChange={(e) => setNewReminder({ ...newReminder, days_before: e.target.value })}
                            className="flex-1 px-2 py-1.5 border rounded text-sm focus:border-red-500 outline-none"
                          >
                            <option value="1">За 1 день</option>
                            <option value="3">За 3 дня</option>
                            <option value="7">За неделю</option>
                            <option value="14">За 2 недели</option>
                          </select>
                          <select
                            value={newReminder.channel}
                            onChange={(e) => setNewReminder({ ...newReminder, channel: e.target.value })}
                            className="flex-1 px-2 py-1.5 border rounded text-sm focus:border-red-500 outline-none"
                          >
                            <option value="whatsapp">WhatsApp</option>
                            <option value="telegram">Telegram</option>
                            <option value="sms">SMS</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={createReminder}
                            disabled={!newReminder.event_id}
                            className="flex-1 px-3 py-1.5 bg-green-500 text-white rounded text-sm font-medium disabled:opacity-50"
                          >
                            Создать
                          </button>
                          <button
                            onClick={() => setShowReminderForm(false)}
                            className="px-3 py-1.5 text-gray-500 text-sm"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    )}

                    {reminders.length > 0 ? (
                      <div className="space-y-1.5">
                        {reminders.map((reminder) => (
                          <div 
                            key={reminder.id} 
                            className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                              reminder.status === 'pending' 
                                ? 'bg-blue-50 border border-blue-100' 
                                : reminder.status === 'sent'
                                ? 'bg-green-50 border border-green-100'
                                : 'bg-gray-50 border border-gray-100 opacity-50'
                            }`}
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {reminder.event?.show?.title || 'Спектакль'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(reminder.remind_at).toLocaleDateString('ru-RU', { 
                                  day: 'numeric', 
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                                {' • '}
                                {reminder.channel === 'whatsapp' ? 'WhatsApp' : reminder.channel === 'telegram' ? 'Telegram' : 'SMS'}
                                {reminder.status === 'sent' && ' ✓'}
                              </p>
                            </div>
                            {reminder.status === 'pending' && (
                              <button
                                onClick={() => cancelReminder(reminder.id)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-2">Нет напоминаний</p>
                    )}
                  </div>

                  {/* Deals (сделки без привязки к спектаклю) */}
                  {deals.filter(d => !d.event).length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Другие сделки</h3>
                      <div className="space-y-2">
                        {deals.filter(d => !d.event).map((deal) => (
                          <div key={deal.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              {deal.stage && (
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: deal.stage.color }}
                                />
                              )}
                              <span className="text-sm text-gray-900">
                                {deal.stage?.name || 'Сделка'}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-green-600">
                              {(deal.amount || 0).toLocaleString('ru-RU')} ₽
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add note */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Добавить заметку</h3>
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Введите или надиктуйте..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addNote()}
                        className="flex-1 px-3 py-2 border rounded-lg text-sm focus:border-red-500 outline-none"
                      />
                      <VoiceInput
                        size="sm"
                        onResult={(text) => setNewNote(text)}
                        onAppend={(text) => setNewNote(prev => prev ? prev + ' ' + text : text)}
                      />
                      <button
                        onClick={addNote}
                        disabled={!newNote.trim()}
                        className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Recent activity */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Последняя активность</h3>
                    <div className="space-y-2">
                      {activities.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                          <span className="text-lg">{activityIcons[activity.activity_type] || '📌'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 truncate">{activity.content}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(activity.created_at).toLocaleString('ru-RU', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                      {activities.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">Нет активности</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-gray-500">Клиент не найден</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Edit Modal */}
    <ClientEditModal
      clientId={clientId}
      isOpen={isEditModalOpen}
      onClose={() => setIsEditModalOpen(false)}
      onSave={() => {
        loadClient();
        setIsEditModalOpen(false);
      }}
    />
    </>
  );
}
