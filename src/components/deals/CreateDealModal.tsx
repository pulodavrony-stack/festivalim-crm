'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Client {
  id: string;
  full_name: string;
  phone: string;
}

interface Show {
  id: string;
  title: string;
}

interface Event {
  id: string;
  event_date: string;
  event_time?: string;
  venue_name?: string;
  venue_address?: string;
  show_id: string;
  min_price?: number;
  max_price?: number;
  city?: { id: string; name: string };
  show?: { title: string } | { title: string }[];
}

interface Stage {
  id: string;
  name: string;
  color: string;
}

interface CreateDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
  pipelineId: string;
  preselectedClientId?: string;
}

export default function CreateDealModal({ 
  isOpen, 
  onClose, 
  onCreated,
  pipelineId,
  preselectedClientId 
}: CreateDealModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);

  const [formData, setFormData] = useState({
    client_id: preselectedClientId || '',
    show_id: '',
    event_id: '',
    stage_id: '',
    title: '',
    amount: '',
    ticket_count: '1',
    notes: '',
  });

  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
      if (preselectedClientId) {
        setFormData(prev => ({ ...prev, client_id: preselectedClientId }));
      }
    }
  }, [isOpen, preselectedClientId]);

  useEffect(() => {
    // Filter events by selected show
    if (formData.show_id) {
      const filtered = events.filter(e => e.show_id === formData.show_id);
      setFilteredEvents(filtered);
      if (filtered.length === 1) {
        setFormData(prev => ({ ...prev, event_id: filtered[0].id }));
      }
    } else {
      setFilteredEvents([]);
      setFormData(prev => ({ ...prev, event_id: '' }));
    }
  }, [formData.show_id, events]);

  async function loadData() {
    setLoading(true);

    const [clientsResult, showsResult, eventsResult, stagesResult] = await Promise.all([
      supabase
        .from('clients')
        .select('id, full_name, phone')
        .order('full_name')
        .limit(100),
      supabase
        .from('shows')
        .select('id, title')
        .eq('is_active', true)
        .order('title'),
      supabase
        .from('events')
        .select(`
          id, event_date, event_time, venue_name, venue_address, 
          show_id, min_price, max_price,
          city:cities(id, name),
          show:shows(title)
        `)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .in('status', ['planned', 'on_sale'])
        .order('event_date'),
      supabase
        .from('pipeline_stages')
        .select('id, name, color')
        .eq('pipeline_id', pipelineId)
        .order('sort_order'),
    ]);

    if (clientsResult.data) setClients(clientsResult.data);
    if (showsResult.data) setShows(showsResult.data);
    if (eventsResult.data) setEvents(eventsResult.data);
    if (stagesResult.data) {
      setStages(stagesResult.data);
      // Set first stage as default
      if (stagesResult.data.length > 0 && !formData.stage_id) {
        setFormData(prev => ({ ...prev, stage_id: stagesResult.data[0].id }));
      }
    }

    setLoading(false);
  }

  // Get selected event details
  const selectedEvent = events.find(e => e.id === formData.event_id);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.client_id || !formData.stage_id) {
      setError('Выберите клиента и этап');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from('deals').insert({
        client_id: formData.client_id,
        event_id: formData.event_id || null,
        pipeline_id: pipelineId,
        stage_id: formData.stage_id,
        title: formData.title || null,
        amount: parseFloat(formData.amount) || 0,
        ticket_count: parseInt(formData.ticket_count) || 1,
        status: 'active',
      });

      if (insertError) throw insertError;

      // Add activity
      await supabase.from('activities').insert({
        client_id: formData.client_id,
        activity_type: 'deal_created',
        content: `Создана новая сделка${formData.title ? `: ${formData.title}` : ''}`,
      });

      onCreated?.();
      onClose();
      
      // Reset form
      setFormData({
        client_id: '',
        show_id: '',
        event_id: '',
        stage_id: stages[0]?.id || '',
        title: '',
        amount: '',
        ticket_count: '1',
        notes: '',
      });
    } catch (err: any) {
      setError(err.message || 'Ошибка создания сделки');
    } finally {
      setSaving(false);
    }
  }

  const filteredClients = clients.filter(c => 
    c.full_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.phone.includes(clientSearch)
  );

  const selectedClient = clients.find(c => c.id === formData.client_id);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              Новая сделка
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-5">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg">
                      {error}
                    </div>
                  )}

                  {/* Client selector */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Контакт *
                    </label>
                    {selectedClient ? (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">{selectedClient.full_name}</div>
                          <div className="text-sm text-gray-500">{selectedClient.phone}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, client_id: '' })}
                          className="text-gray-400 hover:text-red-500"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="text"
                          placeholder="Поиск по имени или телефону..."
                          value={clientSearch}
                          onChange={(e) => {
                            setClientSearch(e.target.value);
                            setShowClientDropdown(true);
                          }}
                          onFocus={() => setShowClientDropdown(true)}
                          className="w-full px-4 py-2 border rounded-lg focus:border-red-500 outline-none"
                        />
                        {showClientDropdown && clientSearch && (
                          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            {filteredClients.slice(0, 10).map((client) => (
                              <button
                                key={client.id}
                                type="button"
                                className="w-full px-4 py-2 text-left hover:bg-gray-50"
                                onClick={() => {
                                  setFormData({ ...formData, client_id: client.id });
                                  setClientSearch('');
                                  setShowClientDropdown(false);
                                }}
                              >
                                <div className="font-medium text-gray-900">{client.full_name}</div>
                                <div className="text-sm text-gray-500">{client.phone}</div>
                              </button>
                            ))}
                            {filteredClients.length === 0 && (
                              <div className="px-4 py-3 text-gray-500 text-sm">
                                Контакт не найден
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Show & Event */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Спектакль
                      </label>
                      <select
                        value={formData.show_id}
                        onChange={(e) => setFormData({ ...formData, show_id: e.target.value, event_id: '' })}
                        className="w-full px-4 py-2 border rounded-lg focus:border-red-500 outline-none"
                      >
                        <option value="">Выберите...</option>
                        {shows.map((show) => (
                          <option key={show.id} value={show.id}>{show.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Дата и город
                      </label>
                      <select
                        value={formData.event_id}
                        onChange={(e) => {
                          const eventId = e.target.value;
                          const event = events.find(ev => ev.id === eventId);
                          setFormData({ 
                            ...formData, 
                            event_id: eventId,
                            // Автозаполнение суммы средней ценой
                            amount: event && event.min_price && event.max_price 
                              ? String(Math.round((event.min_price + event.max_price) / 2))
                              : formData.amount
                          });
                        }}
                        className="w-full px-4 py-2 border rounded-lg focus:border-red-500 outline-none"
                        disabled={!formData.show_id}
                      >
                        <option value="">Выберите...</option>
                        {filteredEvents.map((event) => (
                          <option key={event.id} value={event.id}>
                            {event.city?.name} • {new Date(event.event_date).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'short',
                            })}
                            {event.event_time && ` ${event.event_time.slice(0, 5)}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Event info card - автозаполненные данные */}
                  {selectedEvent && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-blue-600">📍</span>
                        <span className="font-medium text-gray-900">{selectedEvent.show?.title || 'Спектакль'}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Город:</span>
                          <span className="ml-2 font-medium text-gray-900">{selectedEvent.city?.name || '—'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Дата:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {new Date(selectedEvent.event_date).toLocaleDateString('ru-RU', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'long',
                            })}
                            {selectedEvent.event_time && ` в ${selectedEvent.event_time.slice(0, 5)}`}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Место:</span>
                          <span className="ml-2 font-medium text-gray-900">{selectedEvent.venue_name || '—'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Цены:</span>
                          <span className="ml-2 font-medium text-gray-900">
                            {selectedEvent.min_price && selectedEvent.max_price 
                              ? `${selectedEvent.min_price.toLocaleString('ru-RU')} — ${selectedEvent.max_price.toLocaleString('ru-RU')} ₽`
                              : '—'}
                          </span>
                        </div>
                      </div>
                      {selectedEvent.venue_address && (
                        <p className="mt-2 text-xs text-gray-500">{selectedEvent.venue_address}</p>
                      )}
                    </div>
                  )}

                  {/* Stage */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Этап воронки *
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {stages.map((stage) => (
                        <button
                          key={stage.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, stage_id: stage.id })}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            formData.stage_id === stage.id
                              ? 'text-white shadow-md'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                          style={formData.stage_id === stage.id ? { backgroundColor: stage.color } : {}}
                        >
                          {stage.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Amount & Tickets */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Сумма (₽)
                      </label>
                      <input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:border-red-500 outline-none"
                        placeholder="0"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Кол-во билетов
                      </label>
                      <input
                        type="number"
                        value={formData.ticket_count}
                        onChange={(e) => setFormData({ ...formData, ticket_count: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:border-red-500 outline-none"
                        min="1"
                      />
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Название / Комментарий
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:border-red-500 outline-none"
                      placeholder="Например: Корпоратив на 20 человек"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={saving || !formData.client_id || !formData.stage_id}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {saving ? 'Создание...' : 'Создать сделку'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
