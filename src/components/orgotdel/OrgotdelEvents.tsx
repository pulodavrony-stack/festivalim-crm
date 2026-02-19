'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, parseISO, isBefore, startOfToday, addMonths, isSameDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Event {
  id: string;
  title: string;
  city: string;
  hall: string;
  date: string;
  description?: string;
  status: 'negotiating' | 'signing' | 'signed';
  contract_date?: string;
  is_deleted?: boolean;
  created_at?: string;
}

type ViewMode = 'list' | 'calendar';

export default function OrgotdelEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPast, setShowPast] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const res = await fetch('/api/orgotdel/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  const today = startOfToday();

  const { futureEvents, pastEvents } = useMemo(() => {
    const filtered = events.filter(e => {
      const q = searchQuery.toLowerCase();
      return (
        e.title.toLowerCase().includes(q) ||
        e.city.toLowerCase().includes(q) ||
        e.hall.toLowerCase().includes(q)
      );
    });

    return {
      futureEvents: filtered.filter(e => !isBefore(parseISO(e.date), today)),
      pastEvents: filtered.filter(e => isBefore(parseISO(e.date), today)),
    };
  }, [events, searchQuery, today]);

  const groupedEvents = useMemo(() => {
    const groups: Record<string, Event[]> = {};
    futureEvents.forEach(event => {
      const monthKey = format(parseISO(event.date), 'LLLL yyyy', { locale: ru });
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(event);
    });
    return groups;
  }, [futureEvents]);

  const handleDelete = async (id: string) => {
    if (!confirm('Переместить событие в корзину?')) return;
    try {
      const res = await fetch(`/api/orgotdel/events/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEvents(events.filter(e => e.id !== id));
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleCreate = async (data: Partial<Event>) => {
    try {
      const res = await fetch('/api/orgotdel/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        loadEvents();
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error('Create failed:', error);
    }
  };

  const handleUpdate = async (id: string, data: Partial<Event>) => {
    try {
      const res = await fetch(`/api/orgotdel/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        loadEvents();
        setEditingEvent(null);
      }
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  const statusLabels: Record<string, string> = {
    negotiating: 'Договариваемся',
    signing: 'Подписание',
    signed: 'Подписано',
  };

  const statusColors: Record<string, string> = {
    negotiating: 'bg-yellow-100 text-yellow-800',
    signing: 'bg-blue-100 text-blue-800',
    signed: 'bg-green-100 text-green-800',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Поиск по названию, городу, площадке..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          />
          <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              viewMode === 'list' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Список
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
              viewMode === 'calendar' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Календарь
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Добавить
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border">
          <div className="text-2xl font-bold text-gray-900">{futureEvents.length}</div>
          <div className="text-sm text-gray-500">Будущих событий</div>
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <div className="text-2xl font-bold text-gray-900">{pastEvents.length}</div>
          <div className="text-sm text-gray-500">Прошедших</div>
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <div className="text-2xl font-bold text-green-600">
            {events.filter(e => e.status === 'signed').length}
          </div>
          <div className="text-sm text-gray-500">Подписано</div>
        </div>
        <div className="bg-white rounded-lg p-4 border">
          <div className="text-2xl font-bold text-yellow-600">
            {events.filter(e => e.status === 'negotiating').length}
          </div>
          <div className="text-sm text-gray-500">В работе</div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        <div className="space-y-6">
          {Object.entries(groupedEvents).map(([month, monthEvents]) => (
            <div key={month}>
              <h3 className="text-lg font-semibold text-gray-900 mb-3 capitalize">{month}</h3>
              <div className="space-y-2">
                {monthEvents.map((event) => (
                  <div
                    key={event.id}
                    className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setEditingEvent(event)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-900">{event.title}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[event.status]}`}>
                            {statusLabels[event.status]}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          📍 {event.city} • 🏛️ {event.hall}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          📅 {format(parseISO(event.date), 'd MMMM yyyy', { locale: ru })}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(event.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {futureEvents.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Нет будущих событий
            </div>
          )}

          {/* Past Events Toggle */}
          {pastEvents.length > 0 && (
            <div className="mt-8">
              <button
                onClick={() => setShowPast(!showPast)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <svg className={`w-5 h-5 transition-transform ${showPast ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Прошедшие события ({pastEvents.length})
              </button>
              
              {showPast && (
                <div className="mt-4 space-y-2 opacity-60">
                  {pastEvents.map((event) => (
                    <div key={event.id} className="bg-gray-50 rounded-lg border p-4">
                      <div className="font-medium text-gray-700">{event.title}</div>
                      <div className="text-sm text-gray-500">
                        📍 {event.city} • 📅 {format(parseISO(event.date), 'd MMMM yyyy', { locale: ru })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <CalendarView
          events={futureEvents}
          currentMonth={calendarMonth}
          onPrevMonth={() => setCalendarMonth(addMonths(calendarMonth, -1))}
          onNextMonth={() => setCalendarMonth(addMonths(calendarMonth, 1))}
          onEventClick={(event) => setEditingEvent(event)}
        />
      )}

      {/* Create/Edit Modal */}
      {(isModalOpen || editingEvent) && (
        <EventModal
          event={editingEvent}
          onClose={() => {
            setIsModalOpen(false);
            setEditingEvent(null);
          }}
          onSave={(data) => {
            if (editingEvent) {
              handleUpdate(editingEvent.id, data);
            } else {
              handleCreate(data);
            }
          }}
        />
      )}
    </div>
  );
}

function CalendarView({ 
  events, 
  currentMonth, 
  onPrevMonth, 
  onNextMonth,
  onEventClick 
}: {
  events: Event[];
  currentMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onEventClick: (event: Event) => void;
}) {
  const months = [
    currentMonth,
    addMonths(currentMonth, 1),
    addMonths(currentMonth, 2),
    addMonths(currentMonth, 3),
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onPrevMonth} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
          ← Назад
        </button>
        <span className="text-gray-600">
          {format(currentMonth, 'LLLL', { locale: ru })} — {format(addMonths(currentMonth, 3), 'LLLL yyyy', { locale: ru })}
        </span>
        <button onClick={onNextMonth} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
          Вперёд →
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {months.map((month, idx) => (
          <MonthCalendar key={idx} month={month} events={events} onEventClick={onEventClick} />
        ))}
      </div>
    </div>
  );
}

function MonthCalendar({ 
  month, 
  events,
  onEventClick 
}: { 
  month: Date; 
  events: Event[];
  onEventClick: (event: Event) => void;
}) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getEventsForDay = (date: Date) => {
    return events.filter(e => isSameDay(parseISO(e.date), date));
  };

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const today = new Date();

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-red-50 border-b">
        <h3 className="text-sm font-semibold capitalize text-center text-gray-900">
          {format(month, 'LLLL yyyy', { locale: ru })}
        </h3>
      </div>
      
      <div className="grid grid-cols-7 border-b">
        {weekDays.map(d => (
          <div key={d} className="p-1 text-center text-xs font-medium text-gray-500 border-r last:border-r-0">
            {d}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7">
        {days.map((date, idx) => {
          const dayEvents = getEventsForDay(date);
          const isCurrentMonth = isSameMonth(date, month);
          const isToday = isSameDay(date, today);
          
          return (
            <div
              key={idx}
              className={`min-h-[70px] p-0.5 border-r border-b last:border-r-0 ${
                !isCurrentMonth ? 'bg-gray-50' : ''
              } ${isToday ? 'bg-red-50' : ''}`}
            >
              <div className={`text-xs font-medium mb-0.5 px-0.5 ${
                !isCurrentMonth ? 'text-gray-300' : isToday ? 'text-red-600 font-bold' : 'text-gray-600'
              }`}>
                {format(date, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 2).map(event => (
                  <div
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className="text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 bg-red-500 text-white"
                    title={`${event.title} - ${event.city}`}
                  >
                    <span className="font-medium">{event.city}</span>
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-[10px] text-gray-500 px-0.5">
                    +{dayEvents.length - 2}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventModal({ 
  event, 
  onClose, 
  onSave 
}: { 
  event: Event | null;
  onClose: () => void;
  onSave: (data: Partial<Event>) => void;
}) {
  const [title, setTitle] = useState(event?.title || '');
  const [city, setCity] = useState(event?.city || '');
  const [hall, setHall] = useState(event?.hall || '');
  const [date, setDate] = useState(event?.date || '');
  const [status, setStatus] = useState(event?.status || 'negotiating');
  const [description, setDescription] = useState(event?.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ title, city, hall, date, status, description });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {event ? 'Редактировать событие' : 'Новое событие'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Название (спектакль)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Город</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Площадка</label>
                <input
                  type="text"
                  value={hall}
                  onChange={(e) => setHall(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Event['status'])}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="negotiating">Договариваемся</option>
                  <option value="signing">Подписание</option>
                  <option value="signed">Подписано</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                {event ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
