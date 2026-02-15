'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Show {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  age_restriction: string;
  is_active: boolean;
  events_count: number;
}

export default function ShowsPage() {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingShow, setEditingShow] = useState<Show | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    duration_minutes: '',
    age_restriction: '12+',
  });

  useEffect(() => {
    loadShows();
  }, []);

  async function loadShows() {
    const { data } = await supabase
      .from('shows')
      .select('*')
      .order('title');

    if (data) {
      // Get events count for each show
      const showsWithCounts = await Promise.all(
        data.map(async (show) => {
          const { count } = await supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('show_id', show.id);
          return { ...show, events_count: count || 0 };
        })
      );
      setShows(showsWithCounts);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (editingShow) {
      await supabase
        .from('shows')
        .update({
          title: form.title,
          description: form.description || null,
          duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
          age_restriction: form.age_restriction || null,
        })
        .eq('id', editingShow.id);
    } else {
      await supabase.from('shows').insert({
        title: form.title,
        description: form.description || null,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        age_restriction: form.age_restriction || null,
        is_active: true,
      });
    }

    setShowModal(false);
    setEditingShow(null);
    setForm({ title: '', description: '', duration_minutes: '', age_restriction: '12+' });
    loadShows();
  }

  function openEdit(show: Show) {
    setEditingShow(show);
    setForm({
      title: show.title,
      description: show.description || '',
      duration_minutes: show.duration_minutes?.toString() || '',
      age_restriction: show.age_restriction || '12+',
    });
    setShowModal(true);
  }

  async function toggleActive(show: Show) {
    await supabase
      .from('shows')
      .update({ is_active: !show.is_active })
      .eq('id', show.id);
    loadShows();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-2xl">🎭</Link>
              <h1 className="text-xl font-bold text-gray-900">Спектакли</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setEditingShow(null);
                  setForm({ title: '', description: '', duration_minutes: '', age_restriction: '12+' });
                  setShowModal(true);
                }}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                + Добавить спектакль
              </button>
              <Link href="/" className="text-gray-600 hover:text-gray-900">← Назад</Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
          </div>
        ) : shows.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <div className="text-6xl mb-4">🎭</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Нет спектаклей</h3>
            <p className="text-gray-500 mb-4">Добавьте первый спектакль для начала работы</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              + Добавить спектакль
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shows.map((show) => (
              <div
                key={show.id}
                className={`bg-white rounded-xl shadow-sm overflow-hidden ${
                  !show.is_active ? 'opacity-60' : ''
                }`}
              >
                <div className="h-32 bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center">
                  <span className="text-5xl text-white/30">🎭</span>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{show.title}</h3>
                    {show.age_restriction && (
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium text-gray-600">
                        {show.age_restriction}
                      </span>
                    )}
                  </div>

                  {show.description && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{show.description}</p>
                  )}

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    {show.duration_minutes && (
                      <span>⏱ {show.duration_minutes} мин</span>
                    )}
                    <span>📅 {show.events_count} событий</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(show)}
                      className="flex-1 py-2 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => toggleActive(show)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        show.is_active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {show.is_active ? '✓' : '○'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingShow ? 'Редактировать спектакль' : 'Новый спектакль'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingShow(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Например: Ревизор"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Длительность (мин)</label>
                  <input
                    type="number"
                    value={form.duration_minutes}
                    onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                    placeholder="120"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Возраст</label>
                  <select
                    value={form.age_restriction}
                    onChange={(e) => setForm({ ...form, age_restriction: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="0+">0+</option>
                    <option value="6+">6+</option>
                    <option value="12+">12+</option>
                    <option value="16+">16+</option>
                    <option value="18+">18+</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingShow(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                >
                  {editingShow ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
