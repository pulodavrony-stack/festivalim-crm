'use client';

import { useState, useEffect } from 'react';

type DirectoryTab = 'cities' | 'halls' | 'shows';

interface City {
  id: string;
  name: string;
  timezone: string;
  priority: number;
  office: string;
}

interface Hall {
  id: string;
  name: string;
  city_id: string;
  address?: string;
  capacity?: number;
  comments?: string;
  cities?: { name: string };
}

interface Show {
  id: string;
  title: string;
  rating?: string;
}

export default function OrgotdelDirectories() {
  const [activeTab, setActiveTab] = useState<DirectoryTab>('cities');
  const [cities, setCities] = useState<City[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [citiesRes, hallsRes, showsRes] = await Promise.all([
        fetch('/api/orgotdel/cities'),
        fetch('/api/orgotdel/halls'),
        fetch('/api/orgotdel/shows'),
      ]);

      if (citiesRes.ok) setCities(await citiesRes.json());
      if (hallsRes.ok) setHalls(await hallsRes.json());
      if (showsRes.ok) setShows(await showsRes.json());
    } catch (error) {
      console.error('Failed to load directories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (type: DirectoryTab, data: any) => {
    try {
      const res = await fetch(`/api/orgotdel/${type}`, {
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

  const handleUpdate = async (type: DirectoryTab, id: string, data: any) => {
    try {
      const res = await fetch(`/api/orgotdel/${type}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        loadData();
        setEditingItem(null);
      }
    } catch (error) {
      console.error('Failed to update:', error);
    }
  };

  const handleDelete = async (type: DirectoryTab, id: string) => {
    if (!confirm('Удалить запись?')) return;
    try {
      const res = await fetch(`/api/orgotdel/${type}/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const tabs = [
    { id: 'cities' as DirectoryTab, label: 'Города', count: cities.length, icon: '🏙️' },
    { id: 'halls' as DirectoryTab, label: 'Площадки', count: halls.length, icon: '🏛️' },
    { id: 'shows' as DirectoryTab, label: 'Спектакли', count: shows.length, icon: '🎭' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === tab.id ? 'bg-white/20' : 'bg-gray-200'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
        <button
          onClick={() => setIsModalOpen(true)}
          className="ml-auto px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Добавить
        </button>
      </div>

      {/* Content */}
      {activeTab === 'cities' && (
        <CitiesTable cities={cities} onDelete={(id) => handleDelete('cities', id)} onEdit={setEditingItem} />
      )}
      {activeTab === 'halls' && (
        <HallsTable halls={halls} cities={cities} onDelete={(id) => handleDelete('halls', id)} onEdit={setEditingItem} />
      )}
      {activeTab === 'shows' && (
        <ShowsTable shows={shows} onDelete={(id) => handleDelete('shows', id)} onEdit={setEditingItem} />
      )}

      {/* Modal */}
      {(isModalOpen || editingItem) && (
        <DirectoryModal
          type={activeTab}
          item={editingItem}
          cities={cities}
          onClose={() => {
            setIsModalOpen(false);
            setEditingItem(null);
          }}
          onSave={(data) => {
            if (editingItem) {
              handleUpdate(activeTab, editingItem.id, data);
            } else {
              handleCreate(activeTab, data);
            }
          }}
        />
      )}
    </div>
  );
}

function CitiesTable({ cities, onDelete, onEdit }: { cities: City[]; onDelete: (id: string) => void; onEdit: (item: any) => void }) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Название</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Часовой пояс</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Приоритет</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Офис</th>
            <th className="px-4 py-3 w-20"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {cities.map(city => (
            <tr key={city.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{city.name}</td>
              <td className="px-4 py-3 text-gray-600">{city.timezone}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded text-xs ${
                  city.priority === 1 ? 'bg-red-100 text-red-700' :
                  city.priority === 2 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {city.priority}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600">{city.office}</td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <button onClick={() => onEdit(city)} className="p-1 text-gray-400 hover:text-blue-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button onClick={() => onDelete(city.id)} className="p-1 text-gray-400 hover:text-red-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {cities.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Нет городов</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function HallsTable({ halls, cities, onDelete, onEdit }: { halls: Hall[]; cities: City[]; onDelete: (id: string) => void; onEdit: (item: any) => void }) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Название</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Город</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Адрес</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Вместимость</th>
            <th className="px-4 py-3 w-20"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {halls.map(hall => (
            <tr key={hall.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{hall.name}</td>
              <td className="px-4 py-3 text-gray-600">{hall.cities?.name || cities.find(c => c.id === hall.city_id)?.name || '—'}</td>
              <td className="px-4 py-3 text-gray-600">{hall.address || '—'}</td>
              <td className="px-4 py-3 text-gray-600">{hall.capacity || '—'}</td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <button onClick={() => onEdit(hall)} className="p-1 text-gray-400 hover:text-blue-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button onClick={() => onDelete(hall.id)} className="p-1 text-gray-400 hover:text-red-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {halls.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Нет площадок</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ShowsTable({ shows, onDelete, onEdit }: { shows: Show[]; onDelete: (id: string) => void; onEdit: (item: any) => void }) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Название</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Рейтинг</th>
            <th className="px-4 py-3 w-20"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {shows.map(show => (
            <tr key={show.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{show.title}</td>
              <td className="px-4 py-3 text-gray-600">{show.rating || '—'}</td>
              <td className="px-4 py-3">
                <div className="flex gap-1">
                  <button onClick={() => onEdit(show)} className="p-1 text-gray-400 hover:text-blue-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button onClick={() => onDelete(show.id)} className="p-1 text-gray-400 hover:text-red-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {shows.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 py-8 text-center text-gray-400">Нет спектаклей</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function DirectoryModal({
  type,
  item,
  cities,
  onClose,
  onSave,
}: {
  type: DirectoryTab;
  item: any;
  cities: City[];
  onClose: () => void;
  onSave: (data: any) => void;
}) {
  const [formData, setFormData] = useState<any>(item || {});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {item ? 'Редактировать' : 'Добавить'} {type === 'cities' ? 'город' : type === 'halls' ? 'площадку' : 'спектакль'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {type === 'cities' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Часовой пояс</label>
                    <input
                      type="text"
                      value={formData.timezone || 'Europe/Moscow'}
                      onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Приоритет</label>
                    <select
                      value={formData.priority || 2}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                    >
                      <option value={1}>1 (Высокий)</option>
                      <option value={2}>2 (Средний)</option>
                      <option value={3}>3 (Низкий)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Офис</label>
                  <select
                    value={formData.office || 'Этажи'}
                    onChange={(e) => setFormData({ ...formData, office: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  >
                    <option value="Этажи">Этажи</option>
                    <option value="Атлант">Атлант</option>
                  </select>
                </div>
              </>
            )}

            {type === 'halls' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Город</label>
                  <select
                    value={formData.city_id || ''}
                    onChange={(e) => setFormData({ ...formData, city_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                    required
                  >
                    <option value="">Выберите город</option>
                    {cities.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Адрес</label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Вместимость</label>
                  <input
                    type="number"
                    value={formData.capacity || ''}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || null })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </>
            )}

            {type === 'shows' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Рейтинг</label>
                  <input
                    type="text"
                    value={formData.rating || ''}
                    onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                    placeholder="0+"
                  />
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
                Отмена
              </button>
              <button type="submit" className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                {item ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
