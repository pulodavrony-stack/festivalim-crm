'use client';

import * as F from '@/lib/calculator-formulas';
import type { CalcData } from '@/lib/calculator-formulas';

interface Props {
  data: CalcData;
  actual: Record<string, number>;
  comments: Record<string, string>;
  updateField: (field: keyof CalcData, value: number) => void;
  updateActual: (field: string, value: number) => void;
  updateComment: (field: string, value: string) => void;
}

function NumInput({ value, onChange, editable = true, className = '' }: { value: number; onChange?: (v: number) => void; editable?: boolean; className?: string }) {
  if (!editable) {
    return <span className={`font-medium ${className}`}>{F.fmtNum(value)}</span>;
  }
  return (
    <input
      type="number"
      value={value || ''}
      onChange={e => onChange?.(parseFloat(e.target.value) || 0)}
      className={`w-full px-2 py-1.5 border rounded-lg text-right bg-amber-50 focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm ${className}`}
    />
  );
}

function Row({ label, plan, fact, comment, planEditable = false, onPlanChange, onFactChange, onCommentChange, highlight, suffix = '₽' }: {
  label: string;
  plan: number;
  fact?: number;
  comment?: string;
  planEditable?: boolean;
  onPlanChange?: (v: number) => void;
  onFactChange?: (v: number) => void;
  onCommentChange?: (v: string) => void;
  highlight?: 'green' | 'red' | 'yellow' | 'purple';
  suffix?: string;
}) {
  const diff = fact !== undefined && fact > 0 ? fact - plan : null;
  const bgClass = highlight === 'green' ? 'bg-green-50' : highlight === 'red' ? 'bg-red-50' : highlight === 'yellow' ? 'bg-amber-50' : highlight === 'purple' ? 'bg-purple-50' : '';
  const formatted = suffix === '%' ? F.fmtPct(plan) : F.fmtRub(plan);

  return (
    <tr className={`border-b border-gray-100 hover:bg-gray-50/50 ${bgClass}`}>
      <td className="py-2 px-3 text-sm text-gray-700">{label}</td>
      <td className="py-2 px-3 text-right text-sm w-40">
        {planEditable ? (
          <NumInput value={plan} onChange={onPlanChange} />
        ) : (
          <span className="font-medium text-gray-900">{formatted}</span>
        )}
      </td>
      <td className="py-2 px-3 w-36">
        <input
          type="number"
          value={fact || ''}
          onChange={e => onFactChange?.(parseFloat(e.target.value) || 0)}
          className="w-full px-2 py-1.5 border rounded-lg text-right text-sm bg-blue-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="—"
        />
      </td>
      <td className="py-2 px-3 text-right text-sm w-28">
        {diff !== null && (
          <span className={diff > 0 ? 'text-red-600' : 'text-green-600'}>
            {diff > 0 ? '+' : ''}{suffix === '%' ? F.fmtPct(diff) : F.fmtRub(diff)}
          </span>
        )}
      </td>
      <td className="py-2 px-3 w-44">
        <input
          type="text"
          value={comment || ''}
          onChange={e => onCommentChange?.(e.target.value)}
          className="w-full px-2 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-gray-300 focus:border-gray-300"
          placeholder="Комментарий"
        />
      </td>
    </tr>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <tr className="bg-gray-100">
      <td colSpan={5} className="py-2.5 px-3 text-sm font-bold text-gray-800 uppercase tracking-wide">{title}</td>
    </tr>
  );
}

function TotalRow({ label, value, suffix = '₽', highlight }: { label: string; value: number; suffix?: string; highlight?: 'green' | 'red' | 'purple' }) {
  const color = highlight === 'green' ? 'text-green-700' : highlight === 'red' ? 'text-red-700' : highlight === 'purple' ? 'text-purple-700' : 'text-gray-900';
  const bg = highlight === 'green' ? 'bg-green-50' : highlight === 'red' ? 'bg-red-50' : highlight === 'purple' ? 'bg-purple-50' : 'bg-gray-50';
  return (
    <tr className={`border-b-2 border-gray-200 ${bg}`}>
      <td className={`py-2.5 px-3 text-sm font-bold ${color}`}>{label}</td>
      <td className={`py-2.5 px-3 text-right text-sm font-bold ${color}`}>
        {suffix === '%' ? F.fmtPct(value) : F.fmtRub(value)}
      </td>
      <td colSpan={3}></td>
    </tr>
  );
}

