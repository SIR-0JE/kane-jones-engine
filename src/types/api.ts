export interface MetaData {
  client_id: string;
  client_display_name: string;
  period_label: string;
  audit_title?: string;
  currency_symbol: string;
  total_revenue: number;
  total_gross_profit: number;
  overall_margin_pct: number;
  date_range: {
    start: string | null;
    end: string | null;
  };
  total_invoices: number;
  total_anomalies: number;
  has_price_list?: boolean;
  price_list_source?: "current" | "carried_forward" | "none";
  price_list_source_period?: string | null;
  price_list_message?: string;
  price_list_status?: string;
  total_recoverable_leakage?: number;
  below_floor_items_count?: number;
  reconciled_invoices_count?: number;
  reconciliation_discrepancies_count?: number;
  loss_making_invoices_count?: number;
  loss_making_customers_count?: number;
  dominant_products_count?: number;
  volume_tier_counts?: {
    total: number;
    underpriced: number;
    overpriced: number;
    correct: number;
    total_revenue_impact: number;
  };
}

export interface MatchQuality {
  total_products: number;
  counts: {
    exact: number;
    fuzzy: number;
    manual_override: number;
    fuzzy_no_size_match: number;
    unmatched: number;
  };
  unmatched_products: string[];
}

export interface AnomalyItem {
  row: number | null;
  source_tab: string;
  reason: string;
  raw?: any;
}

export interface ReconciliationItem {
  invoice_no: string;
  source_tab: string;
  date: string;
  customer: string;
  gross_revenue: number;
  computed_line_revenue: number;
  diff: number;
  diff_pct: number;
  tolerance: number;
}

export interface LossMakingInvoiceItem {
  invoice_no: string;
  source_tab: string;
  date: string;
  customer: string;
  gross_revenue: number;
  invoice_cost: number;
  gross_profit: number;
  pct_profit?: any;
}

export interface CustomerMarginItem {
  customer: string;
  invoices: number;
  revenue: number;
  cost: number;
  gross_profit: number;
  margin_pct: number;
  pct_of_total_revenue: number;
  is_loss_making?: boolean | number;
}

export interface ProductRankingItem {
  product_raw: string;
  cases_sold: number;
  revenue: number;
  pct_of_total: number;
  is_dominant?: boolean | number;
}

export interface BelowFloorItem {
  product_raw: string;
  cases_sold: number;
  avg_rate_charged: number;
  distributor_price: number;
  gap_pct: number;
  revenue_opportunity: number;
}

export interface VolumeTierItem {
  source_tab?: string;
  row?: number;
  invoice_no: string;
  date?: string;
  customer: string;
  product_raw: string;
  quantity: number;
  rate: number;
  cost?: number;
  expected_tier: string;
  expected_price: number;
  price_diff: number;
  price_diff_pct: number;
  audit_result: "underpriced" | "overpriced" | "correct";
  revenue_impact: number;
  [key: string]: any;
}

export interface DailySummaryItem {
  date_only: string;
  revenue: number;
  gross_profit: number;
  invoices: number;
  margin_pct: number;
}

export interface WeeklySummaryItem {
  week: number;
  revenue: number;
  gross_profit: number;
  invoices: number;
  margin_pct: number;
}

export interface ConcentrationMetrics {
  top_n: number;
  top_n_revenue: number;
  total_revenue: number;
  top_n_pct: number;
}

export interface TrueCostProductItem {
  product_raw: string;
  cases_sold: number;
  revenue: number;
  tmp3f5d_cost: number;
  avg_selling_price: number;
  total_cost: number;
  price_diff: number;
  price_diff_pct: number;
  gross_profit: number;
  gross_profit_pct: number;
}

export interface CustomerInvoiceRecord {
  invoice_no: string;
  date?: string;
  cases_sold: number;
  revenue: number;
  total_cost: number;
  gross_profit: number;
  margin_pct: number;
  items_count?: number;
  products?: string;
}

