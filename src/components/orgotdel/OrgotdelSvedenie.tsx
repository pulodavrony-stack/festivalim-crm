'use client';

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Draft {
  id: string;
  show_title: string;
  hall_name: string;
  city_name: string;
  date: string;
  status: 'negotiating' | 'signing' | 'signed';
  published_event_id?: string;
  notes?: string;
  created_at?: string;
}

export default function OrgotdelSvedenie() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [halls, setHalls] = useState<{ id: string; name: string }[]>([]);
  const [shows, setShows] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [draftsRes, citiesRes, hallsRes, showsRes] = await Promise.all([
        fetch('/api/orgotdel/drafts'),
        fetch('/api/orgotdel/cities'),
        fetch('/api/orgotdel/halls'),
        fetch('/api/orgotdel/shows'),
      ]);

      if (draftsRes.ok) setDrafts(await draftsRes.json());
      if (citiesRes.ok) setCities(await citiesRes.json());
      if (hallsRes.ok) setHalls(await hallsRes.json());
      if (showsRes.ok) setShows(await showsRes.json());
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateDraftStatus = async (id: string, status: Draft['status']) => {
    try {
      const res = await fetch(`/api/orgotdel/drafts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const publishDraft = async (id: string) => {
    try {
      const res = await fetch(`/api/orgotdel/drafts/${id}/publish`, { method: 'POST' });
      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Failed to publish:', error);
    }
  };

  const deleteDraft = async (id: string) => {
    if (!confirm('Удалить черновик?')) return;
    try {
      const res = await fetch(`/api/orgotdel/drafts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDrafts(drafts.filter(d => d.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const createDraft = async (data: Partial<Draft>) => {
    try {
      const res = await fetch('/api/orgotdel/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        loadData();
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to create:', error);
    }
  };

  const statusLabels: Record<string, string> = {
    negotiating: 'Договариваемся',
    signing: 'Подписание',
    signed: 'Подписано',
  };

  const statusColors: Record<string, string> = {
    negotiating: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    signing: 'bg-blue-100 text-blue-800 border-blue-300',
    signed: 'bg-green-100 text-green-800 border-green-300',
  };

  const activeDrafts = drafts.filter(d => !d.published_event_id);
  const publishedDrafts = drafts.filter(d => d.published_event_id);

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Сведение (черновики)</h2>
          <p className="text-sm text-gray-500">Управление договорённостями до публикации</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Новый черновик
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-700">
            {activeDrafts.filter(d => d.status === 'negotiating').length}
          </div>
          <div className="text-sm text-yellow-600">Договариваемся</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-700">
            {activeDrafts.filter(d => d.status === 'signing').length}
          </div>
          <div className="text-sm text-blue-600">Подписание</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-700">
            {publishedDrafts.length}
          </div>
          <div className="text-sm text-green-600">Опубликовано</div>
        </div>
      </div>

      {/* Active Drafts */}
      <div className="bg-white rounded-lg border overflow-hidden mb-6">
        <div className="px-4 py-3 bg-gray-50 border-b">
          <h3 className="font-semibold text-gray-900">Активные черновики ({activeDrafts.length})</h3>
        </div>
        <div className="divide-y">
          {activeDrafts.map(draft => (
            <div key={draft.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{draft.show_title}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${statusColors[draft.status]}`}>
                      {statusLabels[draft.status]}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    📍 {draft.city_name} • 🏛️ {draft.hall_name}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    📅 {format(parseISO(draft.date), 'd MMMM yyyy', { locale: ru })}
                  </div>
                  {draft.notes && (
                    <div className="text-sm text-gray-400 mt-1 italic">{draft.notes}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Status workflow buttons */}
                  {draft.status === 'negotiating' && (
                    <button
                      onClick={() => updateDraftStatus(draft.id, 'signing')}
                      className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      → Подписание
                    </button>
                  )}
                  {draft.status === 'signing' && (
                    <button
                      onClick={() => updateDraftStatus(draft.id, 'signed')}
                      className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                    >
                      → Подписано
                    </button>
                  )}
                  {draft.status === 'signed' && !draft.published_event_id && (
                    <button
                      onClick={() => publishDraft(draft.id)}
                      className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Опубликовать
                    </button>
                  )}
                  <button
                    onClick={() => deleteDraft(draft.id)}
                    className="p-2 text-gray-400 hover:text-red-500"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
          {activeDrafts.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              Нет активных черновиков
            </div>
          )}
        </div>
      </div>

      {/* Published Drafts */}
      {publishedDrafts.length > 0 && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-4 py-3 bg-green-50 border-b">
            <h3 className="font-semibold text-green-800">Опубликованные ({publishedDrafts.length})</h3>
          </div>
          <div className="divide-y">
            {publishedDrafts.map(draft => (
              <div key={draft.id} className="p-4 opacity-60">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">{draft.show_title}</span>
                  <span className="text-sm text-gray-500">
                    📍 {draft.city_name} • 📅 {format(parseISO(draft.date), 'd MMM yyyy', { locale: ru })}
                  </span>
                  <span className="ml-auto text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                    ✓ Опубликовано
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <DraftModal
          cities={cities}
          halls={halls}
          shows={shows}
          onClose={() => setIsModalOpen(false)}
          onSave={createDraft}
        />
      )}
    </div>
  );
}

function DraftModal({
  cities,
  halls,
  shows,
  onClose,
  onSave,
}: {
  cities: { id: string; name: string }[];
  halls: { id: string; name: string }[];
  shows: { id: string; title: string }[];
  onClose: () => void;
  onSave: (data: Partial<any>) => void;
}) {
  const [showTitle, setShowTitle] = useState('');
  const [cityName, setCityName] = useState('');
  const [hallName, setHallName] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      show_title: showTitle,
      city_name: cityName,
      hall_name: hallName,
      date,
      notes,
      status: 'negotiating',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Новый черновик</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Спектакль</label>
              <select
                value={showTitle}
                onChange={(e) => setShowTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                required
              >
                <option value="">Выберите спектакль</option>
                {shows.map(s => (
                  <option key={s.id} value={s.title}>{s.title}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Город</label>
                <select
                  value={cityName}
                  onChange={(e) => setCityName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">Выберите город</option>
                  {cities.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Площадка</label>
                <select
                  value={hallName}
                  onChange={(e) => setHallName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">Выберите площадку</option>
                  {halls.map(h => (
                    <option key={h.id} value={h.name}>{h.name}</option>
                  ))}
                </select>
              </div>
            </div>

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
              <label className="block text-sm font-medium text-gray-700 mb-1">Заметки</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
                Отмена
              </button>
              <button type="submit" className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                Создать
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
