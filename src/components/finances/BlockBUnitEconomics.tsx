'use client';

import * as F from '@/lib/calculator-formulas';
import type { CalcData } from '@/lib/calculator-formulas';

interface Props {
  data: CalcData;
  updateField: (field: keyof CalcData, value: number) => void;
}

function InputRow({ label, value, onChange, suffix = '%' }: { label: string; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/50">
      <td className="py-2.5 px-3 text-sm text-gray-700">{label}</td>
      <td className="py-2.5 px-3 w-40">
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={value || ''}
            onChange={e => onChange(parseFloat(e.target.value) || 0)}
            className="w-full px-2 py-1.5 border rounded-lg text-right bg-amber-50 focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm"
            step="0.1"
          />
          <span className="text-xs text-gray-500 w-6">{suffix}</span>
        </div>
      </td>
    </tr>
  );
}

function ResultRow({ label, value, suffix = '₽', highlight }: { label: string; value: number; suffix?: string; highlight?: 'green' | 'purple' | 'red' }) {
  const color = highlight === 'green' ? 'text-green-700 bg-green-50' : highlight === 'purple' ? 'text-purple-700 bg-purple-50' : highlight === 'red' ? 'text-red-700 bg-red-50' : 'text-gray-900';
  const fmt = suffix === '%' ? F.fmtPct(value) : suffix === 'шт.' ? F.fmtNum(value, 0) + ' шт.' : F.fmtRub(value);
  return (
    <tr className={`border-b border-gray-100 ${highlight ? color : 'hover:bg-gray-50/50'}`}>
      <td className={`py-2.5 px-3 text-sm font-medium ${highlight ? '' : 'text-gray-700'}`}>{label}</td>
      <td className={`py-2.5 px-3 text-right text-sm font-bold w-40 ${highlight ? '' : 'text-gray-900'}`}>{fmt}</td>
    </tr>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <tr className="bg-gray-100">
      <td colSpan={2} className="py-2.5 px-3 text-sm font-bold text-gray-800 uppercase tracking-wide">{title}</td>
    </tr>
  );
}

const categoryMatrix = [
  { factor: 'Гонорар артистов', a1: 'До 100 тыс.', a2: '100–200 тыс.', a3: '200–300 тыс.', a4: '300–400 тыс.', a5: 'от 400 тыс.' },
  { factor: 'Удалённость города', a1: 'Удал. 3 (Омск, Новосибирск, Красноярск, Барнаул)', a2: 'Удал. 2 (ЕКБ, Челябинск, Тюмень, Самара, Уфа, ЮГ)', a3: 'Удал. 1 (Воронеж, НН, Ярославль, Минск, Казань)', a4: '—', a5: '—' },
  { factor: 'Прочие расходы', a1: 'Эконом', a2: 'Стандарт', a3: 'Стандарт + декорации', a4: 'VIP', a5: '—' },
  { factor: 'Общая сумма расхода', a1: 'до 200 тыс.', a2: '200–400 тыс.', a3: '400–600 тыс.', a4: '600–800 тыс.', a5: '800–1000+ тыс.' },
];

