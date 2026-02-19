'use client';

import { useState, useEffect } from 'react';

interface AnalyticsData {
  summary: {
    totalEvents: number;
    futureEvents: number;
    pastEvents: number;
    totalDrafts: number;
    signedDrafts: number;
    negotiatingDrafts: number;
    signingDrafts: number;
  };
  payments: {
    total: number;
    paid: number;
    unpaid: number;
    overdue: number;
    totalAmount: number;
    paidAmount: number;
    unpaidAmount: number;
  };
  eventsByCity: Record<string, number>;
  eventsByMonth: Record<string, number>;
  eventsByStatus: {
    negotiating: number;
    signing: number;
    signed: number;
  };
}

export default function OrgotdelAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const res = await fetch('/api/orgotdel/analytics');
      if (res.ok) {
        setData(await res.json());
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', { 
      style: 'currency', 
      currency: 'RUB', 
      maximumFractionDigits: 0 
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        Не удалось загрузить аналитику
      </div>
    );
  }

  const sortedCities = Object.entries(data.eventsByCity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const sortedMonths = Object.entries(data.eventsByMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12);

  const maxCityValue = Math.max(...sortedCities.map(([, v]) => v), 1);
  const maxMonthValue = Math.max(...sortedMonths.map(([, v]) => v), 1);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-3xl font-bold text-gray-900">{data.summary.totalEvents}</div>
          <div className="text-sm text-gray-500">Всего событий</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-blue-700">{data.summary.futureEvents}</div>
          <div className="text-sm text-blue-600">Будущих</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-green-700">{data.eventsByStatus.signed}</div>
          <div className="text-sm text-green-600">Подписано</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-yellow-700">{data.summary.negotiatingDrafts}</div>
          <div className="text-sm text-yellow-600">В работе</div>
        </div>
      </div>

      {/* Drafts Pipeline */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Воронка сведения</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Договариваемся</span>
              <span className="font-medium text-yellow-600">{data.summary.negotiatingDrafts}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-yellow-500 rounded-full" 
                style={{ width: `${(data.summary.negotiatingDrafts / (data.summary.totalDrafts || 1)) * 100}%` }}
              />
            </div>
          </div>
          <div className="text-2xl text-gray-300">→</div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Подписание</span>
              <span className="font-medium text-blue-600">{data.summary.signingDrafts}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full" 
                style={{ width: `${(data.summary.signingDrafts / (data.summary.totalDrafts || 1)) * 100}%` }}
              />
            </div>
          </div>
          <div className="text-2xl text-gray-300">→</div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Подписано</span>
              <span className="font-medium text-green-600">{data.summary.signedDrafts}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 rounded-full" 
                style={{ width: `${(data.summary.signedDrafts / (data.summary.totalDrafts || 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Payments Summary */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Платежи</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <div className="text-2xl font-bold text-gray-900">{data.payments.total}</div>
            <div className="text-sm text-gray-500">Всего платежей</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{data.payments.paid}</div>
            <div className="text-sm text-gray-500">Оплачено</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">{data.payments.unpaid}</div>
            <div className="text-sm text-gray-500">К оплате</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{data.payments.overdue}</div>
            <div className="text-sm text-gray-500">Просрочено</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div>
            <div className="text-xl font-bold text-gray-900">{formatAmount(data.payments.totalAmount)}</div>
            <div className="text-sm text-gray-500">Общая сумма</div>
          </div>
          <div>
            <div className="text-xl font-bold text-green-600">{formatAmount(data.payments.paidAmount)}</div>
            <div className="text-sm text-gray-500">Оплачено</div>
          </div>
          <div>
            <div className="text-xl font-bold text-yellow-600">{formatAmount(data.payments.unpaidAmount)}</div>
            <div className="text-sm text-gray-500">К оплате</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events by City */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">События по городам</h3>
          <div className="space-y-3">
            {sortedCities.map(([city, count]) => (
              <div key={city}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700">{city}</span>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 rounded-full" 
                    style={{ width: `${(count / maxCityValue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {sortedCities.length === 0 && (
              <div className="text-center py-4 text-gray-400">Нет данных</div>
            )}
          </div>
        </div>

        {/* Events by Month */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">События по месяцам</h3>
          <div className="space-y-3">
            {sortedMonths.map(([month, count]) => (
              <div key={month}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700">{month}</span>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full" 
                    style={{ width: `${(count / maxMonthValue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {sortedMonths.length === 0 && (
              <div className="text-center py-4 text-gray-400">Нет данных</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
