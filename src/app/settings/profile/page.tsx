'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/Toast';

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const toast = useToast();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [manager, setManager] = useState<{
    id: string;
    full_name: string;
    email: string;
    phone: string;
    role: string;
    team_name?: string;
  } | null>(null);

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  async function loadProfile() {
    try {
      const { data, error } = await supabase
        .from('managers')
        .select(`
          id, full_name, email, phone, role,
          teams:team_id (name)
        `)
        .eq('auth_user_id', user?.id)
        .single();

      if (error) throw error;
      
      const teamData = data?.teams as { name: string } | null;
      
      setManager({
        id: data.id,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || '',
        role: data.role,
        team_name: teamData?.name
      });
      
      setFullName(data.full_name);
      setPhone(data.phone || '');
      setNewEmail(data.email);
      
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Ошибка загрузки профиля');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!manager) return;

    setSaving(true);
    try {
      // Update manager record
      const { error } = await supabase
        .from('managers')
        .update({
          full_name: fullName,
          phone: phone || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', manager.id);

      if (error) throw error;

      setManager(prev => prev ? { ...prev, full_name: fullName, phone } : null);
      toast.success('Профиль обновлен');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Ошибка обновления профиля');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail || newEmail === manager?.email) {
      toast.error('Введите новый email');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (error) throw error;

      // Also update manager record
      if (manager) {
        await supabase
          .from('managers')
          .update({ email: newEmail, updated_at: new Date().toISOString() })
          .eq('id', manager.id);
      }

      toast.success('На новый email отправлено письмо для подтверждения');
    } catch (error: any) {
      console.error('Error updating email:', error);
      toast.error(error.message || 'Ошибка смены email');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    
    if (!newPassword) {
      toast.error('Введите новый пароль');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('Пароль должен быть не менее 6 символов');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Пароль успешно изменен');
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error(error.message || 'Ошибка смены пароля');
    } finally {
      setSaving(false);
    }
  }

  const roleLabels: Record<string, string> = {
    admin: 'Супер-администратор',
    team_admin: 'Администратор команды',
    rop: 'РОП',
    manager: 'Менеджер',
    marketer: 'Маркетолог',
  };

  const shell = (content: React.ReactNode) => (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden bg-white border-b h-16 flex items-center px-4">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <span className="ml-4 font-bold text-gray-900 text-lg">Профиль</span>
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
    <div className="p-6 max-w-2xl mx-auto">
      <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">&larr; Главная</Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Настройки профиля</h1>
        {manager && (
          <div className="flex items-center gap-3 mt-2">
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-md text-sm font-medium">
              {roleLabels[manager.role] || manager.role}
            </span>
            {manager.team_name && (
              <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-md text-sm">
                {manager.team_name}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Основная информация</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 (999) 999-99-99"
                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </form>
        </div>

        {/* Change Email */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Изменить Email</h2>
          <p className="text-sm text-gray-500 mb-4">
            Текущий email: <span className="font-medium text-gray-700">{manager?.email}</span>
          </p>
          <form onSubmit={handleChangeEmail} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Новый Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={saving || newEmail === manager?.email}
              className="px-5 py-2.5 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-900 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Сохранение...' : 'Изменить Email'}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Изменить пароль</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Новый пароль</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Минимум 6 символов"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Подтвердите пароль</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Повторите новый пароль"
                required
              />
            </div>
            <button
              type="submit"
              disabled={saving || !newPassword || !confirmPassword}
              className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Сохранение...' : 'Изменить пароль'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
