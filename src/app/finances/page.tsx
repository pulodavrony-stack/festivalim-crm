'use client';

import { useState, useEffect, useCallback } from 'react';
import ProjectCalculatorForm from '@/components/finances/ProjectCalculatorForm';
import * as F from '@/lib/calculator-formulas';

interface ProjectCalc {
  id: string;
  project_name: string;
  city: string;
  event_date: string;
  plan_approval_date: string;
  status: string;
  total_tickets: number;
  avg_ticket_price: number;
  manager_sales_share: number;
  manager_discount: number;
  discounted_tickets_share: number;
  manager_commission_percent: number;
  platform_commission_percent: number;
  actual_values: Record<string, number>;
  comments: Record<string, string>;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export default function FinancesPage() {
  const [projects, setProjects] = useState<ProjectCalc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editingProject, setEditingProject] = useState<ProjectCalc | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (cityFilter) params.set('city', cityFilter);
    if (statusFilter) params.set('status', statusFilter);
    
    const res = await fetch(`/api/finances/calculator?${params}`);
    if (res.ok) {
      const data = await res.json();
      setProjects(data);
    }
    setLoading(false);
  }, [search, cityFilter, statusFilter]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleSave = async (data: Record<string, unknown>) => {
    setSaving(true);
    const { id, ...body } = data;
    const url = id ? `/api/finances/calculator/${id}` : '/api/finances/calculator';
    const method = id ? 'PATCH' : 'POST';

    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) {
      setEditingProject(null);
      setCreating(false);
      fetchProjects();
    }
    setSaving(false);
  };

  const handleDuplicate = async (id: string) => {
    const res = await fetch(`/api/finances/calculator/${id}/duplicate`, { method: 'POST' });
    if (res.ok) fetchProjects();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот расчёт?')) return;
    const res = await fetch(`/api/finances/calculator/${id}`, { method: 'DELETE' });
    if (res.ok) fetchProjects();
  };

  const cities = [...new Set(projects.map(p => p.city).filter(Boolean))];

  const getMargin = (p: ProjectCalc) => {
    const d = p as unknown as F.CalcData;
    return F.calcPlannedMargin(d);
  };

  const getMarginPct = (p: ProjectCalc) => {
    const d = p as unknown as F.CalcData;
    return F.calcPlannedMarginPercent(d);
  };

  const statusLabels: Record<string, string> = { draft: 'Черновик', approved: 'Утверждён', completed: 'Завершён' };
  const statusColors: Record<string, string> = { draft: 'bg-gray-100 text-gray-700', approved: 'bg-green-100 text-green-700', completed: 'bg-blue-100 text-blue-700' };

  if (creating || editingProject) {
    return (
      <div className="p-4 lg:p-6 max-w-[1400px] mx-auto">
        <div className="mb-4">
          <button onClick={() => { setCreating(false); setEditingProject(null); }} className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Назад к списку
          </button>
        </div>
        <ProjectCalculatorForm
          project={editingProject || undefined}
          onSave={handleSave}
          onCancel={() => { setCreating(false); setEditingProject(null); }}
          saving={saving}
        />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💰 Калькулятор проектов</h1>
          <p className="text-sm text-gray-500 mt-1">Расчёт плановой рентабельности спектаклей</p>
        </div>
        <button onClick={() => setCreating(true)} className="px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Новый расчёт
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по названию..."
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className="px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-red-500">
            <option value="">Все города</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-red-500">
            <option value="">Все статусы</option>
            <option value="draft">Черновик</option>
            <option value="approved">Утверждён</option>
            <option value="completed">Завершён</option>
          </select>
        </div>
      </div>

      {/* Projects list */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Загрузка...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm border">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Нет расчётов</h3>
          <p className="text-gray-500 mb-6">Создайте первый расчёт рентабельности спектакля</p>
          <button onClick={() => setCreating(true)} className="px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600">
            Создать расчёт
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-200">
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Спектакль</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Город</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Дата</th>
                  <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Выручка</th>
                  <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Маржа</th>
                  <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Марж-ть</th>
                  <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase">Статус</th>
                  <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody>
                {projects.map(p => {
                  const margin = getMargin(p);
                  const marginPct = getMarginPct(p);
                  return (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setEditingProject(p)}>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{p.project_name}</div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{p.city}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{p.event_date ? new Date(p.event_date).toLocaleDateString('ru-RU') : '—'}</td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-gray-900">{F.fmtRub(F.calcPlannedRevenue(p as unknown as F.CalcData))}</td>
                      <td className={`py-3 px-4 text-sm text-right font-bold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>{F.fmtRub(margin)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${marginPct >= 40 ? 'bg-green-100 text-green-700' : marginPct >= 20 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {F.fmtPct(marginPct)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[p.status] || ''}`}>
                          {statusLabels[p.status] || p.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setEditingProject(p)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Редактировать">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => handleDuplicate(p.id)} className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg" title="Дублировать">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Удалить">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