export interface ProductMixItem {
  product_raw: string;
  cases_sold: number;
  revenue: number;
  pct_of_total_cases: number;
  avg_selling_price?: number;
  tmp3f5d_cost?: number;
  total_cost?: number;
  gross_profit?: number;
  gross_profit_pct?: number;
}

export interface TrueCostMarketerItem {
  customer: string;
  total_revenue: number;
  total_cost: number;
  total_gross_profit: number;
  total_cases_sold: number;
  invoices: number;
  gross_profit_pct: number;
  returns_value?: number;
  returns_count?: number;
  net_revenue?: number;
  is_marketer?: boolean;
  cases_target?: number;
  pct_of_target_met?: number;
  attributable_expenses?: number;
  net_marketer_profit?: number;
  invoices_list?: CustomerInvoiceRecord[];
  product_mix?: ProductMixItem[];
}





export interface SalesReturnsItemBreakdown {
  item_name: string;
  item_type: "Product" | "Empties" | string;
  qty_returned: number;
  value_returned: number;
  pct_of_total_returns: number;
}

export interface SalesReturnsCustomerBreakdown {
  customer: string;
  return_transactions: number;
  product_qty: number;
  product_val: number;
  empties_qty: number;
  empties_val: number;
  total_val: number;
  pct_of_total_returns: number;
  sales_revenue: number;
  return_rate_pct: number;
  risk_flag: string;
}

export interface SalesReturnsWeeklyTrend {
  week: string;
  date_range: string;
  return_transactions: number;
  product_val: number;
  empties_val: number;
  total_val: number;
}

export interface SalesReturnsAnalysis {
  total_returns_value: number;
  product_returns_value: number;
  product_returns_qty: number;
  empties_returns_value: number;
  empties_returns_qty: number;
  return_rate: number;
  items_breakdown: SalesReturnsItemBreakdown[];
  customers_breakdown: SalesReturnsCustomerBreakdown[];
  weekly_trend: SalesReturnsWeeklyTrend[];
  anomalies: any[];
}

export interface NetProfitBridgeData {
  gross_sales_revenue: number;
  total_sales_returns: number;
  net_sales_revenue: number;
  gross_product_cost?: number;
  gross_embedded_cost?: number;
  invoiced_cogs?: number;
  periodic_cogs?: number;
  purchases?: number;
  purchase_returns?: number;
  carriage_inwards?: number;
  carriage_outwards?: number;
  opening_inventory?: number;
  closing_inventory?: number;
  net_purchases?: number;
  total_cost?: number;
  net_cost?: number;
  cost_of_returns?: number;
  total_cost_embedded?: number;
  cogs?: number;
  gross_profit?: number;
  net_gross_profit_loss?: number;  // alias
  trading_account?: any;

  gross_margin_pct?: number;
  net_gross_margin_pct?: number;
  total_operating_expenses: number;
  other_income?: number;
  finance_costs?: number;
  net_profit?: number;
  net_operating_profit_loss?: number;  // alias
  net_operating_margin_pct?: number;
  net_margin_pct?: number;
  product_returns_value?: number;
  product_returns_qty?: number;
  empties_returns_value?: number;
  empties_returns_qty?: number;
  return_rate?: number;
  missing_cost_anomalies?: any[];
  /** Fix A: Names of the 7 ledger inputs that were not supplied by the caller.
   *  When non-empty, the corresponding figures were computed with 0.0 assumptions
   *  and MUST be shown as incomplete in the UI rather than as final values. */
  missing_accounting_fields?: string[];
}


export interface ExpenseItem {
  category: string;
  amount: number;
  source_row?: number;
  pct_of_total?: number;
}

export interface ExpensesAnalysis {
  total_expenses: number;
  categories: ExpenseItem[];
}

export interface PeakAdjustedMetrics {
  multiplier: number;
  is_active: boolean;
  peak_daily_velocity: number;
  peak_safety_stock: number;
  peak_reorder_point: number;
  peak_suggested_reorder_qty: number;
  peak_estimated_reorder_cost: number;
  peak_stock_cover_weeks: number | null;
}

