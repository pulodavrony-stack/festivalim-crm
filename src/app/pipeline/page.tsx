'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { supabase } from '@/lib/supabase';
import { PipelineColumn } from '@/components/pipeline/PipelineColumn';
import { DealCard } from '@/components/pipeline/DealCard';
import ClientQuickView from '@/components/clients/ClientQuickView';
import CreateDealModal from '@/components/deals/CreateDealModal';
import MoveDealModal from '@/components/pipeline/MoveDealModal';
import MessengerPanel from '@/components/messaging/MessengerPanel';
import { useToast } from '@/components/ui/Toast';

interface Stage {
  id: string;
  name: string;
  code: string;
  color: string;
  sort_order: number;
}

interface Deal {
  id: string;
  title: string;
  amount: number;
  stage_id: string;
  client?: {
    id: string;
    full_name: string;
    phone: string;
    client_type: string;
  };
  event?: {
    id: string;
    event_date: string;
    show?: {
      id: string;
      title: string;
    };
  };
  manager_id?: string;
  created_at: string;
}

interface Pipeline {
  id: string;
  name: string;
  code: string;
}

interface Manager {
  id: string;
  full_name: string;
}

interface Show {
  id: string;
  title: string;
}

interface Filters {
  manager_id: string;
  show_id: string;
  date_from: string;
  date_to: string;
  search: string;
}