export default function BlockACalculator({ data, actual, comments, updateField, updateActual, updateComment }: Props) {
  const rev = F.calcPlannedRevenue(data);
  const margin = F.calcPlannedMargin(data);
  const marginPct = F.calcPlannedMarginPercent(data);

  return (
    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <div className="p-4 border-b bg-gradient-to-r from-red-50 to-amber-50">
        <h2 className="text-lg font-bold text-gray-900">📊 Калькулятор плановой маржинальной прибыли</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200 bg-gray-50">
              <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase">Показатель</th>
              <th className="py-2.5 px-3 text-right text-xs font-semibold text-gray-500 uppercase w-40">План</th>
              <th className="py-2.5 px-3 text-right text-xs font-semibold text-blue-500 uppercase w-36">Факт</th>
              <th className="py-2.5 px-3 text-right text-xs font-semibold text-gray-500 uppercase w-28">Откл.</th>
              <th className="py-2.5 px-3 text-left text-xs font-semibold text-gray-500 uppercase w-44">Комментарий</th>
            </tr>
          </thead>
          <tbody>
            {/* Параметры продаж */}
            <SectionHeader title="Параметры продаж" />
            <Row label="Кол-во билетов (план), шт." plan={data.total_tickets} planEditable onPlanChange={v => updateField('total_tickets', v)} fact={actual.total_tickets} onFactChange={v => updateActual('total_tickets', v)} comment={comments.total_tickets} onCommentChange={v => updateComment('total_tickets', v)} />
            <Row label="Средняя стоимость 1 билета" plan={data.avg_ticket_price} planEditable onPlanChange={v => updateField('avg_ticket_price', v)} fact={actual.avg_ticket_price} onFactChange={v => updateActual('avg_ticket_price', v)} comment={comments.avg_ticket_price} onCommentChange={v => updateComment('avg_ticket_price', v)} />
            <Row label="Доля продаж менеджеров, %" plan={data.manager_sales_share} planEditable onPlanChange={v => updateField('manager_sales_share', v)} suffix="%" fact={actual.manager_sales_share} onFactChange={v => updateActual('manager_sales_share', v)} comment={comments.manager_sales_share} onCommentChange={v => updateComment('manager_sales_share', v)} />
            <Row label="Доля продаж билетных платформ, %" plan={F.calcPlatformSalesShare(data)} suffix="%" comment={comments.platform_sales_share} onCommentChange={v => updateComment('platform_sales_share', v)} />
            <Row label="Скидка на продажи менеджеров, %" plan={data.manager_discount} planEditable onPlanChange={v => updateField('manager_discount', v)} suffix="%" comment={comments.manager_discount} onCommentChange={v => updateComment('manager_discount', v)} />
            <Row label="Доля билетов со скидкой, %" plan={data.discounted_tickets_share} planEditable onPlanChange={v => updateField('discounted_tickets_share', v)} suffix="%" comment={comments.discounted_tickets_share} onCommentChange={v => updateComment('discounted_tickets_share', v)} />

            {/* Расчётные показатели продаж */}
            <SectionHeader title="Расчётные показатели продаж" />
            <TotalRow label="Плановая выручка от продаж" value={rev} />
            <Row label="Выручка от менеджеров" plan={F.calcManagerRevenue(data)} comment={comments.manager_revenue} onCommentChange={v => updateComment('manager_revenue', v)} />
            <Row label="Выручка с билетных платформ" plan={F.calcPlatformRevenue(data)} comment={comments.platform_revenue} onCommentChange={v => updateComment('platform_revenue', v)} />
            <Row label="Кол-во билетов со скидкой, шт." plan={F.calcDiscountedTicketsCount(data)} suffix="" comment={comments.discounted_count} onCommentChange={v => updateComment('discounted_count', v)} />
            <Row label="Сумма скидок" plan={F.calcTotalDiscount(data)} comment={comments.total_discount} onCommentChange={v => updateComment('total_discount', v)} />

            {/* Комиссии */}
            <SectionHeader title="Расходы — комиссии продаж" />
            <Row label="% менеджерам от выручки" plan={data.manager_commission_percent} planEditable onPlanChange={v => updateField('manager_commission_percent', v)} suffix="%" comment={comments.manager_commission_percent} onCommentChange={v => updateComment('manager_commission_percent', v)} />
            <Row label="Комиссия менеджерам" plan={F.calcManagerCommission(data)} comment={comments.manager_commission} onCommentChange={v => updateComment('manager_commission', v)} />
            <Row label="% билетных платформ от выручки" plan={data.platform_commission_percent} planEditable onPlanChange={v => updateField('platform_commission_percent', v)} suffix="%" comment={comments.platform_commission_percent} onCommentChange={v => updateComment('platform_commission_percent', v)} />
            <Row label="Комиссия билетных платформ" plan={F.calcPlatformCommission(data)} comment={comments.platform_commission} onCommentChange={v => updateComment('platform_commission', v)} />

            {/* Смета */}
            <SectionHeader title="Смета спектакля" />
            <Row label="Аренда площадки" plan={data.venue_rent} planEditable onPlanChange={v => updateField('venue_rent', v)} fact={actual.venue_rent} onFactChange={v => updateActual('venue_rent', v)} comment={comments.venue_rent} onCommentChange={v => updateComment('venue_rent', v)} />
            <Row label="Гонорар артистов" plan={data.artist_fee} planEditable onPlanChange={v => updateField('artist_fee', v)} fact={actual.artist_fee} onFactChange={v => updateActual('artist_fee', v)} comment={comments.artist_fee} onCommentChange={v => updateComment('artist_fee', v)} />
            <Row label="Суточные артистам" plan={data.artist_per_diem} planEditable onPlanChange={v => updateField('artist_per_diem', v)} fact={actual.artist_per_diem} onFactChange={v => updateActual('artist_per_diem', v)} comment={comments.artist_per_diem} onCommentChange={v => updateComment('artist_per_diem', v)} />
            <Row label="Проезд артистам" plan={data.artist_travel} planEditable onPlanChange={v => updateField('artist_travel', v)} fact={actual.artist_travel} onFactChange={v => updateActual('artist_travel', v)} comment={comments.artist_travel} onCommentChange={v => updateComment('artist_travel', v)} />
            <Row label="Проживание артистов" plan={data.artist_accommodation} planEditable onPlanChange={v => updateField('artist_accommodation', v)} fact={actual.artist_accommodation} onFactChange={v => updateActual('artist_accommodation', v)} comment={comments.artist_accommodation} onCommentChange={v => updateComment('artist_accommodation', v)} />
            <Row label="СДЭК, доставка" plan={data.delivery_cdek} planEditable onPlanChange={v => updateField('delivery_cdek', v)} fact={actual.delivery_cdek} onFactChange={v => updateActual('delivery_cdek', v)} comment={comments.delivery_cdek} onCommentChange={v => updateComment('delivery_cdek', v)} />
            <Row label="Типография" plan={data.printing} planEditable onPlanChange={v => updateField('printing', v)} fact={actual.printing} onFactChange={v => updateActual('printing', v)} comment={comments.printing} onCommentChange={v => updateComment('printing', v)} />
            <Row label="Реквизит" plan={data.props} planEditable onPlanChange={v => updateField('props', v)} fact={actual.props} onFactChange={v => updateActual('props', v)} comment={comments.props} onCommentChange={v => updateComment('props', v)} />
            <Row label="Прочие расходы" plan={data.other_production_expenses} planEditable onPlanChange={v => updateField('other_production_expenses', v)} fact={actual.other_production_expenses} onFactChange={v => updateActual('other_production_expenses', v)} comment={comments.other_production_expenses} onCommentChange={v => updateComment('other_production_expenses', v)} />
            <TotalRow label="Итого смета" value={F.calcProductionBudget(data)} />

            {/* Реклама */}
            <SectionHeader title="Реклама и продвижение" />
            <Row label="Продвижение на бил. платформах" plan={data.platform_promotion} planEditable onPlanChange={v => updateField('platform_promotion', v)} fact={actual.platform_promotion} onFactChange={v => updateActual('platform_promotion', v)} comment={comments.platform_promotion} onCommentChange={v => updateComment('platform_promotion', v)} />
            <Row label="ВКонтакте" plan={data.vk_ads} planEditable onPlanChange={v => updateField('vk_ads', v)} fact={actual.vk_ads} onFactChange={v => updateActual('vk_ads', v)} comment={comments.vk_ads} onCommentChange={v => updateComment('vk_ads', v)} />
            <Row label="Одноклассники" plan={data.odnoklassniki_ads} planEditable onPlanChange={v => updateField('odnoklassniki_ads', v)} fact={actual.odnoklassniki_ads} onFactChange={v => updateActual('odnoklassniki_ads', v)} comment={comments.odnoklassniki_ads} onCommentChange={v => updateComment('odnoklassniki_ads', v)} />
            <Row label="Яндекс" plan={data.yandex_ads} planEditable onPlanChange={v => updateField('yandex_ads', v)} fact={actual.yandex_ads} onFactChange={v => updateActual('yandex_ads', v)} comment={comments.yandex_ads} onCommentChange={v => updateComment('yandex_ads', v)} />
            <Row label="Facebook" plan={data.facebook_ads} planEditable onPlanChange={v => updateField('facebook_ads', v)} fact={actual.facebook_ads} onFactChange={v => updateActual('facebook_ads', v)} comment={comments.facebook_ads} onCommentChange={v => updateComment('facebook_ads', v)} />
            <Row label="Посевы" plan={data.seeding_ads} planEditable onPlanChange={v => updateField('seeding_ads', v)} fact={actual.seeding_ads} onFactChange={v => updateActual('seeding_ads', v)} comment={comments.seeding_ads} onCommentChange={v => updateComment('seeding_ads', v)} />
            <Row label="Наружная реклама" plan={data.outdoor_ads} planEditable onPlanChange={v => updateField('outdoor_ads', v)} fact={actual.outdoor_ads} onFactChange={v => updateActual('outdoor_ads', v)} comment={comments.outdoor_ads} onCommentChange={v => updateComment('outdoor_ads', v)} />
            <Row label="Распространители" plan={data.distributors_ads} planEditable onPlanChange={v => updateField('distributors_ads', v)} fact={actual.distributors_ads} onFactChange={v => updateActual('distributors_ads', v)} comment={comments.distributors_ads} onCommentChange={v => updateComment('distributors_ads', v)} />
            <TotalRow label="Итого реклама" value={F.calcAdBudget(data)} />

            {/* Командировочные */}
            <SectionHeader title="Командировочные сотрудникам" />
            <Row label="Проезд сотрудников" plan={data.staff_travel} planEditable onPlanChange={v => updateField('staff_travel', v)} fact={actual.staff_travel} onFactChange={v => updateActual('staff_travel', v)} comment={comments.staff_travel} onCommentChange={v => updateComment('staff_travel', v)} />
            <Row label="Проживание сотрудников" plan={data.staff_accommodation} planEditable onPlanChange={v => updateField('staff_accommodation', v)} fact={actual.staff_accommodation} onFactChange={v => updateActual('staff_accommodation', v)} comment={comments.staff_accommodation} onCommentChange={v => updateComment('staff_accommodation', v)} />
            <Row label="Суточные сотрудников" plan={data.staff_per_diem} planEditable onPlanChange={v => updateField('staff_per_diem', v)} fact={actual.staff_per_diem} onFactChange={v => updateActual('staff_per_diem', v)} comment={comments.staff_per_diem} onCommentChange={v => updateComment('staff_per_diem', v)} />
            <TotalRow label="Итого командировочные" value={F.calcStaffTripBudget(data)} />

            {/* Прочие */}
            <SectionHeader title="Прочие расходы на организацию" />
            <Row label="Прочие расходы" plan={data.other_org_expenses} planEditable onPlanChange={v => updateField('other_org_expenses', v)} fact={actual.other_org_expenses} onFactChange={v => updateActual('other_org_expenses', v)} comment={comments.other_org_expenses} onCommentChange={v => updateComment('other_org_expenses', v)} />

            {/* Итоги */}
            <SectionHeader title="Итоговые показатели" />
            <TotalRow label="Всего расходов" value={F.calcTotalExpenses(data)} highlight="red" />
            <TotalRow label="Плановая маржа" value={margin} highlight={margin >= 0 ? 'green' : 'red'} />
            <TotalRow label="Маржинальность проекта" value={marginPct} suffix="%" highlight={marginPct >= 40 ? 'green' : marginPct >= 20 ? undefined : 'red'} />
          </tbody>
        </table>
      </div>

      {/* Pie chart */}
      <div className="p-6 border-t">
        <h3 className="text-sm font-bold text-gray-700 mb-4">Структура расходов</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Комиссии', value: F.calcManagerCommission(data) + F.calcPlatformCommission(data), color: 'bg-blue-500' },
            { label: 'Смета', value: F.calcProductionBudget(data), color: 'bg-orange-500' },
            { label: 'Реклама', value: F.calcAdBudget(data), color: 'bg-purple-500' },
            { label: 'Командировочные', value: F.calcStaffTripBudget(data), color: 'bg-green-500' },
          ].map(item => {
            const total = F.calcTotalExpenses(data);
            const pct = total > 0 ? (item.value / total) * 100 : 0;
            return (
              <div key={item.label} className="p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="text-xs font-medium text-gray-600">{item.label}</span>
                </div>
                <div className="text-lg font-bold text-gray-900">{F.fmtRub(item.value)}</div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                  <div className={`h-1.5 rounded-full ${item.color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
                <div className="text-xs text-gray-500 mt-1">{F.fmtPct(pct)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
