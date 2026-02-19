'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, addMonths, isBefore } from 'date-fns';
import { ru } from 'date-fns/locale';

interface PaymentEvent {
  id: string;
  event_id: string;
  payment_type: 'prepayment' | 'final' | 'fee_prepayment' | 'fee_final';
  due_date: string;
  amount?: number;
  is_paid: boolean;
  paid_at?: string;
  events?: {
    id: string;
    title: string;
    city: string;
    hall: string;
    date: string;
  };
}

const paymentTypeLabels: Record<string, string> = {
  prepayment: 'Аванс (аренда)',
  final: 'Окончательный (аренда)',
  fee_prepayment: 'Аванс (гонорар)',
  fee_final: 'Окончательный (гонорар)',
};

const paymentTypeColors: Record<string, string> = {
  prepayment: 'bg-purple-100 text-purple-800',
  final: 'bg-indigo-100 text-indigo-800',
  fee_prepayment: 'bg-orange-100 text-orange-800',
  fee_final: 'bg-red-100 text-red-800',
};

export default function OrgotdelPayments() {
  const [payments, setPayments] = useState<PaymentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showPaid, setShowPaid] = useState(false);

  useEffect(() => {
    loadPayments();
  }, [currentMonth]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(addMonths(currentMonth, 2)), 'yyyy-MM-dd');
      
      const res = await fetch(`/api/orgotdel/payment-calendar?start_date=${start}&end_date=${end}`);
      if (res.ok) {
        setPayments(await res.json());
      }
    } catch (error) {
      console.error('Failed to load payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePaid = async (id: string, isPaid: boolean) => {
    try {
      const res = await fetch(`/api/orgotdel/payment-events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_paid: !isPaid }),
      });
      if (res.ok) {
        loadPayments();
      }
    } catch (error) {
      console.error('Failed to toggle payment:', error);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  const { overduePayments, upcomingPayments, paidPayments } = useMemo(() => {
    const overdue = payments.filter(p => !p.is_paid && p.due_date < today);
    const upcoming = payments.filter(p => !p.is_paid && p.due_date >= today);
    const paid = payments.filter(p => p.is_paid);
    return { overduePayments: overdue, upcomingPayments: upcoming, paidPayments: paid };
  }, [payments, today]);

  const totalUnpaid = useMemo(() => {
    return payments.filter(p => !p.is_paid).reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments]);

  const totalPaid = useMemo(() => {
    return payments.filter(p => p.is_paid).reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [payments]);

  const formatAmount = (amount?: number) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
          className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          ← Назад
        </button>
        <span className="text-lg font-semibold text-gray-700">
          Календарь оплат: {format(currentMonth, 'LLLL yyyy', { locale: ru })}
        </span>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          Вперёд →
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-700">{overduePayments.length}</div>
          <div className="text-sm text-red-600">Просрочено</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-yellow-700">{upcomingPayments.length}</div>
          <div className="text-sm text-yellow-600">Предстоит</div>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <div className="text-xl font-bold text-gray-900">{formatAmount(totalUnpaid)}</div>
          <div className="text-sm text-gray-500">К оплате</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-xl font-bold text-green-700">{formatAmount(totalPaid)}</div>
          <div className="text-sm text-green-600">Оплачено</div>
        </div>
      </div>

      {/* Overdue Payments */}
      {overduePayments.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-3 bg-red-100 border-b border-red-200">
            <h3 className="font-semibold text-red-800">⚠️ Просроченные платежи ({overduePayments.length})</h3>
          </div>
          <div className="divide-y divide-red-200">
            {overduePayments.map(payment => (
              <PaymentRow key={payment.id} payment={payment} onToggle={togglePaid} formatAmount={formatAmount} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Payments */}
      <div className="bg-white border rounded-lg overflow-hidden mb-6">
        <div className="px-4 py-3 bg-gray-50 border-b">
          <h3 className="font-semibold text-gray-900">Предстоящие платежи ({upcomingPayments.length})</h3>
        </div>
        <div className="divide-y">
          {upcomingPayments.map(payment => (
            <PaymentRow key={payment.id} payment={payment} onToggle={togglePaid} formatAmount={formatAmount} />
          ))}
          {upcomingPayments.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              Нет предстоящих платежей
            </div>
          )}
        </div>
      </div>

      {/* Paid Payments Toggle */}
      {paidPayments.length > 0 && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowPaid(!showPaid)}
            className="w-full px-4 py-3 bg-green-50 border-b flex items-center justify-between hover:bg-green-100"
          >
            <h3 className="font-semibold text-green-800">✓ Оплаченные ({paidPayments.length})</h3>
            <svg className={`w-5 h-5 text-green-600 transition-transform ${showPaid ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showPaid && (
            <div className="divide-y opacity-60">
              {paidPayments.map(payment => (
                <PaymentRow key={payment.id} payment={payment} onToggle={togglePaid} formatAmount={formatAmount} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PaymentRow({ 
  payment, 
  onToggle,
  formatAmount 
}: { 
  payment: PaymentEvent;
  onToggle: (id: string, isPaid: boolean) => void;
  formatAmount: (amount?: number) => string;
}) {
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = !payment.is_paid && payment.due_date < today;

  return (
    <div className={`p-4 flex items-center gap-4 ${isOverdue ? 'bg-red-50' : ''}`}>
      <button
        onClick={() => onToggle(payment.id, payment.is_paid)}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
          payment.is_paid 
            ? 'bg-green-500 border-green-500 text-white' 
            : 'border-gray-300 hover:border-green-500'
        }`}
      >
        {payment.is_paid && (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs ${paymentTypeColors[payment.payment_type]}`}>
            {paymentTypeLabels[payment.payment_type]}
          </span>
          <span className="font-medium text-gray-900 truncate">
            {payment.events?.title || 'Событие'}
          </span>
        </div>
        <div className="text-sm text-gray-500 mt-1">
          📍 {payment.events?.city || '—'} • 🏛️ {payment.events?.hall || '—'}
        </div>
      </div>

      <div className="text-right">
        <div className={`font-bold ${payment.is_paid ? 'text-green-600' : 'text-gray-900'}`}>
          {formatAmount(payment.amount)}
        </div>
        <div className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
          {isOverdue && '⚠️ '}
          {format(parseISO(payment.due_date), 'd MMM', { locale: ru })}
        </div>
      </div>
    </div>
  );
}