export default function PipelinePage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [activePipeline, setActivePipeline] = useState<string>('');
  const [stages, setStages] = useState<Stage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [quickViewClientId, setQuickViewClientId] = useState<string | null>(null);
  const [isCreateDealOpen, setIsCreateDealOpen] = useState(false);
  const [messengerData, setMessengerData] = useState<{ phone?: string; telegram?: string } | null>(null);
  const [moveDealId, setMoveDealId] = useState<string | null>(null);
  const toast = useToast();
  
  // Сохраняем оригинальный stage_id для отката
  const originalStageRef = useRef<string | null>(null);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [shows, setShows] = useState<Show[]>([]);
  const [filters, setFilters] = useState<Filters>({
    manager_id: '',
    show_id: '',
    date_from: '',
    date_to: '',
    search: '',
  });

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    })
  );

  useEffect(() => {
    loadPipelines();
    loadFilterData();
  }, []);

  useEffect(() => {
    if (activePipeline) {
      loadStagesAndDeals();
    }
  }, [activePipeline]);

  async function loadFilterData() {
    const [managersResult, showsResult] = await Promise.all([
      supabase.from('managers').select('id, full_name').eq('is_active', true).order('full_name'),
      supabase.from('shows').select('id, title').eq('is_active', true).order('title'),
    ]);
    if (managersResult.data) setManagers(managersResult.data);
    if (showsResult.data) setShows(showsResult.data);
  }

  async function loadPipelines() {
    const { data } = await supabase
      .from('pipelines')
      .select('*')
      .lt('sort_order', 10) // Только активные воронки (sort_order < 10)
      .order('sort_order');
    
    if (data && data.length > 0) {
      setPipelines(data);
      // Выбираем воронку по умолчанию или первую
      const defaultPipeline = data.find(p => p.is_default) || data[0];
      setActivePipeline(defaultPipeline.id);
    }
    setLoading(false);
  }

  async function loadStagesAndDeals() {
    const [stagesResult, dealsResult] = await Promise.all([
      supabase
        .from('pipeline_stages')
        .select('*')
        .eq('pipeline_id', activePipeline)
        .order('sort_order'),
      supabase
        .from('deals')
        .select(`
          *,
          client:clients(id, full_name, phone, client_type),
          event:events(id, event_date, show:shows(id, title))
        `)
        .eq('pipeline_id', activePipeline)
        .in('status', ['active', 'won', 'lost'])
        .order('created_at', { ascending: false }),
    ]);

    if (stagesResult.data) setStages(stagesResult.data);
    if (dealsResult.data) setDeals(dealsResult.data);
  }

  // Filter deals
  const filteredDeals = deals.filter((deal: any) => {
    if (filters.manager_id && deal.manager_id !== filters.manager_id) return false;
    if (filters.show_id && deal.event?.show?.id !== filters.show_id) return false;
    
    if (filters.date_from && deal.event?.event_date) {
      if (new Date(deal.event.event_date) < new Date(filters.date_from)) return false;
    }
    if (filters.date_to && deal.event?.event_date) {
      const toDate = new Date(filters.date_to);
      toDate.setHours(23, 59, 59, 999);
      if (new Date(deal.event.event_date) > toDate) return false;
    }
    
    if (filters.search) {
      const s = filters.search.toLowerCase();
      const clientName = deal.client?.full_name?.toLowerCase() || '';
      const clientPhone = deal.client?.phone || '';
      const dealTitle = deal.title?.toLowerCase() || '';
      const showTitle = deal.event?.show?.title?.toLowerCase() || '';
      if (!clientName.includes(s) && !clientPhone.includes(filters.search) &&
          !dealTitle.includes(s) && !showTitle.includes(s)) return false;
    }
    return true;
  });

  const hasActiveFilters = filters.manager_id || filters.show_id || 
    filters.date_from || filters.date_to || filters.search;

  function clearFilters() {
    setFilters({ manager_id: '', show_id: '', date_from: '', date_to: '', search: '' });
  }

  function handleDragStart(event: DragStartEvent) {
    const dealId = event.active.id as string;
    setActiveId(dealId);
    // Запоминаем исходную колонку
    const deal = deals.find((d) => d.id === dealId);
    if (deal) {
      originalStageRef.current = deal.stage_id;
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const draggedDealId = active.id as string;
    
    setActiveId(null);

    console.log('[DnD] handleDragEnd', { 
      activeId: active.id, 
      overId: over?.id, 
      overType: over ? 'found' : 'null' 
    });

    if (!over) {
      console.log('[DnD] No over target — dropped in empty space');
      originalStageRef.current = null;
      return;
    }

    const overId = over.id as string;
    const originalStageId = originalStageRef.current;
    originalStageRef.current = null;

    // over может быть колонкой (stage ID) — проверяем
    let targetStageId: string | null = null;
    
    const targetStage = stages.find((s) => s.id === overId);
    if (targetStage) {
      targetStageId = targetStage.id;
      console.log('[DnD] Dropped on stage:', targetStage.name);
    } else {
      // over может быть другой карточкой — находим её колонку
      const overDeal = deals.find((d) => d.id === overId);
      if (overDeal) {
        targetStageId = overDeal.stage_id;
        console.log('[DnD] Dropped on deal in stage:', targetStageId);
      }
    }

    if (!targetStageId) {
      console.log('[DnD] Could not determine target stage for overId:', overId);
      return;
    }

    const deal = deals.find((d) => d.id === draggedDealId);
    if (!deal) {
      console.log('[DnD] Deal not found:', draggedDealId);
      return;
    }

    console.log('[DnD] Moving deal from stage', deal.stage_id, 'to', targetStageId);

    // Если бросили в ту же колонку — ничего не делаем
    if (deal.stage_id === targetStageId) {
      console.log('[DnD] Same stage, skipping');
      return;
    }

    // Оптимистичное обновление UI
    setDeals((prev) =>
      prev.map((d) => d.id === draggedDealId ? { ...d, stage_id: targetStageId! } : d)
    );

    // Сохраняем в БД
    console.log('[DnD] Saving to Supabase...');
    const { error, data } = await supabase
      .from('deals')
      .update({ stage_id: targetStageId })
      .eq('id', draggedDealId)
      .select();

    if (error) {
      console.error('[DnD] Supabase error:', error);
      toast.error('Ошибка перемещения сделки');
      // Откат
      if (originalStageId) {
        setDeals((prev) =>
          prev.map((d) => d.id === draggedDealId ? { ...d, stage_id: originalStageId } : d)
        );
      } else {
        loadStagesAndDeals();
      }
    } else {
      console.log('[DnD] Saved successfully:', data);
      const targetStageName = stages.find(s => s.id === targetStageId)?.name || '';
      toast.success(`Сделка перемещена в "${targetStageName}"`);
    }
  }

  function getDealsForStage(stageId: string) {
    return filteredDeals.filter((d) => d.stage_id === stageId);
  }

  function getActiveDeal() {
    return deals.find((d) => d.id === activeId) || null;
  }

  const totalDeals = filteredDeals.length;
  const totalAmount = filteredDeals.reduce((sum, d) => sum + (d.amount || 0), 0);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-red-500 border-t-transparent mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">Загрузка воронки...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b flex-shrink-0">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl hover:scale-110 transition-transform">🎭</Link>
            <h1 className="text-lg font-bold text-gray-900 hidden sm:block">Воронка</h1>
            
            {/* Pipeline tabs */}
            <div className="flex items-center gap-1 ml-2 overflow-x-auto no-scrollbar">
              {pipelines.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActivePipeline(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    activePipeline === p.id
                      ? 'bg-red-500 text-white shadow-sm'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-3 text-xs text-gray-500 mr-2">
              <span>{totalDeals} сделок</span>
              <span className="font-semibold text-green-600">
                {totalAmount.toLocaleString('ru-RU')} ₽
              </span>
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg text-sm transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              title="Фильтры"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
            <button
              onClick={() => setIsCreateDealOpen(true)}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm"
            >
              + Сделка
            </button>
            <Link href="/" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white border-b flex-shrink-0 px-4 py-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]">
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Поиск: клиент, телефон..."
                className="w-full px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <select
              value={filters.manager_id}
              onChange={(e) => setFilters({ ...filters, manager_id: e.target.value })}
              className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-red-500"
            >
              <option value="">Все менеджеры</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.full_name}</option>
              ))}
            </select>
            <select
              value={filters.show_id}
              onChange={(e) => setFilters({ ...filters, show_id: e.target.value })}
              className="px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-red-500"
            >
              <option value="">Все спектакли</option>
              {shows.map((s) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              className="px-3 py-1.5 border rounded-lg text-sm"
            />
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              className="px-3 py-1.5 border rounded-lg text-sm"
            />
            {hasActiveFilters && (
              <button onClick={clearFilters} className="px-3 py-1.5 text-xs text-gray-500 hover:text-red-500">
                Сбросить
              </button>
            )}
          </div>
          {hasActiveFilters && (
            <div className="mt-2 text-xs text-gray-500">
              Найдено: <span className="font-semibold text-gray-900">{filteredDeals.length}</span> из {deals.length}
            </div>
          )}
        </div>
      )}

      {/* Pipeline Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 h-full min-w-max">
            {stages.map((stage) => (
              <PipelineColumn
                key={stage.id}
                stage={stage}
                deals={getDealsForStage(stage.id)}
                activeId={activeId}
                onClientClick={(clientId) => setQuickViewClientId(clientId)}
                onMoveToPipeline={(dealId) => setMoveDealId(dealId)}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeId && getActiveDeal() ? (
              <DealCard deal={getActiveDeal()!} isOverlay />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Empty state */}
      {stages.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-5xl mb-3">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Нет этапов</h3>
            <p className="text-sm text-gray-500">Воронка пока пустая</p>
          </div>
        </div>
      )}

      {/* Side Panels */}
      <ClientQuickView
        clientId={quickViewClientId || ''}
        isOpen={!!quickViewClientId}
        onClose={() => setQuickViewClientId(null)}
        position="left"
        onOpenMessenger={(phone, telegram) => setMessengerData({ phone, telegram })}
      />
      <MessengerPanel
        clientPhone={messengerData?.phone}
        clientTelegram={messengerData?.telegram}
        isOpen={!!messengerData}
        onClose={() => setMessengerData(null)}
      />
      <CreateDealModal
        isOpen={isCreateDealOpen}
        onClose={() => setIsCreateDealOpen(false)}
        onCreated={() => {
          loadStagesAndDeals();
          setIsCreateDealOpen(false);
          toast.success('Сделка создана');
        }}
        pipelineId={activePipeline}
      />
      <MoveDealModal
        isOpen={!!moveDealId}
        dealId={moveDealId || ''}
        currentPipelineId={activePipeline}
        onClose={() => setMoveDealId(null)}
        onMoved={() => {
          loadStagesAndDeals();
          toast.success('Сделка перемещена в другую воронку');
        }}
      />
    </div>
  );
}
