'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSchemaClient, useTeam } from '@/components/providers/TeamProvider';
import { getPublicClient } from '@/lib/supabase-schema';
import SalesTargetWidget from '@/components/dashboard/SalesTargetWidget';

interface Stats {
  totalClients: number;
  leads: number;
  pk: number;
  kb: number;
  dealsActive: number;
  dealsWon: number;
  revenue: number;
  callsTotal: number;
  callsDuration: number;
  ticketsSold: number;
}

interface ManagerStat {
  id: string;
  full_name: string;
  leads_received: number;
  leads_to_pk: number;
  leads_to_kb: number;
  calls_count: number;
  calls_duration: number;
  deals_won: number;
  revenue: number;
  tickets_sold: number;
}

interface PipelineStat {
  pipeline_id: string;
  pipeline_name: string;
  pipeline_code: string;
  total_deals: number;
  won_deals: number;
  lost_deals: number;
  revenue: number;
  conversion: number;
}

interface ProjectStat {
  event_id: string;
  show_title: string;
  city_name: string;
  event_date: string;
  leads_count: number;
  deals_count: number;
  won_count: number;
  revenue: number;
  conversion: number;
}

interface City {
  id: string;
  name: string;
}

interface Manager {
  id: string;
  full_name: string;
}

interface Event {
  id: string;
  event_date: string;
  show?: { title: string } | { title: string }[];
  city?: { name: string } | { name: string }[];
}

interface Filters {
  manager_id: string;
  city_id: string;
  event_id: string;
  source_id: string;
}

