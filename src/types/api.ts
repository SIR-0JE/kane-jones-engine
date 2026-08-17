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

export interface TrueCostMarketerItem {
  customer: string;
  total_revenue: number;
  total_cost: number;
  total_gross_profit: number;
  total_cases_sold: number;
  invoices: number;
  gross_profit_pct: number;
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
  total_cost?: number;
  total_cost_embedded: number;
  net_gross_profit_loss: number;
  net_gross_margin_pct: number;
  total_operating_expenses: number;
  net_operating_profit_loss: number;
  net_operating_margin_pct?: number;
  product_returns_value: number;
  product_returns_qty: number;
  empties_returns_value: number;
  empties_returns_qty: number;
  return_rate: number;
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
