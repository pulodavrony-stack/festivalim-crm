'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { CompanyTypeLabels, CompanyStatusLabels } from '@/types/b2b';
import type { CompanyType, CompanyStatus } from '@/types/b2b';

interface CompanyRow {
  id: string;
  name: string;
  legal_name?: string;
  company_type: CompanyType;
  inn?: string;
  phone?: string;
  status: CompanyStatus;
  total_contracts: number;
  total_revenue: number;
  created_at: string;
  city?: { name: string };
  manager?: { full_name: string };
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadCompanies = useCallback(async () => {
    try {
      let query = supabase
        .from('companies')
        .select(`
          id, name, legal_name, company_type, inn, phone, status,
          total_contracts, total_revenue, created_at,
          city:cities(name),
          manager:managers(full_name)
        `)
        .order('created_at', { ascending: false });

      if (search.trim()) {
        query = query.or(`name.ilike.%${search}%,inn.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setCompanies((data as any) || []);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  const statusColor = (s: CompanyStatus) => {
    if (s === 'active') return 'bg-green-100 text-green-700';
    if (s === 'blacklist') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-600';
  };

  const typeColor = (t: CompanyType) => {
    if (t === 'school') return 'bg-blue-100 text-blue-700';
    if (t === 'kindergarten') return 'bg-pink-100 text-pink-700';
    if (t === 'gov') return 'bg-amber-100 text-amber-700';
    if (t === 'corp') return 'bg-purple-100 text-purple-700';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Компании (B2B)</h1>
          <p className="text-sm text-gray-500 mt-1">{companies.length} компаний</p>
        </div>
        <Link
          href="/companies/new"
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-lg shadow-blue-500/20"
        >
          + Добавить компанию
        </Link>
      </div>

      {/* Search */}
      <div className="mb-5">
        <input
          type="text"
          placeholder="Поиск по названию, ИНН или телефону..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-lg px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🏢</p>
          <p className="text-gray-500 text-lg">Компаний пока нет</p>
          <Link
            href="/companies/new"
            className="inline-block mt-4 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
          >
            Добавить первую компанию
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Компания</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Тип</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Город</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Менеджер</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Договоров</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Выручка</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {companies.map((c) => (
                <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-5 py-4">
                    <Link href={`/companies/${c.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                      {c.name}
                    </Link>
                    {c.inn && <div className="text-xs text-gray-400 mt-0.5">ИНН: {c.inn}</div>}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${typeColor(c.company_type)}`}>
                      {CompanyTypeLabels[c.company_type] || c.company_type}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {(c.city as any)?.name || '—'}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {(c.manager as any)?.full_name || '—'}
                  </td>
                  <td className="px-5 py-4 text-sm font-medium text-gray-900">
                    {c.total_contracts}
                  </td>
                  <td className="px-5 py-4 text-sm font-semibold text-green-600">
                    {Number(c.total_revenue).toLocaleString('ru-RU')} ₽
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${statusColor(c.status)}`}>
                      {CompanyStatusLabels[c.status] || c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