export default function AnalyticsPage() {
  const supabase = useSchemaClient();
  const { teamSchema, isLoading: teamLoading } = useTeam();
  const [stats, setStats] = useState<Stats>({
    totalClients: 0,
    leads: 0,
    pk: 0,
    kb: 0,
    dealsActive: 0,
    dealsWon: 0,
    revenue: 0,
    callsTotal: 0,
    callsDuration: 0,
    ticketsSold: 0,
  });
  const [managerStats, setManagerStats] = useState<ManagerStat[]>([]);
  const [pipelineStats, setPipelineStats] = useState<PipelineStat[]>([]);
  const [projectStats, setProjectStats] = useState<ProjectStat[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week');
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'pk' | 'kb' | 'mailings'>('overview');
  const [filters, setFilters] = useState<Filters>({
    manager_id: '',
    city_id: '',
    event_id: '',
    source_id: '',
  });
  
  // Reference data
  const [cities, setCities] = useState<City[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [sources, setSources] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!teamLoading) {
      loadReferenceData();
    }
  }, [teamLoading, teamSchema]);

  useEffect(() => {
    if (!teamLoading) {
      loadStats();
    }
  }, [period, activeTab, filters, teamLoading, teamSchema]);

  async function loadReferenceData() {
    const publicClient = getPublicClient();
    const [citiesRes, managersRes, eventsRes, sourcesRes] = await Promise.all([
      supabase.from('cities').select('id, name').order('name'),
      publicClient.from('managers').select('id, full_name').eq('is_active', true),
      supabase.from('events').select('id, event_date, show:shows(title), city:cities(name)').order('event_date', { ascending: false }).limit(50),
      supabase.from('lead_sources').select('id, name').eq('is_active', true).order('name'),
    ]);
    
    if (citiesRes.data) setCities(citiesRes.data);
    if (managersRes.data) setManagers(managersRes.data);
    if (eventsRes.data) setEvents(eventsRes.data);
    if (sourcesRes.data) setSources(sourcesRes.data);
  }

  async function loadStats() {
    setLoading(true);
    
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const startDate = period === 'today' ? today : period === 'week' ? weekAgo : monthAgo;

    // Build queries with filters
    let clientsQuery = supabase.from('clients').select('id, client_type, city_id, manager_id, source_id, created_at');
    let dealsQuery = supabase.from('deals').select('id, status, amount, tickets_count, pipeline_id, manager_id, event_id, client_id, created_at, closed_at').gte('created_at', startDate);
    let callsQuery = supabase.from('calls').select('id, manager_id, duration_seconds, client_id').gte('started_at', startDate);
    
    if (filters.manager_id) {
      clientsQuery = clientsQuery.eq('manager_id', filters.manager_id);
      dealsQuery = dealsQuery.eq('manager_id', filters.manager_id);
      callsQuery = callsQuery.eq('manager_id', filters.manager_id);
    }
    
    if (filters.city_id) {
      clientsQuery = clientsQuery.eq('city_id', filters.city_id);
    }
    
    if (filters.event_id) {
      dealsQuery = dealsQuery.eq('event_id', filters.event_id);
    }
    
    if (filters.source_id) {
      clientsQuery = clientsQuery.eq('source_id', filters.source_id);
    }

    const publicClient = getPublicClient();
    const [clientsResult, dealsResult, callsResult, pipelinesResult, managersListResult] = await Promise.all([
      clientsQuery,
      dealsQuery,
      callsQuery,
      supabase.from('pipelines').select('id, name, code'),
      publicClient.from('managers').select('id, full_name').eq('is_active', true),
    ]);

    // Process clients stats
    if (clientsResult.data) {
      const clients = clientsResult.data;
      const newClients = clients.filter(c => c.created_at >= startDate);
      
      setStats((prev) => ({
        ...prev,
        totalClients: clients.length,
        leads: clients.filter((c) => c.client_type === 'lead').length,
        pk: clients.filter((c) => c.client_type === 'pk').length,
        kb: clients.filter((c) => c.client_type === 'kb').length,
      }));
    }

    // Process deals stats
    if (dealsResult.data) {
      const deals = dealsResult.data;
      const wonDeals = deals.filter((d) => d.status === 'won');
      
      setStats((prev) => ({
        ...prev,
        dealsActive: deals.filter((d) => d.status === 'active').length,
        dealsWon: wonDeals.length,
        revenue: wonDeals.reduce((sum, d) => sum + (d.amount || 0), 0),
        ticketsSold: wonDeals.reduce((sum, d) => sum + (d.tickets_count || 0), 0),
      }));
      
      // Pipeline stats
      if (pipelinesResult.data) {
        const pStats: PipelineStat[] = pipelinesResult.data.map(pipeline => {
          const pipelineDeals = deals.filter(d => d.pipeline_id === pipeline.id);
          const won = pipelineDeals.filter(d => d.status === 'won');
          const lost = pipelineDeals.filter(d => d.status === 'lost');
          
          return {
            pipeline_id: pipeline.id,
            pipeline_name: pipeline.name,
            pipeline_code: pipeline.code,
            total_deals: pipelineDeals.length,
            won_deals: won.length,
            lost_deals: lost.length,
            revenue: won.reduce((sum, d) => sum + (d.amount || 0), 0),
            conversion: pipelineDeals.length > 0 ? Math.round((won.length / pipelineDeals.length) * 100) : 0,
          };
        });
        setPipelineStats(pStats);
      }
    }

    // Process calls stats
    if (callsResult.data) {
      const calls = callsResult.data;
      setStats((prev) => ({
        ...prev,
        callsTotal: calls.length,
        callsDuration: calls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0),
      }));
    }

    // Manager stats
    if (managersListResult.data && dealsResult.data && callsResult.data && clientsResult.data) {
      const mStats: ManagerStat[] = managersListResult.data.map(manager => {
        const managerDeals = dealsResult.data?.filter(d => d.manager_id === manager.id) || [];
        const managerCalls = callsResult.data?.filter(c => c.manager_id === manager.id) || [];
        const managerClients = clientsResult.data?.filter(c => c.manager_id === manager.id) || [];
        const wonDeals = managerDeals.filter(d => d.status === 'won');
        
        return {
          id: manager.id,
          full_name: manager.full_name,
          leads_received: managerClients.filter(c => c.client_type === 'lead' && c.created_at >= startDate).length,
          leads_to_pk: managerClients.filter(c => c.client_type === 'pk').length,
          leads_to_kb: managerClients.filter(c => c.client_type === 'kb').length,
          calls_count: managerCalls.length,
          calls_duration: managerCalls.reduce((sum, c) => sum + (c.duration_seconds || 0), 0),
          deals_won: wonDeals.length,
          revenue: wonDeals.reduce((sum, d) => sum + (d.amount || 0), 0),
          tickets_sold: wonDeals.reduce((sum, d) => sum + (d.tickets_count || 0), 0),
        };
      }).filter(m => m.calls_count > 0 || m.deals_won > 0 || m.leads_received > 0);
      
      setManagerStats(mStats.sort((a, b) => b.revenue - a.revenue));
    }

    // Project stats
    if (dealsResult.data && events.length > 0) {
      const pStats: ProjectStat[] = events.slice(0, 20).map(event => {
        const eventDeals = dealsResult.data?.filter(d => d.event_id === event.id) || [];
        const wonDeals = eventDeals.filter(d => d.status === 'won');
        
        const showData = Array.isArray(event.show) ? event.show[0] : event.show;
        const cityData = Array.isArray(event.city) ? event.city[0] : event.city;
        
        return {
          event_id: event.id,
          show_title: showData?.title || 'Без названия',
          city_name: cityData?.name || '',
          event_date: event.event_date,
          leads_count: 0, // Would need separate query
          deals_count: eventDeals.length,
          won_count: wonDeals.length,
          revenue: wonDeals.reduce((sum, d) => sum + (d.amount || 0), 0),
          conversion: eventDeals.length > 0 ? Math.round((wonDeals.length / eventDeals.length) * 100) : 0,
        };
      }).filter(p => p.deals_count > 0);
      
      setProjectStats(pStats);
    }

    setLoading(false);
  }

  function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}ч ${minutes}м`;
    }
    return `${minutes} мин`;
  }

  const pipelineTabs = [
    { id: 'overview', label: 'Общая', code: null },
    { id: 'leads', label: 'Новые лиды', code: 'leads' },
    { id: 'pk', label: 'ПК', code: 'pk' },
    { id: 'kb', label: 'КБ', code: 'kb_calling' },
    { id: 'mailings', label: 'Рассылки', code: 'mailings' },
  ];

  const currentPipelineStat = activeTab !== 'overview' 
    ? pipelineStats.find(p => p.pipeline_code === pipelineTabs.find(t => t.id === activeTab)?.code)
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-2xl">🎭</Link>
              <h1 className="text-xl font-bold text-gray-900">Аналитика</h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Period selector */}
              <div className="flex items-center space-x-2">
                {[
                  { value: 'today', label: 'Сегодня' },
                  { value: 'week', label: 'Неделя' },
                  { value: 'month', label: 'Месяц' },
                ].map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPeriod(p.value as 'today' | 'week' | 'month')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      period === p.value
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <Link href="/" className="text-gray-600 hover:text-gray-900">← Назад</Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Pipeline Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {pipelineTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 mb-6 flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-gray-500 mb-1">Менеджер</label>
            <select
              value={filters.manager_id}
              onChange={(e) => setFilters({ ...filters, manager_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:border-red-500 outline-none"
            >
              <option value="">Все менеджеры</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-gray-500 mb-1">Город</label>
            <select
              value={filters.city_id}
              onChange={(e) => setFilters({ ...filters, city_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:border-red-500 outline-none"
            >
              <option value="">Все города</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">Проект (спектакль)</label>
            <select
              value={filters.event_id}
              onChange={(e) => setFilters({ ...filters, event_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:border-red-500 outline-none"
            >
              <option value="">Все проекты</option>
              {events.map((e) => {
                const showData = Array.isArray(e.show) ? e.show[0] : e.show;
                const cityData = Array.isArray(e.city) ? e.city[0] : e.city;
                return (
                  <option key={e.id} value={e.id}>
                    {showData?.title} • {cityData?.name}
                  </option>
                );
              })}
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-gray-500 mb-1">Ресурс (источник)</label>
            <select
              value={filters.source_id}
              onChange={(e) => setFilters({ ...filters, source_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:border-red-500 outline-none"
            >
              <option value="">Все источники</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          {(filters.manager_id || filters.city_id || filters.event_id || filters.source_id) && (
            <button
              onClick={() => setFilters({ manager_id: '', city_id: '', event_id: '', source_id: '' })}
              className="self-end px-4 py-2 text-sm text-red-500 hover:text-red-600"
            >
              Сбросить
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Pipeline specific stats */}
            {currentPipelineStat && (
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 text-white">
                <h2 className="text-lg font-semibold mb-4">{currentPipelineStat.pipeline_name}</h2>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <div className="text-3xl font-bold">{currentPipelineStat.total_deals}</div>
                    <div className="text-sm opacity-70">Всего сделок</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-green-400">{currentPipelineStat.won_deals}</div>
                    <div className="text-sm opacity-70">Выиграно</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">{currentPipelineStat.conversion}%</div>
                    <div className="text-sm opacity-70">Конверсия</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-green-400">{currentPipelineStat.revenue.toLocaleString('ru-RU')} ₽</div>
                    <div className="text-sm opacity-70">Выручка</div>
                  </div>
                </div>
              </div>
            )}

            {/* Main KPIs - Overview */}
            {activeTab === 'overview' && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="text-sm text-gray-500 mb-1">Всего клиентов</div>
                    <div className="text-3xl font-bold text-gray-900">{stats.totalClients}</div>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="text-sm text-gray-500 mb-1">Выиграно сделок</div>
                    <div className="text-3xl font-bold text-green-600">{stats.dealsWon}</div>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="text-sm text-gray-500 mb-1">Выручка</div>
                    <div className="text-2xl font-bold text-green-600">{stats.revenue.toLocaleString('ru-RU')} ₽</div>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="text-sm text-gray-500 mb-1">Звонков</div>
                    <div className="text-3xl font-bold text-gray-900">{stats.callsTotal}</div>
                  </div>
                  <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="text-sm text-gray-500 mb-1">Время в звонках</div>
                    <div className="text-2xl font-bold text-gray-900">{formatDuration(stats.callsDuration)}</div>
                  </div>
                </div>

                {/* Client breakdown */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-4">Клиентская база</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-3xl font-bold text-blue-600">{stats.leads}</div>
                      <div className="text-sm text-gray-500">B2B</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-3xl font-bold text-purple-600">{stats.pk}</div>
                      <div className="text-sm text-gray-500">ПК</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-3xl font-bold text-green-600">{stats.kb}</div>
                      <div className="text-sm text-gray-500">КБ</div>
                    </div>
                  </div>
                </div>

                {/* Pipeline comparison */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-4">Воронки продаж</h3>
                  <div className="grid grid-cols-4 gap-4">
                    {pipelineStats.map((pipeline) => (
                      <div key={pipeline.pipeline_id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="font-medium text-gray-900 mb-2">{pipeline.pipeline_name}</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Сделок:</span>
                            <span className="font-medium">{pipeline.total_deals}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Выиграно:</span>
                            <span className="font-medium text-green-600">{pipeline.won_deals}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Конверсия:</span>
                            <span className="font-medium">{pipeline.conversion}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Выручка:</span>
                            <span className="font-medium text-green-600">{pipeline.revenue.toLocaleString('ru-RU')} ₽</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Manager Stats */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Статистика менеджеров</h3>
              {managerStats.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 uppercase">
                        <th className="pb-3 pr-4">Менеджер</th>
                        <th className="pb-3 px-2 text-center">Лидов получено</th>
                        <th className="pb-3 px-2 text-center">Сдал в ПК</th>
                        <th className="pb-3 px-2 text-center">Сдал в КБ</th>
                        <th className="pb-3 px-2 text-center">Звонков</th>
                        <th className="pb-3 px-2 text-center">Время в звонках</th>
                        <th className="pb-3 px-2 text-center">Сделок</th>
                        <th className="pb-3 px-2 text-center">Билетов</th>
                        <th className="pb-3 px-2 text-right">Выручка</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {managerStats.map((manager) => (
                        <tr key={manager.id} className="hover:bg-gray-50">
                          <td className="py-3 pr-4 font-medium text-gray-900">{manager.full_name}</td>
                          <td className="py-3 px-2 text-center text-blue-600">{manager.leads_received}</td>
                          <td className="py-3 px-2 text-center text-purple-600">{manager.leads_to_pk}</td>
                          <td className="py-3 px-2 text-center text-green-600">{manager.leads_to_kb}</td>
                          <td className="py-3 px-2 text-center">{manager.calls_count}</td>
                          <td className="py-3 px-2 text-center text-gray-500">{formatDuration(manager.calls_duration)}</td>
                          <td className="py-3 px-2 text-center font-medium">{manager.deals_won}</td>
                          <td className="py-3 px-2 text-center">{manager.tickets_sold}</td>
                          <td className="py-3 px-2 text-right font-semibold text-green-600">
                            {manager.revenue.toLocaleString('ru-RU')} ₽
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Нет данных за выбранный период
                </div>
              )}
            </div>

            {/* Sales Target Widget */}
            {activeTab === 'overview' && (
              <SalesTargetWidget />
            )}

            {/* Project Stats */}
            {projectStats.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4">Статистика по проектам</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 uppercase">
                        <th className="pb-3 pr-4">Спектакль</th>
                        <th className="pb-3 px-2">Город</th>
                        <th className="pb-3 px-2">Дата</th>
                        <th className="pb-3 px-2 text-center">Сделок</th>
                        <th className="pb-3 px-2 text-center">Продано</th>
                        <th className="pb-3 px-2 text-center">Конверсия</th>
                        <th className="pb-3 px-2 text-right">Выручка</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {projectStats.map((project) => (
                        <tr key={project.event_id} className="hover:bg-gray-50">
                          <td className="py-3 pr-4 font-medium text-gray-900">{project.show_title}</td>
                          <td className="py-3 px-2 text-gray-500">{project.city_name}</td>
                          <td className="py-3 px-2 text-gray-500">
                            {new Date(project.event_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                          </td>
                          <td className="py-3 px-2 text-center">{project.deals_count}</td>
                          <td className="py-3 px-2 text-center font-medium text-green-600">{project.won_count}</td>
                          <td className="py-3 px-2 text-center">{project.conversion}%</td>
                          <td className="py-3 px-2 text-right font-semibold text-green-600">
                            {project.revenue.toLocaleString('ru-RU')} ₽
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
