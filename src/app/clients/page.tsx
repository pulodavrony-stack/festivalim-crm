'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useTeam } from '@/components/providers/TeamProvider';
import { getPublicClient } from '@/lib/supabase-schema';
import { schemaWrite, schemaSelect } from '@/lib/schema-api';
import Tooltip from '@/components/ui/Tooltip';

interface Client {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  client_type: 'lead' | 'pk' | 'kb';
  status: string;
  city?: { name: string };
  source?: { name: string };
  manager_id?: string;
  total_purchases: number;
  total_revenue: number;
  last_contact_date: string;
  last_activity_at: string;
  created_at: string;
  tags?: { id: string; name: string; color: string }[];
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

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Filters {
  client_type: 'all' | 'lead' | 'pk' | 'kb';
  status: string;
  city_id: string;
  manager_id: string;
  event_ids: string[];
  tag_ids: string[];
  last_activity_from: string;
  last_activity_to: string;
  sort_by: 'created_at' | 'last_activity_at' | 'last_contact_date' | 'full_name';
  sort_order: 'asc' | 'desc';
  filter_logic: 'and' | 'or';
}

const clientTypeLabels = {
  lead: { label: 'Лид', color: 'bg-blue-100 text-blue-700' },
  pk: { label: 'ПК', color: 'bg-purple-100 text-purple-700' },
  kb: { label: 'КБ', color: 'bg-green-100 text-green-700' },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  new: { label: 'Новый', color: 'bg-blue-500' },
  in_progress: { label: 'В работе', color: 'bg-yellow-500' },
  callback: { label: 'Перезвонить', color: 'bg-orange-500' },
  interested: { label: 'Интерес', color: 'bg-pink-500' },
  active: { label: 'Активный', color: 'bg-green-500' },
  vip: { label: 'VIP', color: 'bg-purple-500' },
  inactive: { label: 'Неактивный', color: 'bg-gray-400' },
};

export default function ClientsPage() {
  const { teamSchema, isLoading: teamLoading, managerId: currentManagerId, isAdmin } = useTeam();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [totalStats, setTotalStats] = useState({ all: 0, lead: 0, pk: 0, kb: 0 });
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [selectedTagsForBulk, setSelectedTagsForBulk] = useState<Set<string>>(new Set());
  
  // Reference data
  const [cities, setCities] = useState<City[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  
  // Filters
  const [filters, setFilters] = useState<Filters>({
    client_type: 'all',
    status: '',
    city_id: '',
    manager_id: '',
    event_ids: [],
    tag_ids: [],
    last_activity_from: '',
    last_activity_to: '',
    sort_by: 'created_at',
    sort_order: 'desc',
    filter_logic: 'and',
  });

  // Auto-filter by current manager for non-admin users
  useEffect(() => {
    if (!teamLoading && currentManagerId && !isAdmin) {
      setFilters(prev => ({ ...prev, manager_id: currentManagerId }));
    }
  }, [teamLoading, currentManagerId, isAdmin]);

  useEffect(() => {
    if (!teamLoading) {
      loadReferenceData();
    }
  }, [teamLoading, teamSchema]);

  useEffect(() => {
    if (!teamLoading) {
      loadClients();
    }
  }, [filters, teamLoading, teamSchema]);

  async function loadReferenceData() {
    try {
      const publicClient = getPublicClient();
      
      const [citiesRes, managersRes, allClientsRes] = await Promise.all([
        schemaSelect(teamSchema, 'cities', { select: 'id, name', order: { column: 'name', ascending: true } }),
        publicClient.from('managers').select('id, full_name').eq('is_active', true),
        schemaSelect(teamSchema, 'clients', { select: 'client_type' }),
      ]);
      
      if (citiesRes.data) setCities(citiesRes.data);
      if (managersRes.data) setManagers(managersRes.data);
      if (allClientsRes.data) {
        const all = allClientsRes.data as any[];
        setTotalStats({
          all: all.length,
          lead: all.filter(c => c.client_type === 'lead').length,
          pk: all.filter(c => c.client_type === 'pk').length,
          kb: all.filter(c => c.client_type === 'kb').length,
        });
      }
      
      const tagsRes = await schemaSelect(teamSchema, 'tags', { select: 'id, name, color', order: { column: 'name', ascending: true } });
      if (tagsRes.data) setTags(tagsRes.data as any[]);
    } catch (err) {
      console.error('Error loading reference data:', err);
    }
  }

  async function loadClients() {
    setLoading(true);
    try {
    const queryFilters: Record<string, any> = {};
    const queryGte: Record<string, any> = {};
    const queryLte: Record<string, any> = {};

    if (filters.client_type !== 'all') queryFilters.client_type = filters.client_type;
    if (filters.status) queryFilters.status = filters.status;
    if (filters.city_id) queryFilters.city_id = filters.city_id;
    if (filters.manager_id) queryFilters.manager_id = filters.manager_id;
    if (filters.last_activity_from) queryGte.last_activity_at = filters.last_activity_from;
    if (filters.last_activity_to) queryLte.last_activity_at = filters.last_activity_to + 'T23:59:59';

    const { data, error } = await schemaSelect<any[]>(teamSchema, 'clients', {
      filters: Object.keys(queryFilters).length > 0 ? queryFilters : undefined,
      filtersGte: Object.keys(queryGte).length > 0 ? queryGte : undefined,
      filtersLte: Object.keys(queryLte).length > 0 ? queryLte : undefined,
      order: { column: filters.sort_by, ascending: filters.sort_order === 'asc' },
      limit: 200,
    });

    if (error) {
      console.error('Error loading clients:', error);
      setClients([]);
      setLoading(false);
      return;
    }

    let citiesMap: Record<string, string> = {};
    let sourcesMap: Record<string, string> = {};

    if (data && data.length > 0) {
      const cityIds = [...new Set(data.map((c: any) => c.city_id).filter(Boolean))];
      const sourceIds = [...new Set(data.map((c: any) => c.source_id).filter(Boolean))];

      const [citiesRes, sourcesRes] = await Promise.all([
        cityIds.length > 0
          ? schemaSelect(teamSchema, 'cities', { select: 'id, name', filtersIn: { id: cityIds } })
          : { data: null },
        sourceIds.length > 0
          ? schemaSelect(teamSchema, 'lead_sources', { select: 'id, name', filtersIn: { id: sourceIds } })
          : { data: null },
      ]);

      if (citiesRes.data) (citiesRes.data as any[]).forEach((c: any) => { citiesMap[c.id] = c.name; });
      if (sourcesRes.data) (sourcesRes.data as any[]).forEach((s: any) => { sourcesMap[s.id] = s.name; });
    }

    if (data) {
      data.forEach((c: any) => {
        if (c.city_id && citiesMap[c.city_id]) c.city = { name: citiesMap[c.city_id] };
        if (c.source_id && sourcesMap[c.source_id]) c.source = { name: sourcesMap[c.source_id] };
      });

      const clientIds = data.map((c: any) => c.id);
      let clientTags: any[] | null = null;
      if (clientIds.length > 0) {
        try {
          const tagsRes = await schemaSelect(teamSchema, 'client_tags', {
            select: 'client_id, tag:tags(id, name, color)',
            filtersIn: { client_id: clientIds },
          });
          clientTags = tagsRes.data as any[];
        } catch (e) {}
      }

      const clientsWithTags = data.map((client: any) => ({
        ...client,
        tags: clientTags?.filter(ct => ct.client_id === client.id).map(ct => {
          const t = Array.isArray(ct.tag) ? ct.tag[0] : ct.tag;
          return t;
        }).filter(Boolean) || []
      }));

      let filteredData = clientsWithTags;

      if (filters.tag_ids.length > 0) {
        if (filters.filter_logic === 'and') {
          filteredData = filteredData.filter(c =>
            filters.tag_ids.every(tagId => c.tags?.some((t: { id: string }) => t?.id === tagId))
          );
        } else {
          filteredData = filteredData.filter(c =>
            filters.tag_ids.some(tagId => c.tags?.some((t: { id: string }) => t?.id === tagId))
          );
        }
      }

      if (filters.event_ids.length > 0) {
        const dealsRes = await schemaSelect(teamSchema, 'deals', {
          select: 'client_id',
          filtersIn: { event_id: filters.event_ids },
        });

        const clientIdsWithEvents = Array.from(new Set((dealsRes.data as any[])?.map((d: any) => d.client_id) || []));

        if (filters.filter_logic === 'and' && filters.tag_ids.length > 0) {
          filteredData = filteredData.filter(c => clientIdsWithEvents.includes(c.id));
        } else if (filters.filter_logic === 'or' && filters.tag_ids.length > 0) {
          const existingIds = new Set(filteredData.map(c => c.id));
          const additionalClients = clientsWithTags.filter(c =>
            clientIdsWithEvents.includes(c.id) && !existingIds.has(c.id)
          );
          filteredData = [...filteredData, ...additionalClients];
        } else {
          filteredData = filteredData.filter(c => clientIdsWithEvents.includes(c.id));
        }
      }

      setClients(filteredData);
    } else {
      setClients([]);
    }
    } catch (err) {
      console.error('Error loading clients:', err);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelectClient(id: string) {
    setSelectedClients(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedClients.size === filteredClients.length) {
      setSelectedClients(new Set());
    } else {
      setSelectedClients(new Set(filteredClients.map(c => c.id)));
    }
  }

  async function bulkAssignManager(managerId: string) {
    if (selectedClients.size === 0) return;
    const ids = Array.from(selectedClients);

    await schemaWrite({ schema: teamSchema, table: 'clients', action: 'update', data: { manager_id: managerId }, filtersIn: { id: ids } });

    setSelectedClients(new Set());
    setShowAssignModal(false);
    loadClients();
  }

  async function bulkDeleteClients() {
    if (selectedClients.size === 0) return;
    if (!confirm(`Удалить ${selectedClients.size} контактов? Это действие нельзя отменить.`)) return;
    const ids = Array.from(selectedClients);

    await schemaWrite({ schema: teamSchema, table: 'deals', action: 'delete', filtersIn: { client_id: ids } });
    await schemaWrite({ schema: teamSchema, table: 'activities', action: 'delete', filtersIn: { client_id: ids } });
    await schemaWrite({ schema: teamSchema, table: 'clients', action: 'delete', filtersIn: { id: ids } });

    setSelectedClients(new Set());
    loadClients();
    loadReferenceData();
  }

  async function bulkAssignTags() {
    if (selectedClients.size === 0 || selectedTagsForBulk.size === 0) return;
    const clientIds = Array.from(selectedClients);
    const tagIds = Array.from(selectedTagsForBulk);
    const entries = clientIds.flatMap(clientId =>
      tagIds.map(tagId => ({ client_id: clientId, tag_id: tagId }))
    );

    await schemaWrite({ schema: teamSchema, table: 'client_tags', action: 'upsert', data: entries });

    setSelectedClients(new Set());
    setSelectedTagsForBulk(new Set());
    setShowTagModal(false);
    loadClients();
  }

  async function bulkRemoveTags() {
    if (selectedClients.size === 0 || selectedTagsForBulk.size === 0) return;
    const clientIds = Array.from(selectedClients);
    const tagIds = Array.from(selectedTagsForBulk);

    await schemaWrite({ schema: teamSchema, table: 'client_tags', action: 'delete', filtersIn: { client_id: clientIds, tag_id: tagIds } });

    setSelectedClients(new Set());
    setSelectedTagsForBulk(new Set());
    setShowTagModal(false);
    loadClients();
  }

  function resetFilters() {
    setFilters({
      client_type: 'all',
      status: '',
      city_id: '',
      manager_id: '',
      event_ids: [],
      tag_ids: [],
      last_activity_from: '',
      last_activity_to: '',
      sort_by: 'created_at',
      sort_order: 'desc',
      filter_logic: 'and',
    });
  }

  // Build managers map for quick lookup
  const managersMap = useMemo(() => {
    const map: Record<string, string> = {};
    managers.forEach(m => { map[m.id] = m.full_name; });
    return map;
  }, [managers]);

  const filteredClients = clients.filter((c) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      c.full_name?.toLowerCase().includes(searchLower) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(searchLower)
    );
  });

  const stats = totalStats;
  
  const hasActiveFilters = filters.status || filters.city_id || filters.manager_id || 
    filters.event_ids.length > 0 || filters.tag_ids.length > 0 || 
    filters.last_activity_from || filters.last_activity_to;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-2xl">🎭</Link>
              <h1 className="text-xl font-bold text-gray-900">
                Контакты
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Tooltip content="Создать контакт с полной формой" position="bottom">
                <Link
                  href="/clients/new"
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  + Добавить контакт
                </Link>
              </Tooltip>
              <Tooltip content="Вернуться на главную" position="bottom">
                <Link href="/" className="text-gray-600 hover:text-gray-900">
                  ← Назад
                </Link>
              </Tooltip>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Tooltip content="Показать все контакты" position="bottom">
            <button
              onClick={() => setFilters({ ...filters, client_type: 'all' })}
              className={`p-4 rounded-xl text-left transition-all w-full ${
                filters.client_type === 'all'
                  ? 'bg-gray-900 text-white shadow-lg'
                  : 'bg-white hover:shadow-md'
              }`}
            >
              <div className="text-2xl font-bold">{stats.all}</div>
              <div className="text-sm opacity-70">Всего</div>
            </button>
          </Tooltip>
          <Tooltip content="Фильтр: показать только лиды" position="bottom">
            <button
              onClick={() => setFilters({ ...filters, client_type: 'lead' })}
              className={`p-4 rounded-xl text-left transition-all w-full ${
                filters.client_type === 'lead'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-white hover:shadow-md'
              }`}
            >
              <div className="text-2xl font-bold">{stats.lead}</div>
              <div className="text-sm opacity-70">Лиды</div>
            </button>
          </Tooltip>
          <Tooltip content="Фильтр: потенциальные клиенты" position="bottom">
            <button
              onClick={() => setFilters({ ...filters, client_type: 'pk' })}
              className={`p-4 rounded-xl text-left transition-all w-full ${
                filters.client_type === 'pk'
                  ? 'bg-purple-500 text-white shadow-lg'
                  : 'bg-white hover:shadow-md'
              }`}
            >
              <div className="text-2xl font-bold">{stats.pk}</div>
              <div className="text-sm opacity-70">ПК</div>
            </button>
          </Tooltip>
          <Tooltip content="Фильтр: клиентская база" position="bottom">
            <button
              onClick={() => setFilters({ ...filters, client_type: 'kb' })}
              className={`p-4 rounded-xl text-left transition-all w-full ${
                filters.client_type === 'kb'
                  ? 'bg-green-500 text-white shadow-lg'
                  : 'bg-white hover:shadow-md'
              }`}
            >
              <div className="text-2xl font-bold">{stats.kb}</div>
              <div className="text-sm opacity-70">КБ</div>
            </button>
          </Tooltip>
        </div>

        {/* Search and Filter Toggle */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <Tooltip content="Поиск по ФИО, номеру телефона или e-mail" position="bottom">
              <input
                type="text"
                placeholder="Поиск по имени, телефону или email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none transition-all"
              />
            </Tooltip>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-2 ${
              showFilters || hasActiveFilters
                ? 'bg-red-50 border-red-200 text-red-600'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Фильтры
            {hasActiveFilters && (
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>
        </div>

        {/* Extended Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Расширенные фильтры</h3>
              <div className="flex items-center gap-4">
                {/* Filter Logic Toggle */}
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setFilters({ ...filters, filter_logic: 'and' })}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      filters.filter_logic === 'and' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    И
                  </button>
                  <button
                    onClick={() => setFilters({ ...filters, filter_logic: 'or' })}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      filters.filter_logic === 'or' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    ИЛИ
                  </button>
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="text-sm text-red-500 hover:text-red-600"
                  >
                    Сбросить все
                  </button>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-4 mb-4">
              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Статус</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:border-red-500 outline-none"
                >
                  <option value="">Все статусы</option>
                  <option value="new">Новый</option>
                  <option value="in_progress">В работе</option>
                  <option value="callback">Перезвонить</option>
                  <option value="interested">Интерес</option>
                  <option value="active">Активный</option>
                  <option value="vip">VIP</option>
                  <option value="inactive">Неактивный</option>
                </select>
              </div>
              
              {/* City */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Город</label>
                <select
                  value={filters.city_id}
                  onChange={(e) => setFilters({ ...filters, city_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:border-red-500 outline-none"
                >
                  <option value="">Все города</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>{city.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Manager */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Менеджер</label>
                <select
                  value={filters.manager_id}
                  onChange={(e) => setFilters({ ...filters, manager_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:border-red-500 outline-none"
                  disabled={!isAdmin}
                >
                  {isAdmin && <option value="">Все менеджеры</option>}
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
                {!isAdmin && (
                  <p className="text-xs text-gray-400 mt-1">Показаны только ваши контакты</p>
                )}
              </div>
              
              {/* Sort */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Сортировка</label>
                <div className="flex gap-1">
                  <select
                    value={filters.sort_by}
                    onChange={(e) => setFilters({ ...filters, sort_by: e.target.value as any })}
                    className="flex-1 px-3 py-2 border rounded-l-lg text-sm focus:border-red-500 outline-none"
                  >
                    <option value="created_at">Дата создания</option>
                    <option value="last_activity_at">Последняя активность</option>
                    <option value="last_contact_date">Последний звонок</option>
                    <option value="full_name">Имя</option>
                  </select>
                  <button
                    onClick={() => setFilters({ ...filters, sort_order: filters.sort_order === 'asc' ? 'desc' : 'asc' })}
                    className="px-3 py-2 border border-l-0 rounded-r-lg bg-gray-50 hover:bg-gray-100"
                  >
                    {filters.sort_order === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Last Activity Date Range */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Последняя активность</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={filters.last_activity_from}
                    onChange={(e) => setFilters({ ...filters, last_activity_from: e.target.value })}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm focus:border-red-500 outline-none"
                    placeholder="От"
                  />
                  <input
                    type="date"
                    value={filters.last_activity_to}
                    onChange={(e) => setFilters({ ...filters, last_activity_to: e.target.value })}
                    className="flex-1 px-3 py-2 border rounded-lg text-sm focus:border-red-500 outline-none"
                    placeholder="До"
                  />
                </div>
              </div>
              
              {/* Events multiselect */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Был на спектаклях</label>
                <select
                  multiple
                  value={filters.event_ids}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    setFilters({ ...filters, event_ids: selected });
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:border-red-500 outline-none h-20"
                >
                  {events.map((event) => {
                    const showData = Array.isArray(event.show) ? event.show[0] : event.show;
                    const cityData = Array.isArray(event.city) ? event.city[0] : event.city;
                    return (
                      <option key={event.id} value={event.id}>
                        {showData?.title} • {cityData?.name} • {new Date(event.event_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            
            {/* Tags */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Теги</label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      const newTagIds = filters.tag_ids.includes(tag.id)
                        ? filters.tag_ids.filter(id => id !== tag.id)
                        : [...filters.tag_ids, tag.id];
                      setFilters({ ...filters, tag_ids: newTagIds });
                    }}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                      filters.tag_ids.includes(tag.id)
                        ? 'ring-2 ring-offset-1'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{ 
                      backgroundColor: tag.color + '20', 
                      color: tag.color,
                      borderColor: tag.color
                    }}
                  >
                    {tag.name}
                  </button>
                ))}
                {tags.length === 0 && (
                  <span className="text-sm text-gray-400">Нет тегов</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500 mx-auto"></div>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {search ? 'Контакты не найдены' : 'Нет контактов'}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedClients.size === filteredClients.length && filteredClients.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-red-500 focus:ring-red-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Контакт
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Тип
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Город
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Источник
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Менеджер
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Покупки
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Сумма
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                                {filteredClients.map((client) => (
                  <tr
                    key={client.id}
                    className={`hover:bg-gray-50 cursor-pointer transition-colors ${selectedClients.has(client.id) ? 'bg-red-50' : ''}`}
                  >
                    <td className="px-2 py-4 w-10" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedClients.has(client.id)}
                        onChange={() => toggleSelectClient(client.id)}
                        className="rounded border-gray-300 text-red-500 focus:ring-red-500"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <Link href={`/clients/${client.id}`} className="block">
                        <div className="font-medium text-gray-900 hover:text-red-500">
                          {client.full_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {client.phone}
                        </div>
                        {/* Tags */}
                        {client.tags && client.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {client.tags.slice(0, 3).map((tag) => tag && (
                              <span
                                key={tag.id}
                                className="px-1.5 py-0.5 rounded text-xs"
                                style={{ backgroundColor: tag.color + '20', color: tag.color }}
                              >
                                {tag.name}
                              </span>
                            ))}
                            {client.tags.length > 3 && (
                              <span className="text-xs text-gray-400">+{client.tags.length - 3}</span>
                            )}
                          </div>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          clientTypeLabels[client.client_type]?.color || ''
                        }`}
                      >
                        {clientTypeLabels[client.client_type]?.label || client.client_type}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <div
                          className={`w-2 h-2 rounded-full mr-2 ${
                            statusLabels[client.status]?.color || 'bg-gray-400'
                          }`}
                        />
                        <span className="text-sm text-gray-600">
                          {statusLabels[client.status]?.label || client.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {(Array.isArray(client.city) ? client.city[0]?.name : client.city?.name) || '—'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {(Array.isArray(client.source) ? client.source[0]?.name : client.source?.name) || '—'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {client.manager_id ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                          {managersMap[client.manager_id] || '—'}
                        </span>
                      ) : (
                        <span className="text-gray-400">Не назначен</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {client.total_purchases || 0}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-green-600">
                      {(client.total_revenue || 0).toLocaleString('ru-RU')} ₽
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Bulk actions bar */}
      {selectedClients.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-4 z-50">
          <span className="text-sm font-medium">
            Выбрано: {selectedClients.size}
          </span>
          <button
            onClick={() => setShowAssignModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Назначить менеджера
          </button>
          <button
            onClick={() => { setSelectedTagsForBulk(new Set()); setShowTagModal(true); }}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Теги
          </button>
          <button
            onClick={bulkDeleteClients}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Удалить
          </button>
          <button
            onClick={() => setSelectedClients(new Set())}
            className="text-gray-400 hover:text-white px-3 py-2 text-sm transition-colors"
          >
            Отмена
          </button>
        </div>
      )}

      {/* Assign manager modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Назначить менеджера
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Выбрано контактов: {selectedClients.size}
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {managers.map((m) => (
                <button
                  key={m.id}
                  onClick={() => bulkAssignManager(m.id)}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-red-50 transition-colors border border-gray-200 hover:border-red-300"
                >
                  <div className="font-medium text-gray-900">{m.full_name}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAssignModal(false)}
              className="mt-4 w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border rounded-lg"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Bulk tag modal */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Управление тегами
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Выбрано контактов: {selectedClients.size}
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Выберите теги
              </label>
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 border rounded-xl bg-gray-50">
                {tags.length === 0 ? (
                  <p className="text-sm text-gray-400">Нет тегов. Создайте в настройках.</p>
                ) : (
                  tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        const newSet = new Set(selectedTagsForBulk);
                        if (newSet.has(tag.id)) {
                          newSet.delete(tag.id);
                        } else {
                          newSet.add(tag.id);
                        }
                        setSelectedTagsForBulk(newSet);
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        selectedTagsForBulk.has(tag.id)
                          ? 'ring-2 ring-offset-1 ring-gray-900'
                          : ''
                      }`}
                      style={{
                        backgroundColor: tag.color + '20',
                        color: tag.color,
                      }}
                    >
                      {selectedTagsForBulk.has(tag.id) && '✓ '}
                      {tag.name}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={bulkAssignTags}
                disabled={selectedTagsForBulk.size === 0}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Добавить теги
              </button>
              <button
                onClick={bulkRemoveTags}
                disabled={selectedTagsForBulk.size === 0}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Удалить теги
              </button>
            </div>
            
            <button
              onClick={() => setShowTagModal(false)}
              className="mt-3 w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border rounded-lg"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
