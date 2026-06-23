import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  mockDailyPrices,
  mockStockDetails,
  mockStocks,
} from "@/lib/mock-data";
import type {
  Company,
  CupHandlePattern,
  DailyPrice,
  GroupScore,
  IpoMetrics,
  IpoStock,
  Signal,
  StockDetail,
  StockGroup,
} from "@/types/stock";

type CompanyRow = Omit<Company, "market"> & {
  market: Company["market"];
};

type StockJoinedRow = CompanyRow & {
  ipo_metrics: IpoMetrics | null;
  group_scores: GroupScore | null;
  cup_handle_patterns: CupHandlePattern | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;

function toNumber<T extends Record<string, unknown>>(row: T, key: keyof T) {
  const value = row[key];
  return typeof value === "number" ? value : Number(value);
}

function normalizeMetrics(metrics: IpoMetrics | null): IpoMetrics | null {
  if (!metrics) return null;

  return {
    current_price: toNumber(metrics, "current_price"),
    return_vs_ipo: toNumber(metrics, "return_vs_ipo"),
    post_listing_high: toNumber(metrics, "post_listing_high"),
    post_listing_low: toNumber(metrics, "post_listing_low"),
    drawdown_from_high: toNumber(metrics, "drawdown_from_high"),
    rebound_from_low: toNumber(metrics, "rebound_from_low"),
    days_since_listing: Number(metrics.days_since_listing),
    ma20: toNumber(metrics, "ma20"),
    ma60: toNumber(metrics, "ma60"),
    ma120: toNumber(metrics, "ma120"),
    volume_ratio_20d: toNumber(metrics, "volume_ratio_20d"),
  };
}

function normalizeGroupScore(score: GroupScore | null): GroupScore | null {
  if (!score) return null;

  return {
    current_group: score.current_group,
    total_score: toNumber(score, "total_score"),
    chart_score: toNumber(score, "chart_score"),
    volume_score: toNumber(score, "volume_score"),
    financial_score: toNumber(score, "financial_score"),
    business_score: toNumber(score, "business_score"),
    risk_score: toNumber(score, "risk_score"),
    group_reason: score.group_reason,
    is_manual: score.is_manual,
  };
}

function normalizePattern(pattern: CupHandlePattern | null): CupHandlePattern | null {
  if (!pattern) return null;

  return {
    cup_left_peak_date: pattern.cup_left_peak_date,
    cup_left_peak_price:
      pattern.cup_left_peak_price === null ? null : toNumber(pattern, "cup_left_peak_price"),
    cup_low_date: pattern.cup_low_date,
    cup_low_price: pattern.cup_low_price === null ? null : toNumber(pattern, "cup_low_price"),
    cup_depth_percent:
      pattern.cup_depth_percent === null ? null : toNumber(pattern, "cup_depth_percent"),
    base_days: Number(pattern.base_days),
    handle_start_date: pattern.handle_start_date,
    handle_end_date: pattern.handle_end_date,
    handle_depth_percent:
      pattern.handle_depth_percent === null ? null : toNumber(pattern, "handle_depth_percent"),
    pivot_price: pattern.pivot_price === null ? null : toNumber(pattern, "pivot_price"),
    breakout_date: pattern.breakout_date,
    breakout_close:
      pattern.breakout_close === null ? null : toNumber(pattern, "breakout_close"),
    breakout_volume_ratio:
      pattern.breakout_volume_ratio === null
        ? null
        : toNumber(pattern, "breakout_volume_ratio"),
    breakout_maintained_days: Number(pattern.breakout_maintained_days),
    pattern_status: pattern.pattern_status,
  };
}

function toStockDetail(row: StockJoinedRow): StockDetail {
  const company: Company = {
    stock_code: row.stock_code,
    company_name: row.company_name,
    market: row.market,
    listing_date: row.listing_date,
    ipo_price: toNumber(row, "ipo_price"),
    adjusted_ipo_price: toNumber(row, "adjusted_ipo_price"),
    industry: row.industry,
    theme_tags: row.theme_tags,
    business_summary: row.business_summary,
    is_spac: row.is_spac,
    is_transfer_listing: row.is_transfer_listing,
    is_spac_merger: row.is_spac_merger,
    is_tech_special: row.is_tech_special,
    is_bio: row.is_bio,
  };

  return {
    company,
    latest_price: null,
    metrics: normalizeMetrics(row.ipo_metrics),
    group_score: normalizeGroupScore(row.group_scores),
    cup_handle_pattern: normalizePattern(row.cup_handle_patterns),
    financials: [],
    signals: [],
  };
}

function toIpoStock(detail: StockDetail): IpoStock {
  return {
    code: detail.company.stock_code,
    name: detail.company.company_name,
    market: "KOSDAQ",
    listedAt: detail.company.listing_date,
    group: detail.group_score?.current_group ?? "C",
    currentPrice: detail.metrics?.current_price ?? detail.company.adjusted_ipo_price,
    ipoPrice: detail.company.adjusted_ipo_price,
    changeRate: detail.metrics?.return_vs_ipo ?? 0,
    baseStatus: detail.group_score?.group_reason ?? "분류 전",
    volumeSignal:
      (detail.metrics?.volume_ratio_20d ?? 0) >= 1.7
        ? "강함"
        : (detail.metrics?.volume_ratio_20d ?? 0) >= 1
          ? "보통"
          : "약함",
    movingAverageStatus:
      detail.metrics && detail.metrics.current_price >= detail.metrics.ma20
        ? "20일선 위"
        : "20일선 아래",
    businessSummary: detail.company.business_summary,
  };
}

async function fetchStockDetailsFromSupabase() {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("companies")
    .select(
      `
      *,
      ipo_metrics (*),
      group_scores (*),
      cup_handle_patterns (*)
    `,
    )
    .order("listing_date", { ascending: false });

  if (error || !data) {
    console.warn("Supabase getStocks fallback:", error?.message);
    return null;
  }

  return (data as unknown as StockJoinedRow[]).map(toStockDetail);
}

async function fetchDailyPricesFromSupabase(code: string) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("daily_prices")
    .select("*")
    .eq("stock_code", code)
    .order("trade_date", { ascending: true });

  if (error || !data) {
    console.warn("Supabase daily_prices fallback:", error?.message);
    return null;
  }

  return (data as unknown as DailyPrice[]).map((price) => ({
    ...price,
    open: toNumber(price, "open"),
    high: toNumber(price, "high"),
    low: toNumber(price, "low"),
    close: toNumber(price, "close"),
    adjusted_close: toNumber(price, "adjusted_close"),
    volume: Number(price.volume),
    trading_value: toNumber(price, "trading_value"),
  }));
}

