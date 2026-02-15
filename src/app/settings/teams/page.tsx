'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getPublicClient } from '@/lib/supabase-schema';
import { useTeam } from '@/components/providers/TeamProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import Sidebar from '@/components/layout/Sidebar';
import { useToast } from '@/components/ui/Toast';
import type { Team } from '@/types/team';

export default function TeamsSettingsPage() {
  const { manager } = useAuth();
  const { team: currentTeam, canSwitchTeams } = useTeam();
  const toast = useToast();
  const publicClient = getPublicClient();
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    uis_api_key: '',
    uis_virtual_number: '',
    webrtc_token: '',
    legal_name: '',
    inn: '',
    kpp: '',
    ogrn: '',
    legal_address: '',
    bank_name: '',
    bank_bik: '',
    bank_account: '',
    correspondent_account: '',
    // Каналы и интеграции
    sales_channels: [] as string[],
    tilda_project_id: '',
    tilda_api_key: '',
    telegram_bot_token: '',
    telegram_channel_id: '',
    whatsapp_business_id: '',
    instagram_account: '',
    vk_group_id: '',
  });
  
  const SALES_CHANNELS = [
    { id: 'tilda', label: 'Tilda', icon: '🌐' },
    { id: 'site', label: 'Сайт', icon: '💻' },
    { id: 'telegram', label: 'Telegram', icon: '✈️' },
    { id: 'instagram', label: 'Instagram', icon: '📸' },
    { id: 'vk', label: 'ВКонтакте', icon: '💬' },
    { id: 'avito', label: 'Авито', icon: '📦' },
    { id: 'yandex', label: 'Яндекс', icon: '🔍' },
  ];
  
  const loadTeams = useCallback(async () => {
    try {
      const { data, error } = await publicClient
        .from('teams')
        .select('*')
        .order('name');
      
      if (error) throw error;
      if (data) {
        setTeams(data);
        // Автовыбор текущей команды или первой
        if (currentTeam) {
          const team = data.find(t => t.id === currentTeam.id);
          if (team) {
            setSelectedTeam(team);
            updateForm(team);
          }
        } else if (data.length > 0) {
          setSelectedTeam(data[0]);
          updateForm(data[0]);
        }
      }
    } catch (error) {
      console.error('Error loading teams:', error);
      toast.error('Ошибка загрузки команд');
    } finally {
      setLoading(false);
    }
  }, [currentTeam]);
  
  function updateForm(team: Team) {
    setForm({
      name: team.name || '',
      uis_api_key: team.uis_api_key || '',
      uis_virtual_number: team.uis_virtual_number || '',
      webrtc_token: team.webrtc_token || '',
      legal_name: team.legal_name || '',
      inn: team.inn || '',
      kpp: team.kpp || '',
      ogrn: team.ogrn || '',
      sales_channels: (team.sales_channels as string[]) || [],
      tilda_project_id: team.tilda_project_id || '',
      tilda_api_key: team.tilda_api_key || '',
      telegram_bot_token: team.telegram_bot_token || '',
      telegram_channel_id: team.telegram_channel_id || '',
      whatsapp_business_id: team.whatsapp_business_id || '',
      instagram_account: team.instagram_account || '',
      vk_group_id: team.vk_group_id || '',
      legal_address: team.legal_address || '',
      bank_name: team.bank_name || '',
      bank_bik: team.bank_bik || '',
      bank_account: team.bank_account || '',
      correspondent_account: team.correspondent_account || '',
    });
  }
  
  useEffect(() => {
    loadTeams();
  }, [loadTeams]);
  
  function handleTeamSelect(team: Team) {
    setSelectedTeam(team);
    updateForm(team);
  }
  
  function toggleChannel(channelId: string) {
    setForm(prev => ({
      ...prev,
      sales_channels: prev.sales_channels.includes(channelId)
        ? prev.sales_channels.filter(c => c !== channelId)
        : [...prev.sales_channels, channelId]
    }));
  }
  
  async function handleSave() {
    if (!selectedTeam) return;
    
    setSaving(true);
    try {
      const { error } = await publicClient
        .from('teams')
        .update({
          name: form.name,
          uis_api_key: form.uis_api_key || null,
          uis_virtual_number: form.uis_virtual_number || null,
          webrtc_token: form.webrtc_token || null,
          legal_name: form.legal_name || null,
          inn: form.inn || null,
          kpp: form.kpp || null,
          ogrn: form.ogrn || null,
          legal_address: form.legal_address || null,
          bank_name: form.bank_name || null,
          bank_bik: form.bank_bik || null,
          bank_account: form.bank_account || null,
          correspondent_account: form.correspondent_account || null,
          // Каналы и интеграции
          sales_channels: form.sales_channels,
          tilda_project_id: form.tilda_project_id || null,
          tilda_api_key: form.tilda_api_key || null,
          telegram_bot_token: form.telegram_bot_token || null,
          telegram_channel_id: form.telegram_channel_id || null,
          whatsapp_business_id: form.whatsapp_business_id || null,
          instagram_account: form.instagram_account || null,
          vk_group_id: form.vk_group_id || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedTeam.id);
      
      if (error) throw error;
      
      toast.success('Настройки сохранены');
      loadTeams();
    } catch (error) {
      console.error('Error saving team:', error);
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  }
  
  // Проверяем права доступа
  if (manager?.role !== 'admin') {
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
            <span className="ml-4 font-bold text-gray-900 text-lg">Настройки команд</span>
          </header>
          <main className="flex-1 p-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
              <p className="text-yellow-800">Доступ запрещен. Только администраторы могут управлять командами.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex bg-gray-50">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
        </div>
      </div>
    );
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
          <span className="ml-4 font-bold text-gray-900 text-lg">Настройки команд</span>
        </header>
        
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {/* Header */}
            <div className="mb-6">
              <Link href="/settings/managers-access" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Назад к настройкам
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Настройки команд</h1>
              <p className="text-gray-500 mt-1">Телефония, юридические лица и реквизиты</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Teams List */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-sm border p-4">
                  <h3 className="font-semibold text-gray-900 mb-4">Команды</h3>
                  <div className="space-y-2">
                    {teams.map((team) => (
                      <button
                        key={team.id}
                        onClick={() => handleTeamSelect(team)}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                          selectedTeam?.id === team.id
                            ? 'bg-red-50 border-2 border-red-500 text-red-700'
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <div className="font-medium">{team.name}</div>
                        <div className="text-sm text-gray-500">{team.schema_name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Settings Form */}
              <div className="lg:col-span-3 space-y-6">
                {selectedTeam ? (
                  <>
                    {/* Basic Info */}
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-xl">🏢</span>
                        Основные данные
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Название команды</label>
                          <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Схема БД</label>
                          <input
                            type="text"
                            value={selectedTeam.schema_name}
                            disabled
                            className="w-full px-4 py-2 border rounded-lg bg-gray-100 text-gray-500"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Telephony */}
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-xl">📞</span>
                        Телефония UIS
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                          <input
                            type="password"
                            value={form.uis_api_key}
                            onChange={(e) => setForm({ ...form, uis_api_key: e.target.value })}
                            placeholder="uis-api-key..."
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Виртуальный номер</label>
                          <input
                            type="text"
                            value={form.uis_virtual_number}
                            onChange={(e) => setForm({ ...form, uis_virtual_number: e.target.value })}
                            placeholder="+7..."
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">WebRTC Token</label>
                          <input
                            type="password"
                            value={form.webrtc_token}
                            onChange={(e) => setForm({ ...form, webrtc_token: e.target.value })}
                            placeholder="webrtc-token..."
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Legal Entity */}
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-xl">📄</span>
                        Юридическое лицо
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Полное наименование</label>
                          <input
                            type="text"
                            value={form.legal_name}
                            onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
                            placeholder='ООО "Название"'
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ИНН</label>
                          <input
                            type="text"
                            value={form.inn}
                            onChange={(e) => setForm({ ...form, inn: e.target.value })}
                            placeholder="1234567890"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">КПП</label>
                          <input
                            type="text"
                            value={form.kpp}
                            onChange={(e) => setForm({ ...form, kpp: e.target.value })}
                            placeholder="123456789"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ОГРН</label>
                          <input
                            type="text"
                            value={form.ogrn}
                            onChange={(e) => setForm({ ...form, ogrn: e.target.value })}
                            placeholder="1234567890123"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Юридический адрес</label>
                          <input
                            type="text"
                            value={form.legal_address}
                            onChange={(e) => setForm({ ...form, legal_address: e.target.value })}
                            placeholder="г. Москва, ул. ..."
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Bank Details */}
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-xl">🏦</span>
                        Банковские реквизиты
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Название банка</label>
                          <input
                            type="text"
                            value={form.bank_name}
                            onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
                            placeholder="ПАО Сбербанк"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">БИК</label>
                          <input
                            type="text"
                            value={form.bank_bik}
                            onChange={(e) => setForm({ ...form, bank_bik: e.target.value })}
                            placeholder="044525225"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Расчётный счёт</label>
                          <input
                            type="text"
                            value={form.bank_account}
                            onChange={(e) => setForm({ ...form, bank_account: e.target.value })}
                            placeholder="40702810..."
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Корр. счёт</label>
                          <input
                            type="text"
                            value={form.correspondent_account}
                            onChange={(e) => setForm({ ...form, correspondent_account: e.target.value })}
                            placeholder="30101810..."
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Sales Channels */}
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-xl">📢</span>
                        Каналы продаж
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">Выберите каналы, через которые команда продаёт билеты</p>
                      <div className="flex flex-wrap gap-2">
                        {SALES_CHANNELS.map((channel) => (
                          <button
                            key={channel.id}
                            type="button"
                            onClick={() => toggleChannel(channel.id)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                              form.sales_channels.includes(channel.id)
                                ? 'bg-red-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <span>{channel.icon}</span>
                            {channel.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Integrations */}
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-xl">🔗</span>
                        Интеграции
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tilda Project ID</label>
                          <input
                            type="text"
                            value={form.tilda_project_id}
                            onChange={(e) => setForm({ ...form, tilda_project_id: e.target.value })}
                            placeholder="123456"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tilda API Key</label>
                          <input
                            type="password"
                            value={form.tilda_api_key}
                            onChange={(e) => setForm({ ...form, tilda_api_key: e.target.value })}
                            placeholder="api-key..."
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Telegram Bot Token</label>
                          <input
                            type="password"
                            value={form.telegram_bot_token}
                            onChange={(e) => setForm({ ...form, telegram_bot_token: e.target.value })}
                            placeholder="bot-token..."
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Telegram Channel ID</label>
                          <input
                            type="text"
                            value={form.telegram_channel_id}
                            onChange={(e) => setForm({ ...form, telegram_channel_id: e.target.value })}
                            placeholder="@channel или -100..."
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp Business ID</label>
                          <input
                            type="text"
                            value={form.whatsapp_business_id}
                            onChange={(e) => setForm({ ...form, whatsapp_business_id: e.target.value })}
                            placeholder="business-id..."
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                          <input
                            type="text"
                            value={form.instagram_account}
                            onChange={(e) => setForm({ ...form, instagram_account: e.target.value })}
                            placeholder="@username"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ВКонтакте Group ID</label>
                          <input
                            type="text"
                            value={form.vk_group_id}
                            onChange={(e) => setForm({ ...form, vk_group_id: e.target.value })}
                            placeholder="club123456"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Stats Display */}
                    {selectedTeam && (selectedTeam.total_clients || selectedTeam.total_deals || selectedTeam.total_revenue) && (
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100 p-6">
                        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                          <span className="text-xl">📊</span>
                          Статистика команды
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-indigo-600">{selectedTeam.total_clients || 0}</div>
                            <div className="text-sm text-gray-500">Клиентов</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">{selectedTeam.total_deals || 0}</div>
                            <div className="text-sm text-gray-500">Сделок</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{(selectedTeam.total_revenue || 0).toLocaleString()} ₽</div>
                            <div className="text-sm text-gray-500">Выручка</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">{selectedTeam.total_tickets_sold || 0}</div>
                            <div className="text-sm text-gray-500">Билетов</div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Save Button */}
                    <div className="flex justify-end">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {saving ? 'Сохранение...' : 'Сохранить настройки'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-8 text-center">
                    <p className="text-gray-500">Выберите команду для редактирования</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
