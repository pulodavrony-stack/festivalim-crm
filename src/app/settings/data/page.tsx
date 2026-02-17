'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createSchemaAdminClient, getPublicClient } from '@/lib/supabase-schema';
import { useTeam } from '@/components/providers/TeamProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/Toast';
import type { Team } from '@/types/team';

const EXPORT_TABLES = [
  { name: 'clients', label: 'Контакты' },
  { name: 'deals', label: 'Сделки' },
  { name: 'calls', label: 'Звонки' },
  { name: 'tasks', label: 'Задачи' },
  { name: 'messages', label: 'Сообщения' },
  { name: 'cities', label: 'Города' },
  { name: 'shows', label: 'Спектакли' },
  { name: 'events', label: 'События' },
  { name: 'companies', label: 'B2B Компании' },
  { name: 'contracts', label: 'B2B Контракты' },
];

export default function DataExportPage() {
  const { manager } = useAuth();
  const { team: currentTeam, allTeams, canSwitchTeams } = useTeam();
  const toast = useToast();
  
  const [selectedTeamId, setSelectedTeamId] = useState<string>(currentTeam?.id || '');
  const [selectedTables, setSelectedTables] = useState<string[]>(['clients', 'deals']);
  const [exporting, setExporting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Проверяем права доступа - admin и team_admin
  const isAdminRole = manager?.role === 'admin' || manager?.role === 'team_admin';
  if (!isAdminRole) {
    return (
      <div className="min-h-screen flex bg-gray-50">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="lg:hidden bg-white border-b h-16 flex items-center px-4">
            <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-gray-600 hover:text-gray-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="ml-4 font-bold text-gray-900 text-lg">Импорт/Экспорт данных</span>
          </header>
          <main className="flex-1 p-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
              <p className="text-yellow-800">Доступ запрещен. Только администраторы могут работать с данными.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }
  
  // team_admin видит только свою команду, super admin видит все
  const teams = canSwitchTeams ? allTeams : (currentTeam ? [currentTeam] : []);
  
  async function handleExport() {
    if (!selectedTeamId || selectedTables.length === 0) {
      toast.error('Выберите команду и таблицы для экспорта');
      return;
    }
    
    setExporting(true);
    
    try {
      const team = teams.find(t => t.id === selectedTeamId);
      if (!team) throw new Error('Команда не найдена');
      
      const schemaClient = createSchemaAdminClient(team.schema_name);
      const exportData: Record<string, any[]> = {};
      
      for (const tableName of selectedTables) {
        const { data, error } = await schemaClient
          .from(tableName)
          .select('*');
        
        if (error) {
          console.error(`Error exporting ${tableName}:`, error);
          continue;
        }
        
        exportData[tableName] = data || [];
      }
      
      // Создаем JSON файл
      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Скачиваем файл
      const a = document.createElement('a');
      a.href = url;
      a.download = `${team.slug}_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      const totalRecords = Object.values(exportData).reduce((sum, arr) => sum + arr.length, 0);
      toast.success(`Экспортировано ${totalRecords} записей`);
      
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Ошибка при экспорте данных');
    } finally {
      setExporting(false);
    }
  }
  
  function toggleTable(tableName: string) {
    setSelectedTables(prev => 
      prev.includes(tableName)
        ? prev.filter(t => t !== tableName)
        : [...prev, tableName]
    );
  }
  
  function selectAllTables() {
    setSelectedTables(EXPORT_TABLES.map(t => t.name));
  }
  
  function deselectAllTables() {
    setSelectedTables([]);
  }
  
  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b h-16 flex items-center px-4">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-gray-600 hover:text-gray-900">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="ml-4 font-bold text-gray-900 text-lg">Импорт/Экспорт</span>
        </header>
        
        <main className="flex-1 overflow-auto p-6">
          {/* Header */}
          <div className="mb-6">
            <Link href="/settings/teams" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Назад к командам
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Импорт / Экспорт данных</h1>
            <p className="text-gray-500 mt-1">Выгрузка данных из системы по командам</p>
          </div>
          
          <div className="max-w-2xl space-y-6">
            {/* Team Selection */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-xl">🏢</span>
                Выберите команду
              </h3>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="">-- Выберите команду --</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.schema_name})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Table Selection */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-xl">📊</span>
                  Выберите таблицы
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllTables}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Выбрать все
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={deselectAllTables}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Снять все
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {EXPORT_TABLES.map((table) => (
                  <label
                    key={table.name}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedTables.includes(table.name)
                        ? 'bg-red-50 border-2 border-red-500'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTables.includes(table.name)}
                      onChange={() => toggleTable(table.name)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${
                      selectedTables.includes(table.name)
                        ? 'bg-red-500 text-white'
                        : 'bg-white border'
                    }`}>
                      {selectedTables.includes(table.name) && (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <span className="font-medium text-gray-700">{table.label}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Export Button */}
            <button
              onClick={handleExport}
              disabled={exporting || !selectedTeamId || selectedTables.length === 0}
              className="w-full px-6 py-4 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {exporting ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Экспорт...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Скачать JSON ({selectedTables.length} таблиц)
                </>
              )}
            </button>
            
            {/* Info */}
            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
              <p><strong>Примечание:</strong> Данные экспортируются в формате JSON. Для импорта в другую команду или восстановления данных обратитесь к администратору системы.</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
