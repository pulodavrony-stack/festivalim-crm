'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { useTeam } from '@/components/providers/TeamProvider';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/Toast';
import { Manager, ManagerRole } from '@/types';

interface ManagerWithTeam extends Manager {
  teams?: { name: string } | null;
}

const roleLabels: Record<ManagerRole, string> = {
  admin: 'Супер-админ',
  team_admin: 'Админ команды',
  rop: 'РОП',
  manager: 'Менеджер',
  marketer: 'Маркетолог',
};

const roleColors: Record<ManagerRole, string> = {
  admin: 'bg-purple-100 text-purple-700',
  team_admin: 'bg-blue-100 text-blue-700',
  rop: 'bg-orange-100 text-orange-700',
  manager: 'bg-green-100 text-green-700',
  marketer: 'bg-pink-100 text-pink-700',
};

export default function ManagersPage() {
  const { user } = useAuth();
  const { team } = useTeam();
  const toast = useToast();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [managers, setManagers] = useState<ManagerWithTeam[]>([]);
  const [currentManager, setCurrentManager] = useState<Manager | null>(null);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingManager, setEditingManager] = useState<ManagerWithTeam | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    role: 'manager' as ManagerRole,
    is_active: true,
    has_b2c_access: true,
    has_b2b_access: false,
  });

  const loadCurrentManager = useCallback(async () => {
    if (!user) return null;
    const { data } = await supabase
      .from('managers')
      .select('*')
      .eq('auth_user_id', user.id)
      .single();
    return data;
  }, [user]);

  const loadManagers = useCallback(async (currentMgr: Manager) => {
    try {
      let query = supabase
        .from('managers')
        .select(`
          *,
          teams:team_id (name)
        `)
        .order('full_name');

      // If team_admin, only show managers from the same team
      if (currentMgr.role === 'team_admin' && currentMgr.team_id) {
        query = query.eq('team_id', currentMgr.team_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setManagers(data || []);
    } catch (error) {
      console.error('Error loading managers:', error);
      toast.error('Ошибка загрузки менеджеров');
    }
  }, [toast]);

  useEffect(() => {
    async function init() {
      const mgr = await loadCurrentManager();
      if (mgr) {
        setCurrentManager(mgr);
        
        // Check access - only admin or team_admin can access
        if (mgr.role !== 'admin' && mgr.role !== 'team_admin') {
          toast.error('Нет доступа к этой странице');
          setLoading(false);
          return;
        }

        await loadManagers(mgr);
      }
      setLoading(false);
    }
    init();
  }, [loadCurrentManager, loadManagers, toast]);

  function openCreateModal() {
    setEditingManager(null);
    setFormData({
      full_name: '',
      email: '',
      password: '',
      phone: '',
      role: 'manager',
      is_active: true,
      has_b2c_access: true,
      has_b2b_access: false,
    });
    setShowModal(true);
  }

  function openEditModal(manager: ManagerWithTeam) {
    setEditingManager(manager);
    setFormData({
      full_name: manager.full_name,
      email: manager.email,
      password: '', // Don't show password
      phone: manager.phone || '',
      role: manager.role,
      is_active: manager.is_active,
      has_b2c_access: manager.has_b2c_access,
      has_b2b_access: manager.has_b2b_access,
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentManager) return;

    setSaving(true);
    try {
      if (editingManager) {
        // Update existing manager
        const updateData: Record<string, any> = {
          full_name: formData.full_name,
          phone: formData.phone || null,
          role: formData.role,
          is_active: formData.is_active,
          has_b2c_access: formData.has_b2c_access,
          has_b2b_access: formData.has_b2b_access,
          updated_at: new Date().toISOString(),
        };

        // Only update email if changed
        if (formData.email !== editingManager.email) {
          updateData.email = formData.email;
        }

        const { error } = await supabase
          .from('managers')
          .update(updateData)
          .eq('id', editingManager.id);

        if (error) throw error;

        // Update password via admin API if provided
        if (formData.password && editingManager.auth_user_id) {
          const response = await fetch('/api/admin/update-user-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: editingManager.auth_user_id,
              new_password: formData.password,
            }),
          });
          if (!response.ok) {
            const data = await response.json();
            toast.error(`Ошибка смены пароля: ${data.error}`);
          }
        }

        toast.success('Менеджер обновлен');
      } else {
        // Create new manager via API
        const response = await fetch('/api/admin/create-manager', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            team_id: currentManager.team_id,
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Ошибка создания менеджера');
        }

        toast.success('Менеджер создан');
      }

      setShowModal(false);
      await loadManagers(currentManager);
    } catch (error: any) {
      console.error('Error saving manager:', error);
      toast.error(error.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }

  async function toggleManagerActive(manager: ManagerWithTeam) {
    try {
      const { error } = await supabase
        .from('managers')
        .update({ 
          is_active: !manager.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', manager.id);

      if (error) throw error;

      setManagers(prev => prev.map(m =>
        m.id === manager.id ? { ...m, is_active: !m.is_active } : m
      ));

      toast.success(manager.is_active ? 'Менеджер деактивирован' : 'Менеджер активирован');
    } catch (error) {
      console.error('Error toggling manager:', error);
      toast.error('Ошибка изменения статуса');
    }
  }

  // Determine which roles can be assigned based on current user's role
  const availableRoles: ManagerRole[] = currentManager?.role === 'admin'
    ? ['admin', 'team_admin', 'rop', 'manager', 'marketer']
    : ['rop', 'manager', 'marketer']; // team_admin can't create other team_admins or admins

  const shell = (content: React.ReactNode) => (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden bg-white border-b h-16 flex items-center px-4">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <span className="ml-4 font-bold text-gray-900 text-lg">Менеджеры</span>
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

  if (!currentManager || (currentManager.role !== 'admin' && currentManager.role !== 'team_admin')) {
    return shell(
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <h2 className="text-lg font-semibold text-red-800">Доступ запрещен</h2>
          <p className="text-red-600 mt-2">У вас нет прав для управления менеджерами</p>
          <Link href="/" className="inline-block mt-4 text-blue-600 hover:underline">
            Вернуться на главную
          </Link>
        </div>
      </div>
    );
  }

  return shell(
    <div className="p-6 max-w-5xl mx-auto">
      <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">&larr; Главная</Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Управление менеджерами</h1>
          {team && currentManager.role === 'team_admin' && (
            <p className="text-sm text-gray-500 mt-1">Команда: {team.name}</p>
          )}
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Добавить менеджера
        </button>
      </div>

      {/* Managers List */}
      <div className="space-y-3">
        {managers.map((manager) => (
          <div
            key={manager.id}
            className={`bg-white rounded-2xl shadow-sm border p-5 transition-opacity ${!manager.is_active ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">{manager.full_name}</h3>
                  <span className={`px-2.5 py-0.5 rounded-md text-xs font-medium ${roleColors[manager.role]}`}>
                    {roleLabels[manager.role]}
                  </span>
                  {!manager.is_active && (
                    <span className="px-2.5 py-0.5 bg-red-100 text-red-700 rounded-md text-xs font-medium">
                      Неактивен
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">{manager.email}</p>
                {manager.phone && (
                  <p className="text-sm text-gray-500">{manager.phone}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  {manager.has_b2c_access && (
                    <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs">B2C</span>
                  )}
                  {manager.has_b2b_access && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">B2B</span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(manager)}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Редактировать"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                {/* Can't deactivate yourself or higher-level admins */}
                {manager.id !== currentManager.id && !(currentManager.role === 'team_admin' && (manager.role === 'admin' || manager.role === 'team_admin')) && (
                  <button
                    onClick={() => toggleManagerActive(manager)}
                    className={`p-2 rounded-lg transition-colors ${
                      manager.is_active
                        ? 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                        : 'text-gray-500 hover:text-green-600 hover:bg-green-50'
                    }`}
                    title={manager.is_active ? 'Деактивировать' : 'Активировать'}
                  >
                    {manager.is_active ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {managers.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            Менеджеры не найдены
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingManager ? 'Редактировать менеджера' : 'Новый менеджер'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ФИО *</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={!!editingManager} // Don't allow email change in edit mode for now
                />
                {editingManager && (
                  <p className="text-xs text-gray-500 mt-1">Email нельзя изменить</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingManager ? 'Новый пароль (оставьте пустым, чтобы не менять)' : 'Пароль *'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={editingManager ? 'Оставьте пустым' : 'Минимум 6 символов'}
                  required={!editingManager}
                  minLength={editingManager ? 0 : 6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+7 (999) 999-99-99"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Роль *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as ManagerRole }))}
                  className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {availableRoles.map(role => (
                    <option key={role} value={role}>{roleLabels[role]}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Доступ</label>
                <label className="flex items-center gap-3 p-3 border rounded-xl hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.has_b2c_access}
                    onChange={(e) => setFormData(prev => ({ ...prev, has_b2c_access: e.target.checked }))}
                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium text-gray-900">B2C (клиенты)</span>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-xl hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.has_b2b_access}
                    onChange={(e) => setFormData(prev => ({ ...prev, has_b2b_access: e.target.checked }))}
                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium text-gray-900">B2B (компании)</span>
                </label>
              </div>

              <label className="flex items-center gap-3 p-3 border rounded-xl hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-5 h-5 rounded text-green-600 focus:ring-green-500"
                />
                <span className="font-medium text-gray-900">Активен</span>
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 border text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Сохранение...' : editingManager ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
