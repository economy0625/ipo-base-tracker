export type StockGroup = "S" | "A" | "B" | "C" | "D";

export type Market = "KOSDAQ" | "KOSPI" | "KONEX";

export type VolumeSignal = "강함" | "보통" | "약함";

export type PatternStatus =
  | "NONE"
  | "FORMING_CUP"
  | "FORMING_HANDLE"
  | "READY"
  | "BREAKOUT"
  | "FAILED";

export type SignalType =
  | "BREAKOUT"
  | "VOLUME_SPIKE"
  | "MA_RECOVERY"
  | "GROUP_UPGRADE"
  | "GROUP_DOWNGRADE"
  | "RISK_ALERT";

export type SignalStrength = "HIGH" | "MEDIUM" | "LOW";

export type Company = {
  stock_code: string;
  company_name: string;
  market: Market;
  listing_date: string;
  ipo_price: number;
  adjusted_ipo_price: number;
  industry: string;
  theme_tags: string[];
  business_summary: string;
  is_spac: boolean;
  is_transfer_listing: boolean;
  is_spac_merger: boolean;
  is_tech_special: boolean;
  is_bio: boolean;
};

export type DailyPrice = {
  stock_code: string;
  trade_date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjusted_close: number;
  volume: number;
  trading_value: number;
};

export type IpoMetrics = {
  current_price: number;
  return_vs_ipo: number | null;
  post_listing_high: number;
  post_listing_low: number;
  drawdown_from_high: number;
  rebound_from_low: number;
  days_since_listing: number;
  ma20: number;
  ma60: number;
  ma120: number;
  volume_ratio_20d: number;
  ipo_price_available?: boolean;
};

export type GroupScore = {
  current_group: StockGroup;
  total_score: number;
  chart_score: number;
  volume_score: number;
  financial_score: number;
  business_score: number;
  risk_score: number;
  group_reason: string;
  is_manual: boolean;
};

export type CupHandlePattern = {
  cup_left_peak_date: string | null;
  cup_left_peak_price: number | null;
  cup_low_date: string | null;
  cup_low_price: number | null;
  cup_depth_percent: number | null;
  base_days: number;
  handle_start_date: string | null;
  handle_end_date: string | null;
  handle_depth_percent: number | null;
  pivot_price: number | null;
  breakout_date: string | null;
  breakout_close: number | null;
  breakout_volume_ratio: number | null;
  breakout_maintained_days: number;
  pattern_status: PatternStatus;
};

export type Financial = {
  stock_code: string;
  fiscal_year: number;
  quarter: 1 | 2 | 3 | 4 | null;
  revenue: number | null;
  operating_profit: number | null;
  net_income: number | null;
  operating_margin: number | null;
  revenue_growth: number | null;
  operating_profit_growth: number | null;
  debt_ratio: number | null;
  cash_and_equivalents: number | null;
};

export type Signal = {
  id: string;
  stock_code: string;
  signal_date: string;
  signal_type: SignalType;
  strength: SignalStrength;
  title: string;
  description: string;
  related_group: StockGroup | null;
  is_active: boolean;
};

export type DatabaseSignal = {
  stock_code: string;
  signal_date: string;
  signal_type: string;
  strength: "low" | "medium" | "high" | null;
  current_group: StockGroup | null;
  close_price: number | null;
  volume: number | null;
  description: string | null;
};

export type StockDetail = {
  company: Company;
  latest_price: DailyPrice | null;
  metrics: IpoMetrics | null;
  group_score: GroupScore | null;
  cup_handle_pattern: CupHandlePattern | null;
  financials: Financial[];
  signals: Signal[];
};

export type IpoStock = {
  code: string;
  name: string;
  market: "KOSDAQ";
  listedAt: string;
  group: StockGroup;
  currentPrice: number;
  ipoPrice: number;
  changeRate: number;
  baseStatus: string;
  volumeSignal: VolumeSignal;
  movingAverageStatus: string;
  businessSummary: string;
};

export type DashboardMetric = {
  label: string;
  value: string;
  description: string;
};