export interface ProductStockHealth {
  product_name: string;
  product_key: string;
  current_stock: number;
  uom: string;
  unit_cost: number;
  capital_tied_up: number;
  units_sold_window: number;
  transactions_count: number;
  window_days: number;
  window_type: string;
  daily_velocity: number;
  lead_time_days: number;
  safety_stock: number;
  reorder_point: number;
  suggested_reorder_qty: number;
  estimated_reorder_cost: number;
  stock_cover_days: number | null;
  stock_cover_weeks: number | null;
  status: "Dead Stock" | "No Stock / No Sales" | "Critical (stock-out risk)" | "Low" | "Healthy" | "High / Monitor" | "Excess (capital tied up)" | string;
  status_order: number;
  action_recommendation: string;
  peak_adjusted: PeakAdjustedMetrics;
}

export interface StockHealthBandSummary {
  status: string;
  color: string;
  badge: string;
  sku_count: number;
  total_capital_tied_up: number;
  total_units: number;
}

export interface StockHealthSummary {
  total_active_skus: number;
  total_stock_value: number;
  critical_stock_out_count: number;
  dead_stock_count: number;
  dead_stock_capital: number;
  excess_stock_capital: number;
  slow_moving_capital: number;
  suggested_reorder_skus_count: number;
  suggested_reorder_units: number;
  suggested_reorder_cost: number;
}

export interface StockHealthData {
  as_of_date: string;
  lead_time_days: number;
  peak_config: {
    name: string;
    multiplier: number;
    is_active: boolean;
  };
  summary: StockHealthSummary;
  summary_bands: Record<string, StockHealthBandSummary>;
  top_stock_out_risk: ProductStockHealth[];
  slow_moving_stock: ProductStockHealth[];
  dead_stock: ProductStockHealth[];
  suggested_reorders: ProductStockHealth[];
  all_products: ProductStockHealth[];
}

export interface WeeklyPnL {
  gross_sales_revenue: number;
  total_sales_returns: number;
  product_returns_val: number;
  empties_returns_val: number;
  net_sales_revenue: number;
  cogs: number;
  gross_profit: number;
  gross_margin_pct: number;
  total_operating_expenses: number;
  net_profit: number;
  net_margin_pct: number;
  invoices_count: number;
  cases_sold: number;
  week_number?: number;
}

export interface WeeklyWoW {
  has_previous: boolean;
  previous_week_number?: number;
  revenue_diff: number;
  revenue_diff_pct: number;
  gross_profit_diff: number;
  gross_profit_diff_pct: number;
  net_profit_diff: number;
  net_profit_diff_pct: number;
  gross_margin_bps: number;
  invoices_diff: number;
  cases_diff: number;
}

export interface WeeklyDailyRow {
  date: string;
  day_name: string;
  invoices_count: number;
  gross_revenue: number;
  cogs: number;
  gross_profit: number;
  margin_pct: number;
}

export interface WeeklyTopProduct {
  product_raw: string;
  cases_sold: number;
  revenue: number;
  pct_of_week_revenue: number;
}

export interface WeeklyTopCustomer {
  customer: string;
  invoices_count: number;
  revenue: number;
  cogs: number;
  gross_profit: number;
  margin_pct: number;
  pct_of_week_revenue: number;
}

export interface WeeklyReturnItem {
  voucher_no: string;
  customer: string;
  item_name: string;
  item_type: string;
  quantity: number;
  return_value: number;
}

export interface WeeklyExpenseCategory {
  category: string;
  amount: number;
}

export interface WeeklyReportItem {
  week_number: number;
  week_label: string;
  date_range: {
    start: string;
    end: string;
  };
  calendar_days: number;
  pnl: WeeklyPnL;
  wow: WeeklyWoW;
  narrative_insight: string;
  daily_breakdown: WeeklyDailyRow[];
  top_products: WeeklyTopProduct[];
  top_customers: WeeklyTopCustomer[];
  returns: WeeklyReturnItem[];
  expenses: WeeklyExpenseCategory[];
}

