'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface EventSalesTarget {
  event_id: string;
  show_title: string;
  city_name: string;
  event_date: string;
  target_tickets: number;
  sold_tickets: number;
  target_revenue: number;
  actual_revenue: number;
  progress_percent: number;
}

interface SalesTargetWidgetProps {
  className?: string;
}

export default function SalesTargetWidget({ className = '' }: SalesTargetWidgetProps) {
  const [targets, setTargets] = useState<EventSalesTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month'>('week');

  useEffect(() => {
    loadTargets();
  }, [period]);

  async function loadTargets() {
    setLoading(true);
    
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + (period === 'week' ? 7 : 30));
    
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1); // Monday
    
    // Get upcoming events
    const { data: events } = await supabase
      .from('events')
      .select(`
        id, event_date, total_tickets, sold_tickets,
        show:shows(title),
        city:cities(name)
      `)
      .gte('event_date', today.toISOString().split('T')[0])
      .lte('event_date', endDate.toISOString().split('T')[0])
      .in('status', ['planned', 'on_sale'])
      .order('event_date');
    
    if (!events) {
      setLoading(false);
      return;
    }
    
    // Get sales data for these events (this week)
    const eventIds = events.map(e => e.id);
    
    const { data: deals } = await supabase
      .from('deals')
      .select('event_id, amount, tickets_count, status, closed_at')
      .in('event_id', eventIds)
      .eq('status', 'won')
      .gte('closed_at', weekStart.toISOString());
    
    // Calculate targets (assuming target is remaining tickets to sell)
    const targetsData: EventSalesTarget[] = events.map(event => {
      const eventDeals = deals?.filter(d => d.event_id === event.id) || [];
      const soldThisWeek = eventDeals.reduce((sum, d) => sum + (d.tickets_count || 0), 0);
      const revenueThisWeek = eventDeals.reduce((sum, d) => sum + (d.amount || 0), 0);
      
      const totalTickets = event.total_tickets || 100;
      const alreadySold = event.sold_tickets || 0;
      const remaining = totalTickets - alreadySold;
      
      // Weekly target: remaining tickets / weeks until event
      const eventDate = new Date(event.event_date);
      const daysUntilEvent = Math.max(1, Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
      const weeksUntilEvent = Math.max(1, Math.ceil(daysUntilEvent / 7));
      const weeklyTarget = Math.ceil(remaining / weeksUntilEvent);
      
      const progress = weeklyTarget > 0 ? Math.round((soldThisWeek / weeklyTarget) * 100) : 100;
      
      const showData = Array.isArray(event.show) ? event.show[0] : event.show;
      const cityData = Array.isArray(event.city) ? event.city[0] : event.city;
      
      return {
        event_id: event.id,
        show_title: showData?.title || 'Спектакль',
        city_name: cityData?.name || '',
        event_date: event.event_date,
        target_tickets: weeklyTarget,
        sold_tickets: soldThisWeek,
        target_revenue: weeklyTarget * 5000, // Average ticket price assumption
        actual_revenue: revenueThisWeek,
        progress_percent: Math.min(progress, 100),
      };
    });
    
    setTargets(targetsData);
    setLoading(false);
  }

  function getProgressColor(percent: number): string {
    if (percent >= 100) return 'bg-green-500';
    if (percent >= 75) return 'bg-blue-500';
    if (percent >= 50) return 'bg-yellow-500';
    if (percent >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-xl p-6 shadow-sm ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm ${className}`}>
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">План продаж</h3>
            <p className="text-sm text-gray-500">Прогресс по спектаклям за неделю</p>
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setPeriod('week')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                period === 'week' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
            >
              Неделя
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                period === 'month' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
            >
              Месяц
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {targets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🎭</div>
            <p>Нет спектаклей на этот период</p>
          </div>
        ) : (
          <div className="space-y-4">
            {targets.map((target) => (
              <div key={target.event_id} className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{target.show_title}</h4>
                    <p className="text-sm text-gray-500">
                      {target.city_name} • {new Date(target.event_date).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {target.sold_tickets} / {target.target_tickets}
                    </div>
                    <div className="text-xs text-gray-500">билетов за неделю</div>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`absolute inset-y-0 left-0 ${getProgressColor(target.progress_percent)} transition-all duration-500`}
                    style={{ width: `${target.progress_percent}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-sm font-medium ${
                    target.progress_percent >= 100 ? 'text-green-600' :
                    target.progress_percent >= 50 ? 'text-blue-600' : 'text-orange-600'
                  }`}>
                    {target.progress_percent}% выполнено
                  </span>
                  <span className="text-sm text-gray-500">
                    {target.actual_revenue.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Summary */}
      {targets.length > 0 && (
        <div className="p-6 border-t bg-gray-50 rounded-b-xl">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {targets.reduce((sum, t) => sum + t.sold_tickets, 0)}
              </div>
              <div className="text-xs text-gray-500">Продано билетов</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {targets.reduce((sum, t) => sum + t.target_tickets, 0)}
              </div>
              <div className="text-xs text-gray-500">План на неделю</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {targets.reduce((sum, t) => sum + t.actual_revenue, 0).toLocaleString('ru-RU')} ₽
              </div>
              <div className="text-xs text-gray-500">Выручка</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
