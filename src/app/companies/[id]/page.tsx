'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/layout/Sidebar';
import {
  CompanyTypeLabels,
  ContractStatusLabels,
  PaymentStatusLabels,
} from '@/types/b2b';
import type { CompanyFull, ContractFull, CompanyContact } from '@/types/b2b';

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [company, setCompany] = useState<CompanyFull | null>(null);
  const [contracts, setContracts] = useState<ContractFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Contact form
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({ full_name: '', position: '', phone: '', email: '', is_primary: false, is_decision_maker: false });
  const [savingContact, setSavingContact] = useState(false);

  // Contract form
  const [showContractForm, setShowContractForm] = useState(false);
  const [contractForm, setContractForm] = useState({ contract_number: '', contract_date: '', tickets_count: 0, ticket_price: 0, discount_percent: 0, payment_terms: '', notes: '' });
  const [events, setEvents] = useState<any[]>([]);
  const [contractEventId, setContractEventId] = useState('');
  const [savingContract, setSavingContract] = useState(false);

  useEffect(() => {
    loadCompany();
    loadContracts();
    loadEvents();
  }, [companyId]);

  async function loadCompany() {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select(`
          *,
          city:cities(id, name),
          manager:managers(id, full_name),
          contacts:company_contacts(*)
        `)
        .eq('id', companyId)
        .single();

      if (error) throw error;
      setCompany(data as any);
    } catch (error) {
      console.error('Error loading company:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadContracts() {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          event:events(event_date, show:shows(title)),
          manager:managers(full_name)
        `)
        .eq('company_id', companyId)
        .order('contract_date', { ascending: false });

      if (error) throw error;
      setContracts((data as any) || []);
    } catch (error) {
      console.error('Error loading contracts:', error);
    }
  }

  async function loadEvents() {
    const { data } = await supabase
      .from('events')
      .select('id, event_date, show:shows(title), city:cities(name)')
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date');
    setEvents((data as any) || []);
  }

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    setSavingContact(true);
    try {
      const { error } = await supabase
        .from('company_contacts')
        .insert([{ ...contactForm, company_id: companyId }]);
      if (error) throw error;
      setShowContactForm(false);
      setContactForm({ full_name: '', position: '', phone: '', email: '', is_primary: false, is_decision_maker: false });
      loadCompany();
    } catch (err) {
      console.error('Error adding contact:', err);
    } finally {
      setSavingContact(false);
    }
  }

  async function handleAddContract(e: React.FormEvent) {
    e.preventDefault();
    setSavingContract(true);
    try {
      const total = contractForm.tickets_count * contractForm.ticket_price;
      const discountAmt = contractForm.discount_percent ? (total * contractForm.discount_percent) / 100 : 0;

      const { error } = await supabase
        .from('contracts')
        .insert([{
          company_id: companyId,
          contract_number: contractForm.contract_number,
          contract_date: contractForm.contract_date,
          event_id: contractEventId || null,
          tickets_count: contractForm.tickets_count,
          ticket_price: contractForm.ticket_price,
          total_amount: total,
          discount_percent: contractForm.discount_percent,
          discount_amount: discountAmt,
          final_amount: total - discountAmt,
          payment_terms: contractForm.payment_terms,
          notes: contractForm.notes,
          manager_id: company?.manager_id || null,
        }]);
      if (error) throw error;
      setShowContractForm(false);
      setContractForm({ contract_number: '', contract_date: '', tickets_count: 0, ticket_price: 0, discount_percent: 0, payment_terms: '', notes: '' });
      setContractEventId('');
      loadContracts();
      loadCompany();
    } catch (err) {
      console.error('Error adding contract:', err);
    } finally {
      setSavingContract(false);
    }
  }

  const shellStart = (
    <>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden bg-white border-b h-16 flex items-center px-4">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <span className="ml-4 font-bold text-gray-900 text-lg">Компания</span>
        </header>
        <main className="flex-1 overflow-auto">
    </>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex bg-gray-50">
        {shellStart}
        <div className="flex items-center justify-center py-20 w-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
        </main></div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex bg-gray-50">
        {shellStart}
        <div className="p-6 text-center py-20 w-full">
          <p className="text-gray-500">Компания не найдена</p>
          <Link href="/companies" className="text-blue-600 hover:underline mt-2 inline-block">Назад к списку</Link>
        </div>
        </main></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {shellStart}
      <div className="p-6 max-w-7xl mx-auto w-full">
      {/* Back button & Header */}
      <div className="mb-6">
        <Link href="/companies" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">&larr; Все компании</Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
            {company.legal_name && company.legal_name !== company.name && (
              <p className="text-gray-500 mt-1">{company.legal_name}</p>
            )}
            <span className={`inline-block mt-2 px-3 py-1 text-xs font-medium rounded-lg ${
              company.company_type === 'school' ? 'bg-blue-100 text-blue-700' :
              company.company_type === 'kindergarten' ? 'bg-pink-100 text-pink-700' :
              company.company_type === 'gov' ? 'bg-amber-100 text-amber-700' :
              'bg-purple-100 text-purple-700'
            }`}>
              {CompanyTypeLabels[company.company_type]}
            </span>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border p-5">
          <div className="text-sm text-gray-500">Договоров</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">{company.total_contracts}</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border p-5">
          <div className="text-sm text-gray-500">Общая выручка</div>
          <div className="text-3xl font-bold text-green-600 mt-1">{Number(company.total_revenue).toLocaleString('ru-RU')} ₽</div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border p-5">
          <div className="text-sm text-gray-500">Средний чек</div>
          <div className="text-3xl font-bold text-gray-900 mt-1">
            {company.total_contracts > 0
              ? Math.round(Number(company.total_revenue) / company.total_contracts).toLocaleString('ru-RU')
              : 0} ₽
          </div>
        </div>
      </div>

      {/* Main Info */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Основная информация</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
          <div><span className="text-xs text-gray-400 uppercase">ИНН</span><p className="font-medium">{company.inn || '—'}</p></div>
          <div><span className="text-xs text-gray-400 uppercase">КПП</span><p className="font-medium">{company.kpp || '—'}</p></div>
          <div><span className="text-xs text-gray-400 uppercase">ОГРН</span><p className="font-medium">{company.ogrn || '—'}</p></div>
          <div><span className="text-xs text-gray-400 uppercase">Город</span><p className="font-medium">{company.city?.name || '—'}</p></div>
          <div><span className="text-xs text-gray-400 uppercase">Менеджер</span><p className="font-medium">{company.manager?.full_name || '—'}</p></div>
          <div><span className="text-xs text-gray-400 uppercase">Телефон</span><p className="font-medium">{company.phone || '—'}</p></div>
          <div><span className="text-xs text-gray-400 uppercase">Email</span><p className="font-medium">{company.email || '—'}</p></div>
          <div><span className="text-xs text-gray-400 uppercase">Юр. адрес</span><p className="font-medium text-sm">{company.legal_address || '—'}</p></div>
          <div><span className="text-xs text-gray-400 uppercase">Факт. адрес</span><p className="font-medium text-sm">{company.actual_address || '—'}</p></div>
        </div>
        {company.notes && (
          <div className="mt-4 pt-4 border-t">
            <span className="text-xs text-gray-400 uppercase">Примечания</span>
            <p className="text-gray-700 mt-1">{company.notes}</p>
          </div>
        )}
      </div>

      {/* Contacts */}
      <div className="bg-white rounded-2xl shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Контактные лица</h2>
          <button
            onClick={() => setShowContactForm(!showContactForm)}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            + Добавить контакт
          </button>
        </div>

        {showContactForm && (
          <form onSubmit={handleAddContact} className="border rounded-xl p-4 mb-4 bg-gray-50 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="ФИО *" value={contactForm.full_name} onChange={e => setContactForm({...contactForm, full_name: e.target.value})} className="px-3 py-2 border rounded-lg" />
              <input placeholder="Должность" value={contactForm.position} onChange={e => setContactForm({...contactForm, position: e.target.value})} className="px-3 py-2 border rounded-lg" />
              <input placeholder="Телефон" value={contactForm.phone} onChange={e => setContactForm({...contactForm, phone: e.target.value})} className="px-3 py-2 border rounded-lg" />
              <input placeholder="Email" value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})} className="px-3 py-2 border rounded-lg" />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={contactForm.is_primary} onChange={e => setContactForm({...contactForm, is_primary: e.target.checked})} /> Основной контакт</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={contactForm.is_decision_maker} onChange={e => setContactForm({...contactForm, is_decision_maker: e.target.checked})} /> ЛПР</label>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={savingContact} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {savingContact ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button type="button" onClick={() => setShowContactForm(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-100">Отмена</button>
            </div>
          </form>
        )}

        {company.contacts && company.contacts.length > 0 ? (
          <div className="space-y-3">
            {company.contacts.map((contact: CompanyContact) => (
              <div key={contact.id} className="border rounded-xl p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">{contact.full_name}</p>
                    {contact.position && <p className="text-sm text-gray-500">{contact.position}</p>}
                  </div>
                  <div className="text-right text-sm">
                    {contact.phone && <p className="text-gray-700">{contact.phone}</p>}
                    {contact.email && <p className="text-blue-600">{contact.email}</p>}
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  {contact.is_primary && <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-md font-medium">Основной</span>}
                  {contact.is_decision_maker && <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-md font-medium">ЛПР</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 py-4 text-center">Контактов пока нет</p>
        )}
      </div>

      {/* Contracts */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Договоры</h2>
          <button
            onClick={() => setShowContractForm(!showContractForm)}
            className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
          >
            + Создать договор
          </button>
        </div>

        {showContractForm && (
          <form onSubmit={handleAddContract} className="border rounded-xl p-4 mb-4 bg-gray-50 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="Номер договора *" value={contractForm.contract_number} onChange={e => setContractForm({...contractForm, contract_number: e.target.value})} className="px-3 py-2 border rounded-lg" />
              <input required type="date" value={contractForm.contract_date} onChange={e => setContractForm({...contractForm, contract_date: e.target.value})} className="px-3 py-2 border rounded-lg" />
              <select value={contractEventId} onChange={e => setContractEventId(e.target.value)} className="px-3 py-2 border rounded-lg">
                <option value="">Спектакль (необязательно)</option>
                {events.map((ev: any) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.show?.title || 'Спектакль'} — {new Date(ev.event_date).toLocaleDateString('ru-RU')} ({ev.city?.name})
                  </option>
                ))}
              </select>
              <input type="number" required min={1} placeholder="Кол-во билетов *" value={contractForm.tickets_count || ''} onChange={e => setContractForm({...contractForm, tickets_count: Number(e.target.value)})} className="px-3 py-2 border rounded-lg" />
              <input type="number" required min={0} step={0.01} placeholder="Цена за билет *" value={contractForm.ticket_price || ''} onChange={e => setContractForm({...contractForm, ticket_price: Number(e.target.value)})} className="px-3 py-2 border rounded-lg" />
              <input type="number" min={0} max={100} placeholder="Скидка %" value={contractForm.discount_percent || ''} onChange={e => setContractForm({...contractForm, discount_percent: Number(e.target.value)})} className="px-3 py-2 border rounded-lg" />
            </div>
            {contractForm.tickets_count > 0 && contractForm.ticket_price > 0 && (
              <div className="text-sm text-gray-600 bg-white border rounded-lg p-3">
                Сумма: <strong>{(contractForm.tickets_count * contractForm.ticket_price).toLocaleString('ru-RU')} ₽</strong>
                {contractForm.discount_percent > 0 && (
                  <> | Скидка: {((contractForm.tickets_count * contractForm.ticket_price * contractForm.discount_percent) / 100).toLocaleString('ru-RU')} ₽ | Итого: <strong className="text-green-600">{((contractForm.tickets_count * contractForm.ticket_price) * (1 - contractForm.discount_percent / 100)).toLocaleString('ru-RU')} ₽</strong></>
                )}
              </div>
            )}
            <textarea placeholder="Примечания" value={contractForm.notes} onChange={e => setContractForm({...contractForm, notes: e.target.value})} className="w-full px-3 py-2 border rounded-lg" rows={2} />
            <div className="flex gap-2">
              <button type="submit" disabled={savingContract} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
                {savingContract ? 'Сохранение...' : 'Создать договор'}
              </button>
              <button type="button" onClick={() => setShowContractForm(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-100">Отмена</button>
            </div>
          </form>
        )}

        {contracts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b text-xs text-gray-500 uppercase">
                  <th className="text-left py-3 px-2">Номер</th>
                  <th className="text-left py-3 px-2">Дата</th>
                  <th className="text-left py-3 px-2">Спектакль</th>
                  <th className="text-left py-3 px-2">Билеты</th>
                  <th className="text-left py-3 px-2">Сумма</th>
                  <th className="text-left py-3 px-2">Оплата</th>
                  <th className="text-left py-3 px-2">Статус</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c: any) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium">{c.contract_number}</td>
                    <td className="py-3 px-2 text-sm">{new Date(c.contract_date).toLocaleDateString('ru-RU')}</td>
                    <td className="py-3 px-2 text-sm">{c.event?.show?.title || '—'}</td>
                    <td className="py-3 px-2 text-sm">{c.tickets_count || '—'}</td>
                    <td className="py-3 px-2 text-sm font-semibold">{Number(c.final_amount).toLocaleString('ru-RU')} ₽</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 text-xs rounded-md font-medium ${
                        c.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                        c.payment_status === 'overdue' ? 'bg-red-100 text-red-700' :
                        c.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {PaymentStatusLabels[c.payment_status as keyof typeof PaymentStatusLabels] || c.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 text-xs rounded-md font-medium ${
                        c.status === 'signed' || c.status === 'active' ? 'bg-green-100 text-green-700' :
                        c.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                        c.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {ContractStatusLabels[c.status as keyof typeof ContractStatusLabels] || c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 py-4 text-center">Договоров пока нет</p>
        )}
      </div>
      </div>
      </main></div>
    </div>
  );
}
