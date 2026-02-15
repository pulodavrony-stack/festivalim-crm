'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/Toast';

interface ManagerRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  has_b2c_access: boolean;
  has_b2b_access: boolean;
}

const roleLabels: Record<string, string> = {
  admin: 'Администратор',
  rop: 'РОП',
  manager: 'Менеджер',
  marketer: 'Маркетолог',
};

export default function ManagersAccessPage() {
  const [managers, setManagers] = useState<ManagerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadManagers();
  }, []);

  async function loadManagers() {
    try {
      const { data, error } = await supabase
        .from('managers')
        .select('id, full_name, email, role, is_active, has_b2c_access, has_b2b_access')
        .order('full_name');

      if (error) throw error;
      setManagers(data || []);
    } catch (error) {
      console.error('Error loading managers:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateAccess(managerId: string, field: 'has_b2c_access' | 'has_b2b_access', value: boolean) {
    setSaving(managerId);
    try {
      const { error } = await supabase
        .from('managers')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', managerId);

      if (error) throw error;

      setManagers(prev => prev.map(m =>
        m.id === managerId ? { ...m, [field]: value } : m
      ));
      toast.success('Права обновлены');
    } catch (error) {
      console.error('Error updating access:', error);
      toast.error('Ошибка при обновлении прав');
    } finally {
      setSaving(null);
    }
  }

  const shell = (content: React.ReactNode) => (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden bg-white border-b h-16 flex items-center px-4">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <span className="ml-4 font-bold text-gray-900 text-lg">Права доступа</span>
        </header>
        <main className="flex-1 overflow-auto">{content}</main>
      </div>
    </div>
  );

  if (loading) {
    return shell(
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return shell(
    <div className="p-6 max-w-4xl mx-auto">
      <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">&larr; Главная</Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Права доступа менеджеров</h1>
        <p className="text-sm text-gray-500 mt-1">
          Настройте доступ к B2C (клиенты) и B2B (компании) для каждого менеджера.
          Администраторы и РОП всегда видят всё.
        </p>
      </div>

      <div className="space-y-4">
        {managers.map((manager) => {
          const isAdmin = manager.role === 'admin' || manager.role === 'rop';

          return (
            <div key={manager.id} className={`bg-white rounded-2xl shadow-sm border p-5 ${!manager.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{manager.full_name}</h3>
                  <p className="text-sm text-gray-500">{roleLabels[manager.role] || manager.role} &middot; {manager.email}</p>
                  {!manager.is_active && (
                    <span className="inline-block mt-1 px-2.5 py-0.5 text-xs bg-red-100 text-red-700 rounded-md font-medium">
                      Неактивен
                    </span>
                  )}
                </div>
                {isAdmin && (
                  <span className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-lg font-medium">
                    Полный доступ
                  </span>
                )}
              </div>

              {!isAdmin && (
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={manager.has_b2c_access}
                      onChange={(e) => updateAccess(manager.id, 'has_b2c_access', e.target.checked)}
                      disabled={saving === manager.id}
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">B2C (клиенты)</div>
                      <div className="text-sm text-gray-500">Доступ к клиентам, B2C сделкам, воронкам лидов/ПК/КБ</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={manager.has_b2b_access}
                      onChange={(e) => updateAccess(manager.id, 'has_b2b_access', e.target.checked)}
                      disabled={saving === manager.id}
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">B2B (компании)</div>
                      <div className="text-sm text-gray-500">Доступ к компаниям, договорам, B2B сделкам, B2B воронке</div>
                    </div>
                  </label>

                  {!manager.has_b2c_access && !manager.has_b2b_access && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                      <p className="text-sm text-yellow-800">
                        У менеджера нет доступа ни к B2C, ни к B2B. Включите хотя бы один тип.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {saving === manager.id && (
                <div className="mt-2 text-sm text-blue-600">Сохранение...</div>
              )}
            </div>
          );
        })}
      </div>

      {managers.length === 0 && (
        <div className="text-center py-20 text-gray-400">Менеджеры не найдены</div>
      )}
    </div>
  );
}

