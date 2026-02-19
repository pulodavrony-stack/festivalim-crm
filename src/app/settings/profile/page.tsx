'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/AuthProvider';
import { useSchemaClient } from '@/components/providers/TeamProvider';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/Toast';

interface ManagerProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  team_name?: string;
  created_at?: string;
}

interface ManagerStats {
  leads_total: number;
  leads_this_month: number;
  deals_won: number;
  deals_won_this_month: number;
  revenue_total: number;
  revenue_this_month: number;
  tickets_total: number;
  calls_total: number;
  calls_this_month: number;
  avg_deal_amount: number;
  conversion_lead_to_deal: number;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Супер-администратор',
  super_admin: 'Супер-администратор',
  team_admin: 'Администратор команды',
  rop: 'РОП',
  manager: 'Менеджер',
  marketer: 'Маркетолог',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  super_admin: 'bg-red-100 text-red-700',
  team_admin: 'bg-orange-100 text-orange-700',
  rop: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  marketer: 'bg-green-100 text-green-700',
};

function StatCard({ label, value, sub, color = 'gray' }: { label: string; value: string | number; sub?: string; color?: string }) {
  const colorMap: Record<string, string> = {
    gray: 'bg-gray-50 border-gray-200',
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
    orange: 'bg-orange-50 border-orange-200',
  };
  const textMap: Record<string, string> = {
    gray: 'text-gray-900',
    blue: 'text-blue-700',
    green: 'text-green-700',
    purple: 'text-purple-700',
    orange: 'text-orange-700',
  };
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color] || colorMap.gray}`}>
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <p className={`text-2xl font-bold ${textMap[color] || textMap.gray}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const schemaClient = useSchemaClient();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'stats' | 'security'>('profile');

  const [manager, setManager] = useState<ManagerProfile | null>(null);
  const [stats, setStats] = useState<ManagerStats>({
    leads_total: 0,
    leads_this_month: 0,
    deals_won: 0,
    deals_won_this_month: 0,
    revenue_total: 0,
    revenue_this_month: 0,
    tickets_total: 0,
    calls_total: 0,
    calls_this_month: 0,
    avg_deal_amount: 0,
    conversion_lead_to_deal: 0,
  });

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const loadProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('managers')
        .select('id, full_name, email, phone, role, created_at, teams:team_id (name)')
        .eq('auth_user_id', user.id)
        .single();

      if (error) throw error;

      const teamData = data?.teams as { name: string } | null;
      const profile: ManagerProfile = {
        id: data.id,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone || '',
        role: data.role,
        team_name: teamData?.name,
        created_at: data.created_at,
      };
      setManager(profile);
      setFullName(data.full_name);
      setPhone(data.phone || '');
      setNewEmail(data.email);
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Ошибка загрузки профиля');
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const loadStats = useCallback(async () => {
    if (!user) return;
    setStatsLoading(true);
    try {
      const { data: mgr } = await supabase
        .from('managers')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!mgr) return;

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthStartStr = monthStart.toISOString();

      const [clientsRes, dealsRes, callsRes] = await Promise.all([
        schemaClient.from('clients').select('id, client_type, created_at').eq('manager_id', mgr.id),
        schemaClient.from('deals').select('id, status, amount, tickets_count, closed_at').eq('manager_id', mgr.id),
        schemaClient.from('calls').select('id, created_at').eq('manager_id', mgr.id),
      ]);

      const clients = clientsRes.data || [];
      const deals = dealsRes.data || [];
      const calls = callsRes.data || [];

      const wonDeals = deals.filter(d => d.status === 'won');
      const wonThisMonth = wonDeals.filter(d => d.closed_at && d.closed_at >= monthStartStr);
      const revenueTotal = wonDeals.reduce((s, d) => s + (d.amount || 0), 0);
      const revenueMonth = wonThisMonth.reduce((s, d) => s + (d.amount || 0), 0);
      const totalLeads = clients.filter(c => c.client_type === 'lead').length;
      const leadsMonth = clients.filter(c => c.client_type === 'lead' && c.created_at >= monthStartStr).length;

      setStats({
        leads_total: totalLeads,
        leads_this_month: leadsMonth,
        deals_won: wonDeals.length,
        deals_won_this_month: wonThisMonth.length,
        revenue_total: revenueTotal,
        revenue_this_month: revenueMonth,
        tickets_total: wonDeals.reduce((s, d) => s + (d.tickets_count || 0), 0),
        calls_total: calls.length,
        calls_this_month: calls.filter(c => c.created_at >= monthStartStr).length,
        avg_deal_amount: wonDeals.length > 0 ? Math.round(revenueTotal / wonDeals.length) : 0,
        conversion_lead_to_deal: totalLeads > 0 ? Math.round((wonDeals.length / totalLeads) * 100) : 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, [user, schemaClient]);

  useEffect(() => {
    loadProfile();
    loadStats();
  }, [loadProfile, loadStats]);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!manager) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('managers')
        .update({ full_name: fullName, phone: phone || null, updated_at: new Date().toISOString() })
        .eq('id', manager.id);
      if (error) throw error;
      setManager(prev => prev ? { ...prev, full_name: fullName, phone } : null);
      toast.success('Профиль обновлён');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Ошибка обновления профиля');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail || newEmail === manager?.email) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      if (manager) {
        await supabase.from('managers').update({ email: newEmail }).eq('id', manager.id);
      }
      toast.success('На новый email отправлено письмо для подтверждения');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Ошибка смены email';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('Пароль должен быть не менее 6 символов');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Пароль успешно изменён');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Ошибка смены пароля';
      toast.error(msg);
    } finally {
      setSaving(false);
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
          <span className="ml-4 font-bold text-gray-900 text-lg">Мой профиль</span>
        </header>
        <main className="flex-1 overflow-auto">{content}</main>
      </div>
    </div>
  );

  if (loading) {
    return shell(
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
      </div>
    );
  }

  const memberSince = manager?.created_at
    ? new Date(manager.created_at).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' })
    : null;

  return shell(
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">
      <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Главная
      </Link>

      {/* Profile card */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
          {manager?.full_name?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 truncate">{manager?.full_name}</h1>
          <p className="text-sm text-gray-500 truncate">{manager?.email}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-medium ${ROLE_COLORS[manager?.role || ''] || 'bg-gray-100 text-gray-700'}`}>
              {ROLE_LABELS[manager?.role || ''] || manager?.role}
            </span>
            {manager?.team_name && (
              <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">
                {manager.team_name}
              </span>
            )}
            {memberSince && (
              <span className="text-xs text-gray-400">в системе с {memberSince}</span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border p-1">
        {(['profile', 'stats', 'security'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? 'bg-red-500 text-white shadow' : 'text-gray-500 hover:text-gray-900'}`}
          >
            {tab === 'profile' && '👤 Профиль'}
            {tab === 'stats' && '📊 Статистика'}
            {tab === 'security' && '🔒 Безопасность'}
          </button>
        ))}
      </div>

      {/* TAB: Profile */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Основная информация</h2>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Имя и фамилия</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+7 (999) 999-99-99"
                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500" />
            </div>
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 disabled:opacity-50 transition-colors">
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </form>
        </div>
      )}

      {/* TAB: Stats */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          {statsLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">За всё время</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <StatCard label="Лидов получено" value={stats.leads_total} color="blue" />
                  <StatCard label="Сделок выиграно" value={stats.deals_won} color="green" />
                  <StatCard label="Выручка" value={`${stats.revenue_total.toLocaleString('ru-RU')} ₽`} color="green" />
                  <StatCard label="Билетов продано" value={stats.tickets_total} color="purple" />
                  <StatCard label="Звонков совершено" value={stats.calls_total} color="orange" />
                  <StatCard label="Средний чек" value={`${stats.avg_deal_amount.toLocaleString('ru-RU')} ₽`} />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Текущий месяц</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <StatCard label="Новых лидов" value={stats.leads_this_month} color="blue" sub="этот месяц" />
                  <StatCard label="Сделок закрыто" value={stats.deals_won_this_month} color="green" sub="этот месяц" />
                  <StatCard label="Выручка" value={`${stats.revenue_this_month.toLocaleString('ru-RU')} ₽`} color="green" sub="этот месяц" />
                  <StatCard label="Звонков" value={stats.calls_this_month} color="orange" sub="этот месяц" />
                </div>
              </div>

              <div className="bg-white rounded-2xl border p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Конверсия лид → сделка</h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full transition-all"
                      style={{ width: `${Math.min(stats.conversion_lead_to_deal, 100)}%` }}
                    />
                  </div>
                  <span className="text-xl font-bold text-red-600 w-16 text-right">
                    {stats.conversion_lead_to_deal}%
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {stats.deals_won} выигранных сделок из {stats.leads_total} лидов
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB: Security */}
      {activeTab === 'security' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Изменить Email</h2>
            <p className="text-sm text-gray-500 mb-4">
              Текущий email: <span className="font-medium text-gray-700">{manager?.email}</span>
            </p>
            <form onSubmit={handleChangeEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Новый Email</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500" required />
              </div>
              <button type="submit" disabled={saving || newEmail === manager?.email}
                className="px-6 py-2.5 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-900 disabled:opacity-50 transition-colors">
                {saving ? 'Сохранение...' : 'Изменить Email'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Изменить пароль</h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Новый пароль</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="Минимум 6 символов"
                  className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Подтвердите пароль</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Повторите новый пароль"
                  className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500" required />
              </div>
              <button type="submit" disabled={saving || !newPassword || !confirmPassword}
                className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                {saving ? 'Сохранение...' : 'Изменить пароль'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