export interface WeeklyFinancialsData {
  calendar_weeks: WeeklyReportItem[];
  trading_weeks: WeeklyReportItem[];
  active_mode: "calendar" | "trading" | string;
  period_summary: {
    total_weeks: number;
    period_start: string;
    period_end: string;
    total_calendar_days: number;
    total_revenue: number;
    total_gross_profit: number;
    total_operating_expenses: number;
    total_invoices: number;
  };
}

export interface AnalyzeResponse {
  client_id?: string;
  period_label?: string;
  audit_title?: string;
  meta: MetaData;
  match_quality: MatchQuality;
  anomalies: AnomalyItem[];
  reconciliation_discrepancies: ReconciliationItem[];
  loss_making_invoices: LossMakingInvoiceItem[];
  loss_making_customers: CustomerMarginItem[];
  dominant_products: ProductRankingItem[];
  below_floor_pricing: BelowFloorItem[];
  volume_tier_audit: VolumeTierItem[];
  daily_summary: DailySummaryItem[];
  weekly_summary: WeeklySummaryItem[];
  product_revenue_ranking: ProductRankingItem[];
  product_ranking?: ProductRankingItem[];
  customer_margin_detail: CustomerMarginItem[];
  concentration_metrics: ConcentrationMetrics;
  true_cost_products?: TrueCostProductItem[];
  true_cost_marketers?: TrueCostMarketerItem[];
  returns_analysis?: SalesReturnsAnalysis;
  expenses_analysis?: ExpensesAnalysis;
  net_profit_bridge?: NetProfitBridgeData;
  stock_health?: StockHealthData;
  weekly_financials?: WeeklyFinancialsData;
  [key: string]: any;
}

export interface MetricDiff {
  period_a: number;
  period_b: number;
  absolute_change: number;
  pct_change: number;
  formatted: string;
}

export interface MarginDiff {
  period_a: number;
  period_b: number;
  diff_pct_points: number;
  diff_bps: number;
  formatted: string;
}

export interface Top10Entrant {
  name: string;
  new_rank: number;
  previous_rank: number | null;
  revenue: number;
  label: string;
}

export interface Top10Dropout {
  name: string;
  previous_rank: number;
  new_rank: number | null;
  previous_revenue: number;
  label: string;
}

export interface ProductMovement {
  name: string;
  rank_a: number | null;
  rank_b: number | null;
  rank_shift: number | null;
  revenue_a: number;
  revenue_b: number;
  revenue_diff: number;
  revenue_pct_change: number;
  movement_label: string;
}

export interface CustomerMovement {
  name: string;
  rank_a: number | null;
  rank_b: number | null;
  rank_shift: number | null;
  revenue_a: number;
  revenue_b: number;
  revenue_diff: number;
  revenue_pct_change: number;
  movement_label: string;
}

export interface CompareResponse {
  granularity: "day" | "week" | "month";
  period_a_label: string;
  period_b_label: string;
  summary: {
    revenue: MetricDiff;
    gross_profit: MetricDiff;
    margin_pct: MarginDiff;
    invoices: MetricDiff;
  };
  product_movements: {
    movements: ProductMovement[];
    new_entrants_top10: Top10Entrant[];
    dropouts_top10: Top10Dropout[];
  };
  customer_movements: {
    movements: CustomerMovement[];
    new_entrants_top10: Top10Entrant[];
    dropouts_top10: Top10Dropout[];
  };
  highlights: string[];
}

export interface SnapshotSummary {
  period_label: string;
  audit_title: string;
  total_revenue: number;
  total_gross_profit: number;
  overall_margin_pct: number;
  total_invoices: number;
  total_recoverable_leakage?: number;
  below_floor_items_count?: number;
  loss_making_customers_count?: number;
  currency_symbol: string;
  net_profit_bridge?: NetProfitBridgeData;
  date_range?: {
    start: string | null;
    end: string | null;
  };
  created_at?: string;
}

export interface SnapshotsListResponse {
  client_id: string;
  snapshots: SnapshotSummary[];
  period_labels: string[];
}
