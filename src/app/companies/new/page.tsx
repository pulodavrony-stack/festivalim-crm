'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/layout/Sidebar';
import { CompanyTypeLabels } from '@/types/b2b';
import type { CompanyType } from '@/types/b2b';

export default function CreateCompanyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [form, setForm] = useState({
    name: '',
    legal_name: '',
    company_type: 'school' as CompanyType,
    inn: '',
    kpp: '',
    ogrn: '',
    legal_address: '',
    actual_address: '',
    phone: '',
    email: '',
    website: '',
    city_id: '',
    manager_id: '',
    notes: '',
  });

  useEffect(() => {
    loadRefs();
  }, []);

  async function loadRefs() {
    const [citiesRes, managersRes] = await Promise.all([
      supabase.from('cities').select('id, name').order('name'),
      supabase.from('managers').select('id, full_name').eq('is_active', true).order('full_name'),
    ]);
    setCities(citiesRes.data || []);
    setManagers(managersRes.data || []);
  }

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: Record<string, any> = { ...form };
      if (!payload.city_id) delete payload.city_id;
      if (!payload.manager_id) delete payload.manager_id;

      const { data, error } = await supabase
        .from('companies')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      router.push(`/companies/${data.id}`);
    } catch (error) {
      console.error('Error creating company:', error);
      alert('Ошибка при создании компании');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden bg-white border-b h-16 flex items-center px-4">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <span className="ml-4 font-bold text-gray-900 text-lg">Новая компания</span>
        </header>
        <main className="flex-1 overflow-auto p-6 max-w-3xl mx-auto w-full">
      <Link href="/companies" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">&larr; Все компании</Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Добавить компанию</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border p-6 space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
          <input
            required
            value={form.name}
            onChange={e => update('name', e.target.value)}
            className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="МБОУ Школа №1"
          />
        </div>

        {/* Legal Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Юридическое название</label>
          <input
            value={form.legal_name}
            onChange={e => update('legal_name', e.target.value)}
            className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Муниципальное бюджетное общеобразовательное учреждение..."
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Тип компании *</label>
          <select
            required
            value={form.company_type}
            onChange={e => update('company_type', e.target.value)}
            className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {Object.entries(CompanyTypeLabels).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>

        {/* INN / KPP / OGRN */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ИНН</label>
            <input value={form.inn} onChange={e => update('inn', e.target.value)} className="w-full px-3 py-2.5 border rounded-xl" placeholder="1234567890" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">КПП</label>
            <input value={form.kpp} onChange={e => update('kpp', e.target.value)} className="w-full px-3 py-2.5 border rounded-xl" placeholder="123456789" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ОГРН</label>
            <input value={form.ogrn} onChange={e => update('ogrn', e.target.value)} className="w-full px-3 py-2.5 border rounded-xl" placeholder="1234567890123" />
          </div>
        </div>

        {/* Addresses */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Юридический адрес</label>
          <input value={form.legal_address} onChange={e => update('legal_address', e.target.value)} className="w-full px-3 py-2.5 border rounded-xl" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Фактический адрес</label>
          <input value={form.actual_address} onChange={e => update('actual_address', e.target.value)} className="w-full px-3 py-2.5 border rounded-xl" />
        </div>

        {/* Phone / Email / Website */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
            <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)} className="w-full px-3 py-2.5 border rounded-xl" placeholder="+7 (XXX) XXX-XX-XX" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={e => update('email', e.target.value)} className="w-full px-3 py-2.5 border rounded-xl" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Сайт</label>
            <input value={form.website} onChange={e => update('website', e.target.value)} className="w-full px-3 py-2.5 border rounded-xl" placeholder="https://..." />
          </div>
        </div>

        {/* City & Manager */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Город</label>
            <select value={form.city_id} onChange={e => update('city_id', e.target.value)} className="w-full px-3 py-2.5 border rounded-xl">
              <option value="">Выберите город</option>
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ответственный менеджер</label>
            <select value={form.manager_id} onChange={e => update('manager_id', e.target.value)} className="w-full px-3 py-2.5 border rounded-xl">
              <option value="">Выберите менеджера</option>
              {managers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Примечания</label>
          <textarea value={form.notes} onChange={e => update('notes', e.target.value)} className="w-full px-3 py-2.5 border rounded-xl" rows={3} />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium disabled:opacity-50 shadow-lg shadow-blue-500/20"
          >
            {loading ? 'Сохранение...' : 'Создать компанию'}
          </button>
          <button type="button" onClick={() => router.back()} className="px-6 py-2.5 border rounded-xl hover:bg-gray-50 font-medium">
            Отмена
          </button>
        </div>
      </form>
        </main>
      </div>
    </div>
  );
}
