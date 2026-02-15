'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import SalesTargetWidget from '@/components/dashboard/SalesTargetWidget';
import Sidebar from '@/components/layout/Sidebar';

interface Stats {
  leads: number;
  pk: number;
  kb: number;
  deals_active: number;
  today_calls: number;
  week_revenue: number;
  tasks_today: number;
  tasks_overdue: number;
  unread_messages: number;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<Stats>({
    leads: 0,
    pk: 0,
    kb: 0,
    deals_active: 0,
    today_calls: 0,
    week_revenue: 0,
    tasks_today: 0,
    tasks_overdue: 0,
    unread_messages: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [clientsResult, dealsResult, callsResult, todayTasksResult, overdueTasksResult] = await Promise.all([
        supabase.from('clients').select('client_type'),
        supabase.from('deals').select('status, amount').gte('created_at', weekAgo),
        supabase.from('calls').select('id').gte('started_at', today),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('due_date', today).neq('status', 'completed'),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).lt('due_date', today).neq('status', 'completed'),
      ]);

      if (clientsResult.data) {
        const clients = clientsResult.data;
        setStats((prev) => ({
          ...prev,
          leads: clients.filter((c) => c.client_type === 'lead').length,
          pk: clients.filter((c) => c.client_type === 'pk').length,
          kb: clients.filter((c) => c.client_type === 'kb').length,
        }));
      }

      if (dealsResult.data) {
        const wonDeals = dealsResult.data.filter((d) => d.status === 'won');
        setStats((prev) => ({
          ...prev,
          deals_active: dealsResult.data?.filter((d) => d.status === 'active').length || 0,
          week_revenue: wonDeals.reduce((sum, d) => sum + (d.amount || 0), 0),
        }));
      }

      if (callsResult.data) {
        setStats((prev) => ({
          ...prev,
          today_calls: callsResult.data?.length || 0,
        }));
      }

      setStats((prev) => ({
        ...prev,
        tasks_today: todayTasksResult.count || 0,
        tasks_overdue: overdueTasksResult.count || 0,
      }));
    } catch (error) {
      console.error('Error loading stats:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b h-16 flex items-center px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="ml-4 font-bold text-gray-900 text-lg">Фестивалим CRM</span>
          {user && (
            <button
              onClick={() => signOut()}
              className="ml-auto text-gray-500 hover:text-red-500 p-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          )}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6 lg:p-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Клиенты по типам */}
          <div className="bg-white rounded-xl shadow-sm p-6 border">
            <h3 className="text-sm font-medium text-gray-500 mb-4">
              Клиентская база
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.leads}</div>
                <div className="text-xs text-gray-500 mt-1">Лиды</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.pk}</div>
                <div className="text-xs text-gray-500 mt-1">ПК</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.kb}</div>
                <div className="text-xs text-gray-500 mt-1">КБ</div>
              </div>
            </div>
          </div>

          {/* Активные сделки */}
          <div className="bg-white rounded-xl shadow-sm p-6 border">
            <h3 className="text-sm font-medium text-gray-500 mb-4">
              Активные сделки
            </h3>
            <div className="flex items-center">
              <div className="text-4xl font-bold text-gray-900">
                {stats.deals_active}
              </div>
              <Link 
                href="/pipeline" 
                className="ml-auto text-sm text-red-500 hover:text-red-600 font-medium"
              >
                Открыть воронку →
              </Link>
            </div>
          </div>

          {/* Звонки сегодня */}
          <div className="bg-white rounded-xl shadow-sm p-6 border">
            <h3 className="text-sm font-medium text-gray-500 mb-4">
              Звонков сегодня
            </h3>
            <div className="flex items-center">
              <div className="text-4xl font-bold text-gray-900">
                {stats.today_calls}
              </div>
              <div className="ml-4 text-sm text-gray-500">
                <span className="text-green-500">↑ 12%</span> vs вчера
              </div>
            </div>
          </div>
        </div>

        {/* Касса недели */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-80 mb-1">
                Касса за неделю
              </h3>
              <div className="text-4xl font-bold">
                {stats.week_revenue.toLocaleString('ru-RU')} ₽
              </div>
            </div>
            <div className="text-6xl opacity-20">💰</div>
          </div>
        </div>

        {/* Sales Target Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <SalesTargetWidget />
          
          {/* Settings shortcuts */}
          <div className="bg-white rounded-xl shadow-sm p-6 border">
            <h3 className="text-sm font-medium text-gray-500 mb-4">Настройки</h3>
            <div className="space-y-3">
              <Link
                href="/settings/routing"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🎯</span>
                  <div>
                    <div className="font-medium text-gray-900">Распределение лидов</div>
                    <div className="text-sm text-gray-500">Настроить маршрутизацию</div>
                  </div>
                </div>
                <span className="text-gray-400">→</span>
              </Link>
              <Link
                href="/settings/duplicates"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔄</span>
                  <div>
                    <div className="font-medium text-gray-900">Дубликаты</div>
                    <div className="text-sm text-gray-500">Объединить одинаковые контакты</div>
                  </div>
                </div>
                <span className="text-gray-400">→</span>
              </Link>
              <Link
                href="/settings/transfer"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">👥</span>
                  <div>
                    <div className="font-medium text-gray-900">Перевалка контактов</div>
                    <div className="text-sm text-gray-500">Передать между менеджерами</div>
                  </div>
                </div>
                <span className="text-gray-400">→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link 
            href="/clients/new"
            className="bg-white rounded-xl shadow-sm p-6 border hover:shadow-md transition-shadow flex items-center space-x-4"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">
              ➕
            </div>
            <div>
              <div className="font-medium text-gray-900">Новый клиент</div>
              <div className="text-sm text-gray-500">Добавить вручную</div>
            </div>
          </Link>

          <Link 
            href="/tasks"
            className="bg-white rounded-xl shadow-sm p-6 border hover:shadow-md transition-shadow flex items-center space-x-4"
          >
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
              stats.tasks_overdue > 0 ? 'bg-red-100' : 'bg-yellow-100'
            }`}>
              📋
            </div>
            <div>
              <div className="font-medium text-gray-900">Задачи</div>
              <div className="text-sm text-gray-500">
                {stats.tasks_today} на сегодня
                {stats.tasks_overdue > 0 && (
                  <span className="text-red-500 ml-1">({stats.tasks_overdue} просрочено)</span>
                )}
              </div>
            </div>
          </Link>

          <Link 
            href="/messages"
            className="bg-white rounded-xl shadow-sm p-6 border hover:shadow-md transition-shadow flex items-center space-x-4"
          >
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">
              💬
            </div>
            <div>
              <div className="font-medium text-gray-900">Сообщения</div>
              <div className="text-sm text-gray-500">WhatsApp, Telegram</div>
            </div>
          </Link>

          <Link 
            href="/events"
            className="bg-white rounded-xl shadow-sm p-6 border hover:shadow-md transition-shadow flex items-center space-x-4"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">
              🎭
            </div>
            <div>
              <div className="font-medium text-gray-900">События</div>
              <div className="text-sm text-gray-500">Спектакли</div>
            </div>
          </Link>
        </div>
        </main>
      </div>
    </div>
  );
}
