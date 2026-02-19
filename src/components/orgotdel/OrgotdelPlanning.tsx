'use client';

import { useState, useEffect } from 'react';
import { format, addMonths, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface PlanningItem {
  id: string;
  year_month: string;
  row_number: number;
  date?: string;
  city_name?: string;
  hall_name?: string;
  show_title?: string;
  time?: string;
  notes?: string;
  draft_id?: string;
}

interface MonthComment {
  id: string;
  year_month: string;
  comment?: string;
}

export default function OrgotdelPlanning() {
  const [items, setItems] = useState<PlanningItem[]>([]);
  const [comments, setComments] = useState<MonthComment[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [halls, setHalls] = useState<{ id: string; name: string; city_id: string }[]>([]);
  const [shows, setShows] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [startMonth, setStartMonth] = useState(new Date());

  const displayMonths = [
    format(startMonth, 'yyyy-MM'),
    format(addMonths(startMonth, 1), 'yyyy-MM'),
    format(addMonths(startMonth, 2), 'yyyy-MM'),
    format(addMonths(startMonth, 3), 'yyyy-MM'),
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [planningRes, citiesRes, hallsRes, showsRes, commentsRes] = await Promise.all([
        fetch('/api/orgotdel/planning'),
        fetch('/api/orgotdel/cities'),
        fetch('/api/orgotdel/halls'),
        fetch('/api/orgotdel/shows'),
        fetch('/api/orgotdel/month-comments'),
      ]);

      if (planningRes.ok) setItems(await planningRes.json());
      if (citiesRes.ok) setCities(await citiesRes.json());
      if (hallsRes.ok) setHalls(await hallsRes.json());
      if (showsRes.ok) setShows(await showsRes.json());
      if (commentsRes.ok) setComments(await commentsRes.json());
    } catch (error) {
      console.error('Failed to load planning data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMonthItems = (yearMonth: string) => {
    return items
      .filter(i => i.year_month === yearMonth)
      .sort((a, b) => a.row_number - b.row_number);
  };

  const addRow = async (yearMonth: string) => {
    const monthItems = getMonthItems(yearMonth);
    const newRowNumber = monthItems.length > 0 ? Math.max(...monthItems.map(i => i.row_number)) + 1 : 1;

    try {
      const res = await fetch('/api/orgotdel/planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year_month: yearMonth, row_number: newRowNumber }),
      });
      if (res.ok) {
        const newItem = await res.json();
        setItems([...items, newItem]);
      }
    } catch (error) {
      console.error('Failed to add row:', error);
    }
  };

  const updateItem = async (id: string, field: string, value: string) => {
    try {
      const res = await fetch(`/api/orgotdel/planning/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        setItems(items.map(i => i.id === id ? updated : i));
      }
    } catch (error) {
      console.error('Failed to update item:', error);
    }
  };

  const deleteRow = async (id: string) => {
    if (!confirm('Удалить строку?')) return;
    try {
      const res = await fetch(`/api/orgotdel/planning/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems(items.filter(i => i.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete row:', error);
    }
  };

  const updateComment = async (yearMonth: string, comment: string) => {
    try {
      const res = await fetch('/api/orgotdel/month-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year_month: yearMonth, comment }),
      });
      if (res.ok) {
        const updated = await res.json();
        setComments(prev => {
          const exists = prev.find(c => c.year_month === yearMonth);
          if (exists) {
            return prev.map(c => c.year_month === yearMonth ? updated : c);
          }
          return [...prev, updated];
        });
      }
    } catch (error) {
      console.error('Failed to update comment:', error);
    }
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
      {/* Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setStartMonth(addMonths(startMonth, -1))}
          className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          ← Назад
        </button>
        <span className="text-lg font-semibold text-gray-700">
          Планирование гастролей
        </span>
        <button
          onClick={() => setStartMonth(addMonths(startMonth, 1))}
          className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Вперёд →
        </button>
      </div>

      {/* Months Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {displayMonths.map(yearMonth => {
          const monthItems = getMonthItems(yearMonth);
          const monthComment = comments.find(c => c.year_month === yearMonth);
          const monthDate = parseISO(`${yearMonth}-01`);

          return (
            <div key={yearMonth} className="bg-white rounded-lg border overflow-hidden">
              <div className="bg-red-50 px-4 py-3 border-b">
                <h3 className="font-semibold text-gray-900 capitalize">
                  {format(monthDate, 'LLLL yyyy', { locale: ru })}
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-2 py-2 text-left font-medium text-gray-600 w-24">Дата</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600">Город</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600">Площадка</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600">Спектакль</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-600 w-16">Время</th>
                      <th className="px-2 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthItems.map(item => (
                      <tr key={item.id} className="border-t hover:bg-gray-50">
                        <td className="px-2 py-1">
                          <input
                            type="date"
                            value={item.date || ''}
                            onChange={(e) => updateItem(item.id, 'date', e.target.value)}
                            className="w-full px-1 py-1 border rounded text-xs"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <select
                            value={item.city_name || ''}
                            onChange={(e) => updateItem(item.id, 'city_name', e.target.value)}
                            className="w-full px-1 py-1 border rounded text-xs"
                          >
                            <option value="">—</option>
                            {cities.map(c => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1">
                          <select
                            value={item.hall_name || ''}
                            onChange={(e) => updateItem(item.id, 'hall_name', e.target.value)}
                            className="w-full px-1 py-1 border rounded text-xs"
                          >
                            <option value="">—</option>
                            {halls.map(h => (
                              <option key={h.id} value={h.name}>{h.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1">
                          <select
                            value={item.show_title || ''}
                            onChange={(e) => updateItem(item.id, 'show_title', e.target.value)}
                            className="w-full px-1 py-1 border rounded text-xs"
                          >
                            <option value="">—</option>
                            {shows.map(s => (
                              <option key={s.id} value={s.title}>{s.title}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="text"
                            value={item.time || ''}
                            onChange={(e) => updateItem(item.id, 'time', e.target.value)}
                            placeholder="19:00"
                            className="w-full px-1 py-1 border rounded text-xs"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <button
                            onClick={() => deleteRow(item.id)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {monthItems.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 text-center text-gray-400">
                          Нет записей
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="p-3 border-t bg-gray-50">
                <button
                  onClick={() => addRow(yearMonth)}
                  className="w-full px-3 py-2 text-sm bg-white border border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-red-300 hover:text-red-600"
                >
                  + Добавить строку
                </button>
              </div>

              {/* Month Comment */}
              <div className="p-3 border-t">
                <textarea
                  value={monthComment?.comment || ''}
                  onChange={(e) => updateComment(yearMonth, e.target.value)}
                  placeholder="Комментарий к месяцу..."
                  className="w-full px-3 py-2 text-sm border rounded-lg resize-none"
                  rows={2}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