export async function getStockDetails() {
  const stocks = await fetchStockDetailsFromSupabase();
  return stocks && stocks.length > 0 ? stocks : mockStockDetails;
}

export async function getStocks() {
  const details = await getStockDetails();
  return details === mockStockDetails ? mockStocks : details.map(toIpoStock);
}

export async function getStockByCode(code: string) {
  const stocks = await getStockDetails();
  const stock = stocks.find((item) => item.company.stock_code === code) ?? null;

  if (!stock) return null;

  const dailyPrices =
    (await fetchDailyPricesFromSupabase(code)) ?? mockDailyPrices[code] ?? [];

  return {
    stock,
    dailyPrices,
  };
}

export async function getStocksByGroup(group: StockGroup) {
  const stocks = await getStockDetails();
  return stocks.filter((stock) => stock.group_score?.current_group === group);
}

export async function getSignals(): Promise<Signal[]> {
  const stocks = await getStockDetails();
  const today = new Date().toISOString().slice(0, 10);

  return stocks
    .filter((stock) => {
      const metrics = stock.metrics;
      const group = stock.group_score?.current_group;
      return (
        (metrics?.volume_ratio_20d ?? 0) >= 1.5 ||
        group === "S" ||
        stock.cup_handle_pattern?.pattern_status === "BREAKOUT"
      );
    })
    .map((stock) => ({
      id: `${stock.company.stock_code}-${today}`,
      stock_code: stock.company.stock_code,
      signal_date: today,
      signal_type:
        stock.cup_handle_pattern?.pattern_status === "BREAKOUT"
          ? "BREAKOUT"
          : (stock.metrics?.volume_ratio_20d ?? 0) >= 1.5
            ? "VOLUME_SPIKE"
            : "GROUP_UPGRADE",
      strength: (stock.group_score?.current_group === "S" ? "HIGH" : "MEDIUM") as Signal["strength"],
      title: stock.company.company_name,
      description: stock.group_score?.group_reason ?? "mock data 기반 신호",
      related_group: stock.group_score?.current_group ?? null,
      is_active: true,
    }));
}
