'use client';

import { useState, useCallback } from 'react';
import * as F from '@/lib/calculator-formulas';
import type { CalcData } from '@/lib/calculator-formulas';
import BlockACalculator from './BlockACalculator';
import BlockBUnitEconomics from './BlockBUnitEconomics';

interface ProjectCalculation {
  id?: string;
  project_name: string;
  city: string;
  event_date: string;
  plan_approval_date: string;
  status: string;
  actual_values: Record<string, number>;
  comments: Record<string, string>;
  [key: string]: unknown;
}

const defaultCalcData: CalcData = {
  total_tickets: 500,
  avg_ticket_price: 2000,
  manager_sales_share: 53,
  manager_discount: 5,
  discounted_tickets_share: 20,
  manager_commission_percent: 11,
  platform_commission_percent: 8,
  venue_rent: 0,
  artist_fee: 0,
  artist_per_diem: 0,
  artist_travel: 0,
  artist_accommodation: 0,
  delivery_cdek: 0,
  printing: 0,
  props: 0,
  other_production_expenses: 0,
  platform_promotion: 0,
  vk_ads: 0,
  odnoklassniki_ads: 0,
  yandex_ads: 0,
  facebook_ads: 0,
  seeding_ads: 0,
  outdoor_ads: 0,
  distributors_ads: 0,
  staff_travel: 0,
  staff_accommodation: 0,
  staff_per_diem: 0,
  other_org_expenses: 0,
  target_profitability: 45,
  variable_sales_cost_percent: 10,
  tax_percent: 1,
  venue_rent_percent: 8,
  production_cost_percent: 26,
  avg_tickets_per_deal: 2.0,
  conversion_to_sale: 30,
  conversion_to_qualified_lead: 80,
  conversion_site_to_request: 3,
};

interface Props {
  project?: ProjectCalculation;
  onSave: (data: ProjectCalculation) => void;
  onCancel: () => void;
  saving?: boolean;
}

export default function ProjectCalculatorForm({ project, onSave, onCancel, saving }: Props) {
  const [activeTab, setActiveTab] = useState<'a' | 'b'>('a');
  const [meta, setMeta] = useState({
    project_name: project?.project_name || '',
    city: project?.city || '',
    event_date: project?.event_date || '',
    plan_approval_date: project?.plan_approval_date || '',
    status: project?.status || 'draft',
  });

  const buildCalcFromProject = (p?: ProjectCalculation): CalcData => {
    if (!p) return { ...defaultCalcData };
    const d = { ...defaultCalcData };
    for (const key of Object.keys(d) as (keyof CalcData)[]) {
      if (p[key] !== undefined && p[key] !== null) {
        (d as Record<string, number>)[key] = Number(p[key]);
      }
    }
    return d;
  };

  const [data, setData] = useState<CalcData>(buildCalcFromProject(project));
  const [actual, setActual] = useState<Record<string, number>>(project?.actual_values || {});
  const [comments, setComments] = useState<Record<string, string>>(project?.comments || {});

  const updateField = useCallback((field: keyof CalcData, value: number) => {
    setData(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateActual = useCallback((field: string, value: number) => {
    setActual(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateComment = useCallback((field: string, value: string) => {
    setComments(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = () => {
    const payload: ProjectCalculation = {
      ...meta,
      ...data,
      actual_values: actual,
      comments,
    };
    if (project?.id) payload.id = project.id;
    onSave(payload);
  };

  const margin = F.calcPlannedMargin(data);
  const marginPct = F.calcPlannedMarginPercent(data);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название спектакля</label>
            <input
              type="text"
              value={meta.project_name}
              onChange={e => setMeta(p => ({ ...p, project_name: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg bg-amber-50 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Введите название"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Город</label>
            <input
              type="text"
              value={meta.city}
              onChange={e => setMeta(p => ({ ...p, city: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg bg-amber-50 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Город"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дата проведения</label>
            <input
              type="date"
              value={meta.event_date}
              onChange={e => setMeta(p => ({ ...p, event_date: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg bg-amber-50 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дата утверждения</label>
            <input
              type="date"
              value={meta.plan_approval_date}
              onChange={e => setMeta(p => ({ ...p, plan_approval_date: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg bg-amber-50 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
            <div className="text-sm text-blue-600 font-medium">Плановая выручка</div>
            <div className="text-2xl font-bold text-blue-900">{F.fmtRub(F.calcPlannedRevenue(data))}</div>
          </div>
          <div className={`p-4 rounded-xl border ${margin >= 0 ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200' : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'}`}>
            <div className={`text-sm font-medium ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>Плановая маржа</div>
            <div className={`text-2xl font-bold ${margin >= 0 ? 'text-green-900' : 'text-red-900'}`}>{F.fmtRub(margin)}</div>
          </div>
          <div className={`p-4 rounded-xl border ${marginPct >= 40 ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200' : marginPct >= 20 ? 'bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200' : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'}`}>
            <div className={`text-sm font-medium ${marginPct >= 40 ? 'text-green-600' : marginPct >= 20 ? 'text-amber-600' : 'text-red-600'}`}>Маржинальность</div>
            <div className={`text-2xl font-bold ${marginPct >= 40 ? 'text-green-900' : marginPct >= 20 ? 'text-amber-900' : 'text-red-900'}`}>{F.fmtPct(marginPct)}</div>
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('a')}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${activeTab === 'a' ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}
        >
          📊 Калькулятор проекта
        </button>
        <button
          onClick={() => setActiveTab('b')}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${activeTab === 'b' ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white text-gray-600 hover:bg-gray-100 border'}`}
        >
          📈 Юнит-экономика
        </button>
      </div>

      {/* Content */}
      {activeTab === 'a' ? (
        <BlockACalculator data={data} actual={actual} comments={comments} updateField={updateField} updateActual={updateActual} updateComment={updateComment} />
      ) : (
        <BlockBUnitEconomics data={data} updateField={updateField} />
      )}

      {/* Actions */}
      <div className="flex gap-3 sticky bottom-4">
        <button onClick={handleSave} disabled={saving || !meta.project_name} className="px-8 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 disabled:opacity-50 shadow-lg shadow-red-500/30 transition-all">
          {saving ? 'Сохранение...' : '💾 Сохранить расчёт'}
        </button>
        <button onClick={onCancel} className="px-6 py-3 bg-white text-gray-700 rounded-xl font-medium hover:bg-gray-100 border transition-all">
          Отмена
        </button>
      </div>
    </div>
  );
}
