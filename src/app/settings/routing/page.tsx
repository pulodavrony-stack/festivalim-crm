'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface RoutingRule {
  id: string;
  city_id: string;
  event_id: string | null;
  manager_id: string;
  is_active: boolean;
  priority: number;
  valid_from: string | null;
  valid_to: string | null;
  city?: { name: string } | { name: string }[];
  event?: { 
    event_date: string;
    show?: { title: string } | { title: string }[];
  };
  manager?: { full_name: string };
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

export default function LeadRoutingPage() {
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // New rule form
  const [showForm, setShowForm] = useState(false);
  const [newRule, setNewRule] = useState({
    city_id: '',
    event_id: '',
    manager_id: '',
    priority: 0,
    valid_from: '',
    valid_to: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    
    const [rulesRes, citiesRes, managersRes, eventsRes] = await Promise.all([
      supabase
        .from('lead_routing_rules')
        .select(`
          *,
          city:cities(name),
          manager:managers(full_name),
          event:events(event_date, show:shows(title))
        `)
        .order('priority', { ascending: false }),
      supabase.from('cities').select('id, name').eq('is_active', true).order('name'),
      supabase.from('managers').select('id, full_name').eq('is_active', true).order('full_name'),
      supabase
        .from('events')
        .select('id, event_date, show:shows(title), city:cities(name)')
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date'),
    ]);
    
    if (rulesRes.data) setRules(rulesRes.data);
    if (citiesRes.data) setCities(citiesRes.data);
    if (managersRes.data) setManagers(managersRes.data);
    if (eventsRes.data) setEvents(eventsRes.data);
    
    setLoading(false);
  }

  async function createRule() {
    if (!newRule.city_id || !newRule.manager_id) return;
    
    setSaving(true);
    
    const { error } = await supabase.from('lead_routing_rules').insert({
      city_id: newRule.city_id,
      event_id: newRule.event_id || null,
      manager_id: newRule.manager_id,
      priority: newRule.priority,
      valid_from: newRule.valid_from || null,
      valid_to: newRule.valid_to || null,
      is_active: true,
    });
    
    if (!error) {
      setNewRule({ city_id: '', event_id: '', manager_id: '', priority: 0, valid_from: '', valid_to: '' });
      setShowForm(false);
      loadData();
    }
    
    setSaving(false);
  }

  async function toggleRule(ruleId: string, isActive: boolean) {
    await supabase
      .from('lead_routing_rules')
      .update({ is_active: !isActive })
      .eq('id', ruleId);
    
    loadData();
  }

  async function deleteRule(ruleId: string) {
    if (!confirm('Удалить правило?')) return;
    
    await supabase.from('lead_routing_rules').delete().eq('id', ruleId);
    loadData();
  }

  // Filter events by selected city
  const filteredEvents = events.filter(e => !newRule.city_id || e.city?.name === cities.find(c => c.id === newRule.city_id)?.name);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-2xl">🎭</Link>
              <h1 className="text-xl font-bold text-gray-900">Распределение лидов</h1>
            </div>
            <Link href="/" className="text-gray-600 hover:text-gray-900">← Назад</Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Description */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
          <h3 className="font-medium text-blue-800 mb-1">Как это работает</h3>
          <p className="text-sm text-blue-700">
            Правила определяют, какому менеджеру назначаются новые лиды в зависимости от города и спектакля.
            Правила с более высоким приоритетом применяются первыми. Правило с указанным спектаклем
            имеет приоритет над правилом только с городом.
          </p>
        </div>

        {/* Add Rule Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Добавить правило
          </button>
        </div>

        {/* New Rule Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Новое правило</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Город *</label>
                <select
                  value={newRule.city_id}
                  onChange={(e) => setNewRule({ ...newRule, city_id: e.target.value, event_id: '' })}
                  className="w-full px-3 py-2 border rounded-lg focus:border-red-500 outline-none"
                >
                  <option value="">Выберите город...</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>{city.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Спектакль (опционально)</label>
                <select
                  value={newRule.event_id}
                  onChange={(e) => setNewRule({ ...newRule, event_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:border-red-500 outline-none"
                  disabled={!newRule.city_id}
                >
                  <option value="">Любой спектакль в городе</option>
                  {filteredEvents.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.show?.title} • {new Date(event.event_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Менеджер *</label>
                <select
                  value={newRule.manager_id}
                  onChange={(e) => setNewRule({ ...newRule, manager_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:border-red-500 outline-none"
                >
                  <option value="">Выберите менеджера...</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Действует с</label>
                <input
                  type="date"
                  value={newRule.valid_from}
                  onChange={(e) => setNewRule({ ...newRule, valid_from: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:border-red-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Действует до</label>
                <input
                  type="date"
                  value={newRule.valid_to}
                  onChange={(e) => setNewRule({ ...newRule, valid_to: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:border-red-500 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={createRule}
                disabled={saving || !newRule.city_id || !newRule.manager_id}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-600 hover:text-gray-800 px-4 py-2"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* Rules List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500 mx-auto"></div>
            </div>
          ) : rules.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="mb-2">Нет правил распределения</p>
              <p className="text-sm">Добавьте правило, чтобы лиды автоматически назначались на менеджеров</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Город</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Спектакль</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Менеджер</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Период</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Статус</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rules.map((rule) => (
                  <tr key={rule.id} className={`hover:bg-gray-50 ${!rule.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-4 font-medium text-gray-900">{rule.city?.name}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {rule.event ? (
                        <>
                          {rule.event.show?.title}
                          <span className="text-xs ml-1">
                            ({new Date(rule.event.event_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })})
                          </span>
                        </>
                      ) : (
                        <span className="italic">Любой</span>
                      )}
                    </td>
                    <td className="px-4 py-4 font-medium text-gray-900">{rule.manager?.full_name}</td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {rule.valid_from || rule.valid_to ? (
                        <>
                          {rule.valid_from && new Date(rule.valid_from).toLocaleDateString('ru-RU')}
                          {' — '}
                          {rule.valid_to && new Date(rule.valid_to).toLocaleDateString('ru-RU')}
                        </>
                      ) : (
                        'Бессрочно'
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => toggleRule(rule.id, rule.is_active)}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          rule.is_active 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {rule.is_active ? 'Активно' : 'Выкл'}
                      </button>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Example */}
        <div className="mt-6 bg-gray-100 rounded-xl p-4">
          <h4 className="font-medium text-gray-700 mb-2">Пример:</h4>
          <p className="text-sm text-gray-600">
            Правило «Краснодар + Раневская → Ландина» означает, что все лиды,
            приходящие по городу Краснодар на спектакль «Раневская»,
            автоматически назначаются менеджеру Ландиной.
          </p>
        </div>
      </main>
    </div>
  );
}
