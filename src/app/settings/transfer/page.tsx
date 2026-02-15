'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Manager {
  id: string;
  full_name: string;
  clients_count?: number;
  clients_with_tasks?: number;
  clients_without_tasks?: number;
}

export default function TransferContactsPage() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  
  // Transfer settings
  const [fromManagerId, setFromManagerId] = useState('');
  const [toManagerId, setToManagerId] = useState('');
  const [transferMode, setTransferMode] = useState<'all' | 'without_tasks'>('all');
  const [clientType, setClientType] = useState<'all' | 'lead' | 'pk' | 'kb'>('all');
  
  // Preview
  const [previewCount, setPreviewCount] = useState(0);

  useEffect(() => {
    loadManagers();
  }, []);

  useEffect(() => {
    if (fromManagerId) {
      loadPreview();
    } else {
      setPreviewCount(0);
    }
  }, [fromManagerId, transferMode, clientType]);

  async function loadManagers() {
    setLoading(true);
    
    const { data: managersData } = await supabase
      .from('managers')
      .select('id, full_name')
      .eq('is_active', true)
      .order('full_name');
    
    if (managersData) {
      // Get client counts for each manager
      const managersWithCounts = await Promise.all(
        managersData.map(async (manager) => {
          const [allClientsRes, tasksRes] = await Promise.all([
            supabase
              .from('clients')
              .select('id', { count: 'exact', head: true })
              .eq('manager_id', manager.id),
            supabase
              .from('clients')
              .select('id')
              .eq('manager_id', manager.id)
              .in('id', 
                supabase.from('tasks').select('client_id').eq('is_completed', false)
              ),
          ]);
          
          const clientsCount = allClientsRes.count || 0;
          
          // Count clients with active tasks
          const { count: withTasks } = await supabase
            .from('clients')
            .select('id', { count: 'exact', head: true })
            .eq('manager_id', manager.id)
            .in('id', 
              (await supabase.from('tasks').select('client_id').eq('is_completed', false)).data?.map(t => t.client_id) || []
            );
          
          return {
            ...manager,
            clients_count: clientsCount,
            clients_with_tasks: withTasks || 0,
            clients_without_tasks: clientsCount - (withTasks || 0),
          };
        })
      );
      
      setManagers(managersWithCounts);
    }
    
    setLoading(false);
  }

  async function loadPreview() {
    let query = supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('manager_id', fromManagerId);
    
    if (clientType !== 'all') {
      query = query.eq('client_type', clientType);
    }
    
    if (transferMode === 'without_tasks') {
      // Get clients without active tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('client_id')
        .eq('is_completed', false);
      
      const clientsWithTasks = [...new Set(tasksData?.map(t => t.client_id) || [])];
      
      if (clientsWithTasks.length > 0) {
        query = query.not('id', 'in', `(${clientsWithTasks.join(',')})`);
      }
    }
    
    const { count } = await query;
    setPreviewCount(count || 0);
  }

  async function handleTransfer() {
    if (!fromManagerId || !toManagerId) {
      alert('Выберите менеджеров');
      return;
    }
    
    if (fromManagerId === toManagerId) {
      alert('Нельзя передать контакты самому себе');
      return;
    }
    
    if (!confirm(`Передать ${previewCount} контактов? Это действие нельзя отменить.`)) {
      return;
    }
    
    setTransferring(true);
    
    try {
      // Build query for clients to transfer
      let query = supabase
        .from('clients')
        .select('id')
        .eq('manager_id', fromManagerId);
      
      if (clientType !== 'all') {
        query = query.eq('client_type', clientType);
      }
      
      const { data: clientsToTransfer } = await query;
      
      if (!clientsToTransfer || clientsToTransfer.length === 0) {
        alert('Нет контактов для передачи');
        setTransferring(false);
        return;
      }
      
      let clientIds = clientsToTransfer.map(c => c.id);
      
      // If without_tasks mode, filter out clients with active tasks
      if (transferMode === 'without_tasks') {
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('client_id')
          .eq('is_completed', false)
          .in('client_id', clientIds);
        
        const clientsWithTasks = new Set(tasksData?.map(t => t.client_id) || []);
        clientIds = clientIds.filter(id => !clientsWithTasks.has(id));
      }
      
      if (clientIds.length === 0) {
        alert('Нет контактов для передачи после применения фильтров');
        setTransferring(false);
        return;
      }
      
      // Update clients
      const { error } = await supabase
        .from('clients')
        .update({ manager_id: toManagerId })
        .in('id', clientIds);
      
      if (error) throw error;
      
      // Log activity for each client
      const activities = clientIds.map(clientId => ({
        client_id: clientId,
        activity_type: 'manager_assigned',
        content: `Контакт передан от ${managers.find(m => m.id === fromManagerId)?.full_name} к ${managers.find(m => m.id === toManagerId)?.full_name}`,
      }));
      
      await supabase.from('activities').insert(activities);
      
      alert(`Успешно передано ${clientIds.length} контактов`);
      
      // Reload managers
      loadManagers();
      setFromManagerId('');
      setToManagerId('');
      setPreviewCount(0);
    } catch (error: any) {
      alert('Ошибка: ' + error.message);
    }
    
    setTransferring(false);
  }

  const fromManager = managers.find(m => m.id === fromManagerId);
  const toManager = managers.find(m => m.id === toManagerId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-2xl">🎭</Link>
              <h1 className="text-xl font-bold text-gray-900">Перевалка контактов</h1>
            </div>
            <Link href="/" className="text-gray-600 hover:text-gray-900">← Назад</Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Manager stats */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Распределение контактов</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {managers.map((manager) => (
                  <div key={manager.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-900">{manager.full_name}</div>
                    <div className="text-2xl font-bold text-gray-900">{manager.clients_count}</div>
                    <div className="text-xs text-gray-500">
                      С задачами: {manager.clients_with_tasks} / Без: {manager.clients_without_tasks}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transfer form */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Передать контакты</h3>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">От кого</label>
                  <select
                    value={fromManagerId}
                    onChange={(e) => setFromManagerId(e.target.value)}
                    className="w-full px-4 py-3 border rounded-lg focus:border-red-500 outline-none"
                  >
                    <option value="">Выберите менеджера...</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.clients_count} контактов)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Кому</label>
                  <select
                    value={toManagerId}
                    onChange={(e) => setToManagerId(e.target.value)}
                    className="w-full px-4 py-3 border rounded-lg focus:border-red-500 outline-none"
                    disabled={!fromManagerId}
                  >
                    <option value="">Выберите менеджера...</option>
                    {managers.filter(m => m.id !== fromManagerId).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.clients_count} контактов)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Какие контакты</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="transferMode"
                        checked={transferMode === 'all'}
                        onChange={() => setTransferMode('all')}
                        className="text-red-500"
                      />
                      <span>Все контакты</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="transferMode"
                        checked={transferMode === 'without_tasks'}
                        onChange={() => setTransferMode('without_tasks')}
                        className="text-red-500"
                      />
                      <span>Только без активных задач</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Тип клиента</label>
                  <select
                    value={clientType}
                    onChange={(e) => setClientType(e.target.value as any)}
                    className="w-full px-4 py-3 border rounded-lg focus:border-red-500 outline-none"
                  >
                    <option value="all">Все типы</option>
                    <option value="lead">Только лиды</option>
                    <option value="pk">Только ПК</option>
                    <option value="kb">Только КБ</option>
                  </select>
                </div>
              </div>
              
              {/* Preview */}
              {fromManagerId && (
                <div className={`p-4 rounded-lg mb-6 ${previewCount > 0 ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-gray-600">Будет передано:</span>
                      <span className="ml-2 text-2xl font-bold text-gray-900">{previewCount}</span>
                      <span className="ml-1 text-gray-600">контактов</span>
                    </div>
                    {fromManager && toManager && previewCount > 0 && (
                      <div className="text-sm text-gray-500">
                        {fromManager.full_name} → {toManager.full_name}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <button
                onClick={handleTransfer}
                disabled={transferring || !fromManagerId || !toManagerId || previewCount === 0}
                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {transferring ? 'Передача...' : `Передать ${previewCount} контактов`}
              </button>
            </div>

            {/* Info */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <h4 className="font-medium text-amber-800 mb-1">Внимание</h4>
              <p className="text-sm text-amber-700">
                Перевалка контактов изменяет менеджера у выбранных клиентов. 
                Все сделки и задачи остаются привязаны к клиентам и будут видны новому менеджеру.
                История изменений сохраняется в активности клиента.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