export default function BlockBUnitEconomics({ data, updateField }: Props) {
  const beTickets = F.calcBreakEvenTickets(data);
  const bePct = F.calcBreakEvenPercent(data);
  const beRev = F.calcBreakEvenRevenue(data);
  const maxAdBudget = F.calcMaxAdBudget(data);
  const costPerLead = F.calcCostPerLead(data);
  const salesProgressPct = data.total_tickets > 0 ? Math.min((beTickets / data.total_tickets) * 100, 100) : 0;

  return (
    <div className="space-y-6">
      {/* Unit Economics */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
          <h2 className="text-lg font-bold text-gray-900">📈 Юнит-экономика спектакля</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200 bg-gray-50">
                <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase">Показатель</th>
                <th className="py-2.5 px-3 text-right text-xs font-semibold text-gray-500 uppercase w-40">Значение</th>
              </tr>
            </thead>
            <tbody>
              <SectionHeader title="Входные параметры" />
              <InputRow label="Плановая рентабельность, %" value={data.target_profitability} onChange={v => updateField('target_profitability', v)} />
              <InputRow label="Переменный расход на продажу, %" value={data.variable_sales_cost_percent} onChange={v => updateField('variable_sales_cost_percent', v)} />
              <InputRow label="Налог (ООО/ИП), %" value={data.tax_percent} onChange={v => updateField('tax_percent', v)} />
              <InputRow label="Аренда зала (% от выручки)" value={data.venue_rent_percent} onChange={v => updateField('venue_rent_percent', v)} />
              <InputRow label="Расход на организацию (% от выручки)" value={data.production_cost_percent} onChange={v => updateField('production_cost_percent', v)} />
              <InputRow label="Среднее кол-во билетов в сделке" value={data.avg_tickets_per_deal} onChange={v => updateField('avg_tickets_per_deal', v)} suffix="шт." />
              <InputRow label="Конверсия в продажу, %" value={data.conversion_to_sale} onChange={v => updateField('conversion_to_sale', v)} />
              <InputRow label="Конверсия в квал. лида, %" value={data.conversion_to_qualified_lead} onChange={v => updateField('conversion_to_qualified_lead', v)} />
              <InputRow label="Конверсия с сайта в заявку, %" value={data.conversion_site_to_request} onChange={v => updateField('conversion_site_to_request', v)} />

              <SectionHeader title="Расчётные показатели" />
              <ResultRow label="Плановая выручка" value={F.calcPlannedRevenue(data)} />
              <ResultRow label="Норма прибыли (цель)" value={F.calcProfitAmount(data)} />
              <ResultRow label="Прибыль на 1 билет" value={F.calcProfitPerTicket(data)} />
              <ResultRow label="Расходы (кроме рекламных)" value={F.calcExpensesExceptAds(data)} />
              <ResultRow label="Расходы на 1 билет (кроме рекламы)" value={F.calcExpensesPerTicket(data)} />
              <ResultRow label="Предельная сумма на рекламу" value={maxAdBudget} highlight={maxAdBudget >= 0 ? 'green' : 'red'} />
              <ResultRow label="Макс. рекламный расход на 1 билет" value={F.calcMaxAdCostPerTicket(data)} />

              <SectionHeader title="Маркетинговая воронка" />
              <ResultRow label="Кол-во сделок (= клиентов)" value={F.calcDealsCount(data)} suffix="шт." />
              <ResultRow label="План по квал. лидам" value={F.calcQualifiedLeadsNeeded(data)} suffix="шт." />
              <ResultRow label="Стоимость 1 квал. лида" value={F.calcCostPerQualifiedLead(data)} />
              <ResultRow label="План по лидам (всего)" value={F.calcTotalLeadsNeeded(data)} suffix="шт." />
              <ResultRow label="Плановая стоимость лида (KPI)" value={costPerLead} highlight="purple" />
              <ResultRow label="Кол-во просмотров на сайте" value={F.calcSiteVisitsNeeded(data)} suffix="шт." />
              <ResultRow label="Стоимость просмотра" value={F.calcCostPerView(data)} />

              <SectionHeader title="Точка безубыточности (ТБУ)" />
              <ResultRow label="Рент-сть по марж. прибыли" value={F.calcMarginalProfitability(data)} suffix="%" />
              <ResultRow label="Постоянные расходы" value={F.calcFixedCosts(data)} />
              <ResultRow label="ТБУ в билетах" value={beTickets} suffix="шт." highlight="green" />
              <ResultRow label="ТБУ, % от плана" value={bePct} suffix="%" highlight="green" />
              <ResultRow label="ТБУ, руб." value={beRev} highlight="green" />
            </tbody>
          </table>
        </div>

        {/* Break-even progress */}
        <div className="p-6 border-t">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Прогресс до точки безубыточности</h3>
          <div className="relative w-full h-8 bg-gray-200 rounded-full overflow-hidden">
            <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-red-500 to-green-500 rounded-full transition-all" style={{ width: `${salesProgressPct}%` }} />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">
              ТБУ: {F.fmtNum(beTickets)} из {F.fmtNum(data.total_tickets)} билетов ({F.fmtPct(bePct)})
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0</span>
            <span>ТБУ ({F.fmtNum(beTickets)})</span>
            <span>План ({F.fmtNum(data.total_tickets)})</span>
          </div>
        </div>
      </div>

      {/* Category Matrix */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-gradient-to-r from-amber-50 to-orange-50">
          <h2 className="text-lg font-bold text-gray-900">📋 Справочная матрица — Категории спектаклей</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-200">
                <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500">Фактор</th>
                {['A1', 'A2', 'A3', 'A4', 'A5'].map(cat => (
                  <th key={cat} className="py-2.5 px-3 text-center text-xs font-bold text-gray-700">{cat}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {categoryMatrix.map((row, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2.5 px-3 font-medium text-gray-800">{row.factor}</td>
                  <td className="py-2.5 px-3 text-center text-xs text-gray-600 bg-green-50">{row.a1}</td>
                  <td className="py-2.5 px-3 text-center text-xs text-gray-600 bg-yellow-50">{row.a2}</td>
                  <td className="py-2.5 px-3 text-center text-xs text-gray-600 bg-orange-50">{row.a3}</td>
                  <td className="py-2.5 px-3 text-center text-xs text-gray-600 bg-red-50">{row.a4}</td>
                  <td className="py-2.5 px-3 text-center text-xs text-gray-600 bg-red-100">{row.a5}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
