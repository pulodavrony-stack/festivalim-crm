export interface CalcData {
  total_tickets: number;
  avg_ticket_price: number;
  manager_sales_share: number;
  manager_discount: number;
  discounted_tickets_share: number;
  manager_commission_percent: number;
  platform_commission_percent: number;
  venue_rent: number;
  artist_fee: number;
  artist_per_diem: number;
  artist_travel: number;
  artist_accommodation: number;
  delivery_cdek: number;
  printing: number;
  props: number;
  other_production_expenses: number;
  platform_promotion: number;
  vk_ads: number;
  odnoklassniki_ads: number;
  yandex_ads: number;
  facebook_ads: number;
  seeding_ads: number;
  outdoor_ads: number;
  distributors_ads: number;
  staff_travel: number;
  staff_accommodation: number;
  staff_per_diem: number;
  other_org_expenses: number;
  // Unit economics
  target_profitability: number;
  variable_sales_cost_percent: number;
  tax_percent: number;
  venue_rent_percent: number;
  production_cost_percent: number;
  avg_tickets_per_deal: number;
  conversion_to_sale: number;
  conversion_to_qualified_lead: number;
  conversion_site_to_request: number;
}

// ==================== БЛОК A ====================

export function calcPlatformSalesShare(d: CalcData) {
  return 100 - d.manager_sales_share;
}

export function calcPlannedRevenue(d: CalcData) {
  return d.total_tickets * d.avg_ticket_price;
}

export function calcManagerRevenue(d: CalcData) {
  return calcPlannedRevenue(d) * d.manager_sales_share / 100;
}

export function calcPlatformRevenue(d: CalcData) {
  return calcPlannedRevenue(d) * calcPlatformSalesShare(d) / 100;
}

export function calcDiscountedTicketsCount(d: CalcData) {
  return d.total_tickets * (d.manager_sales_share / 100) * (d.discounted_tickets_share / 100);
}

export function calcTotalDiscount(d: CalcData) {
  return calcDiscountedTicketsCount(d) * d.avg_ticket_price * (d.manager_discount / 100);
}

export function calcManagerCommission(d: CalcData) {
  return calcPlannedRevenue(d) * d.manager_commission_percent / 100;
}

export function calcPlatformCommission(d: CalcData) {
  return calcPlannedRevenue(d) * d.platform_commission_percent / 100;
}

export function calcProductionBudget(d: CalcData) {
  return d.venue_rent + d.artist_fee + d.artist_per_diem + d.artist_travel +
    d.artist_accommodation + d.delivery_cdek + d.printing + d.props + d.other_production_expenses;
}

export function calcAdBudget(d: CalcData) {
  return d.platform_promotion + d.vk_ads + d.odnoklassniki_ads + d.yandex_ads +
    d.facebook_ads + d.seeding_ads + d.outdoor_ads + d.distributors_ads;
}

export function calcStaffTripBudget(d: CalcData) {
  return d.staff_travel + d.staff_accommodation + d.staff_per_diem;
}

export function calcTotalExpenses(d: CalcData) {
  return calcManagerCommission(d) + calcPlatformCommission(d) + calcProductionBudget(d) +
    calcAdBudget(d) + calcStaffTripBudget(d) + d.other_org_expenses + calcTotalDiscount(d);
}

export function calcPlannedMargin(d: CalcData) {
  return calcPlannedRevenue(d) - calcTotalExpenses(d);
}

export function calcPlannedMarginPercent(d: CalcData) {
  const rev = calcPlannedRevenue(d);
  return rev > 0 ? (calcPlannedMargin(d) / rev) * 100 : 0;
}

// ==================== БЛОК B ====================

export function calcProfitAmount(d: CalcData) {
  return calcPlannedRevenue(d) * d.target_profitability / 100;
}

export function calcProfitPerTicket(d: CalcData) {
  return d.total_tickets > 0 ? calcProfitAmount(d) / d.total_tickets : 0;
}

export function calcExpensesExceptAds(d: CalcData) {
  const pct = d.variable_sales_cost_percent + d.tax_percent + d.venue_rent_percent + d.production_cost_percent;
  return (pct / 100) * calcPlannedRevenue(d);
}

export function calcExpensesPerTicket(d: CalcData) {
  return d.total_tickets > 0 ? calcExpensesExceptAds(d) / d.total_tickets : 0;
}

export function calcMaxAdBudget(d: CalcData) {
  return calcPlannedRevenue(d) - calcProfitAmount(d) - calcExpensesExceptAds(d);
}

export function calcMaxAdCostPerTicket(d: CalcData) {
  return d.total_tickets > 0 ? calcMaxAdBudget(d) / d.total_tickets : 0;
}

export function calcDealsCount(d: CalcData) {
  return d.avg_tickets_per_deal > 0 ? d.total_tickets / d.avg_tickets_per_deal : 0;
}

export function calcQualifiedLeadsNeeded(d: CalcData) {
  const conv = d.conversion_to_sale / 100;
  return conv > 0 ? calcDealsCount(d) / conv : 0;
}

export function calcCostPerQualifiedLead(d: CalcData) {
  const leads = calcQualifiedLeadsNeeded(d);
  return leads > 0 ? calcMaxAdBudget(d) / leads : 0;
}

export function calcTotalLeadsNeeded(d: CalcData) {
  const conv = d.conversion_to_qualified_lead / 100;
  return conv > 0 ? calcQualifiedLeadsNeeded(d) / conv : 0;
}

export function calcCostPerLead(d: CalcData) {
  const leads = calcTotalLeadsNeeded(d);
  return leads > 0 ? calcMaxAdBudget(d) / leads : 0;
}

export function calcSiteVisitsNeeded(d: CalcData) {
  const conv = d.conversion_site_to_request / 100;
  return conv > 0 ? calcTotalLeadsNeeded(d) / conv : 0;
}

export function calcCostPerView(d: CalcData) {
  const visits = calcSiteVisitsNeeded(d);
  return visits > 0 ? calcMaxAdBudget(d) / visits : 0;
}

// Точка безубыточности
export function calcMarginalProfitability(d: CalcData) {
  return 100 - d.variable_sales_cost_percent - d.platform_commission_percent - d.tax_percent;
}

export function calcFixedCosts(d: CalcData) {
  return calcProductionBudget(d) + calcAdBudget(d) + calcStaffTripBudget(d) + d.other_org_expenses;
}

export function calcBreakEvenTickets(d: CalcData) {
  const margProf = calcMarginalProfitability(d) / 100;
  const priceWithMargin = d.avg_ticket_price * margProf;
  return priceWithMargin > 0 ? Math.ceil(calcFixedCosts(d) / priceWithMargin) : 0;
}

export function calcBreakEvenPercent(d: CalcData) {
  return d.total_tickets > 0 ? (calcBreakEvenTickets(d) / d.total_tickets) * 100 : 0;
}

export function calcBreakEvenRevenue(d: CalcData) {
  return calcBreakEvenTickets(d) * d.avg_ticket_price;
}

// Форматирование
export function fmtNum(n: number, decimals = 0): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtRub(n: number): string {
  return fmtNum(n, 0) + ' ₽';
}

export function fmtPct(n: number): string {
  return fmtNum(n, 1) + '%';
}
