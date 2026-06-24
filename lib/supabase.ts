import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import {
  mockDailyPrices,
  mockStockDetails,
  mockStocks,
} from "@/lib/mock-data";
import type {
  Company,
  CupHandlePattern,
  DailyPrice,
  DatabaseSignal,
  GroupScore,
  IpoMetrics,
  IpoStock,
  StockDetail,
  StockGroup,
} from "@/types/stock";

export type DataSource = "supabase" | "mock";
export type DataConnectionStatus = "full" | "partial" | "mock";

export type DataResult<T> = {
  data: T;
  source: DataSource;
  connected: boolean;
  status: DataConnectionStatus;
  warnings: string[];
  error: string | null;
};

type CompanyRow = Company;
type MetricsRow = IpoMetrics & { stock_code: string };
type GroupScoreRow = GroupScore & { stock_code: string };
type PatternRow = CupHandlePattern & { stock_code: string };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: "no-store" });

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      global: { fetch: noStoreFetch },
    })
  : null;

const supabaseService: SupabaseClient | null =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: { fetch: noStoreFetch },
      })
    : null;

function mockResult<T>(data: T, error: string | null = null): DataResult<T> {
  return {
    data,
    source: "mock",
    connected: false,
    status: "mock",
    warnings: [],
    error,
  };
}

function supabaseResult<T>(
  data: T,
  warnings: string[] = [],
): DataResult<T> {
  return {
    data,
    source: "supabase",
    connected: true,
    status: warnings.length > 0 ? "partial" : "full",
    warnings,
    error: null,
  };
}

export function normalizeStockCode(value: unknown) {
  return String(value ?? "")
    .replace(/\.0$/, "")
    .trim()
    .padStart(6, "0");
}

function toNumber<T extends Record<string, unknown>>(row: T, key: keyof T) {
  const value = row[key];
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toNullableNumber<T extends Record<string, unknown>>(
  row: T,
  key: keyof T,
) {
  const value = row[key];
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeMetrics(metrics: IpoMetrics | null): IpoMetrics | null {
  if (!metrics) return null;
  return {
    current_price: toNumber(metrics, "current_price"),
    return_vs_ipo: toNullableNumber(metrics, "return_vs_ipo"),
    post_listing_high: toNumber(metrics, "post_listing_high"),
    post_listing_low: toNumber(metrics, "post_listing_low"),
    drawdown_from_high: toNumber(metrics, "drawdown_from_high"),
    rebound_from_low: toNumber(metrics, "rebound_from_low"),
    days_since_listing: Number(metrics.days_since_listing),
    ma20: toNumber(metrics, "ma20"),
    ma60: toNumber(metrics, "ma60"),
    ma120: toNumber(metrics, "ma120"),
    volume_ratio_20d: toNumber(metrics, "volume_ratio_20d"),
    ipo_price_available:
      "ipo_price_available" in metrics
        ? Boolean(metrics.ipo_price_available)
        : undefined,
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

function normalizePattern(pattern: CupHandlePattern | null) {
  if (!pattern) return null;
  return {
    ...pattern,
    cup_left_peak_price:
      pattern.cup_left_peak_price === null
        ? null
        : toNumber(pattern, "cup_left_peak_price"),
    cup_low_price:
      pattern.cup_low_price === null ? null : toNumber(pattern, "cup_low_price"),
    cup_depth_percent:
      pattern.cup_depth_percent === null
        ? null
        : toNumber(pattern, "cup_depth_percent"),
    base_days: Number(pattern.base_days),
    handle_depth_percent:
      pattern.handle_depth_percent === null
        ? null
        : toNumber(pattern, "handle_depth_percent"),
    pivot_price:
      pattern.pivot_price === null ? null : toNumber(pattern, "pivot_price"),
    breakout_close:
      pattern.breakout_close === null
        ? null
        : toNumber(pattern, "breakout_close"),
    breakout_volume_ratio:
      pattern.breakout_volume_ratio === null
        ? null
        : toNumber(pattern, "breakout_volume_ratio"),
    breakout_maintained_days: Number(pattern.breakout_maintained_days),
  };
}

function toStockDetail(
  row: CompanyRow,
  metrics: IpoMetrics | null,
  groupScore: GroupScore | null,
  pattern: CupHandlePattern | null,
): StockDetail {
  return {
    company: {
      stock_code: normalizeStockCode(row.stock_code),
      company_name: row.company_name,
      market: row.market,
      listing_date: row.listing_date,
      ipo_price: toNumber(row, "ipo_price"),
      adjusted_ipo_price: toNumber(row, "adjusted_ipo_price"),
      industry: row.industry,
      theme_tags: row.theme_tags ?? [],
      business_summary: row.business_summary ?? "",
      is_spac: row.is_spac,
      is_transfer_listing: row.is_transfer_listing,
      is_spac_merger: row.is_spac_merger,
      is_tech_special: row.is_tech_special,
      is_bio: row.is_bio,
    },
    latest_price: null,
    metrics,
    group_score: groupScore,
    cup_handle_pattern: pattern,
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
    currentPrice:
      detail.metrics?.current_price ?? detail.company.adjusted_ipo_price,
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

function buildMockSignals(): DatabaseSignal[] {
  const today = new Date().toISOString().slice(0, 10);
  return mockStockDetails
    .filter(
      (stock) =>
        (stock.metrics?.volume_ratio_20d ?? 0) >= 1.5 ||
        stock.group_score?.current_group === "S",
    )
    .map((stock) => ({
      stock_code: stock.company.stock_code,
      signal_date: today,
      signal_type:
        (stock.metrics?.volume_ratio_20d ?? 0) >= 1.5
          ? "거래량 급증"
          : "A→S 승격",
      strength:
        stock.group_score?.current_group === "S" ? "high" : "medium",
      current_group: stock.group_score?.current_group ?? "C",
      close_price:
        stock.metrics?.current_price ?? stock.company.adjusted_ipo_price,
      volume: Math.round((stock.metrics?.volume_ratio_20d ?? 0) * 100000),
      description:
        stock.group_score?.group_reason ?? "mock data 기반 신호입니다.",
    }));
}

export const getStockDetailsResult = cache(async function getStockDetailsResult(): Promise<
  DataResult<StockDetail[]>
> {
  const stockClient = supabaseService ?? supabase;

  if (!stockClient) {
    return mockResult(mockStockDetails, "Supabase 환경변수가 없습니다.");
  }

  const [companiesResult, metricsResult, groupsResult, patternsResult] =
    await Promise.all([
      stockClient
        .from("companies")
        .select("*")
        .order("listing_date", { ascending: false }),
      stockClient.from("ipo_metrics").select("*"),
      stockClient.from("group_scores").select("*"),
      stockClient.from("cup_handle_patterns").select("*"),
    ]);

  if (companiesResult.error || !companiesResult.data) {
    console.warn(
      "Supabase companies fallback:",
      companiesResult.error?.message,
    );
    return mockResult(
      mockStockDetails,
      companiesResult.error?.message ?? "companies 조회 실패",
    );
  }

  const warnings: string[] = [];
  if (metricsResult.error) {
    warnings.push(`ipo_metrics 조회 실패: ${metricsResult.error.message}`);
  } else if ((metricsResult.data?.length ?? 0) === 0) {
    warnings.push("ipo_metrics 데이터가 0행입니다.");
  }
  if (groupsResult.error) {
    warnings.push(`group_scores 조회 실패: ${groupsResult.error.message}`);
  } else if ((groupsResult.data?.length ?? 0) === 0) {
    warnings.push("group_scores 데이터가 0행입니다.");
  }

  const metricsMap = new Map(
    ((metricsResult.data ?? []) as unknown as MetricsRow[]).map((row) => [
      normalizeStockCode(row.stock_code),
      normalizeMetrics(row),
    ]),
  );
  const groupMap = new Map(
    ((groupsResult.data ?? []) as unknown as GroupScoreRow[]).map((row) => [
      normalizeStockCode(row.stock_code),
      normalizeGroupScore(row),
    ]),
  );
  const patternMap = new Map(
    ((patternsResult.data ?? []) as unknown as PatternRow[]).map((row) => [
      normalizeStockCode(row.stock_code),
      normalizePattern(row),
    ]),
  );

  const details = (companiesResult.data as unknown as CompanyRow[]).map(
    (company) => {
      const code = normalizeStockCode(company.stock_code);
      return toStockDetail(
        company,
        metricsMap.get(code) ?? null,
        groupMap.get(code) ?? null,
        patternMap.get(code) ?? null,
      );
    },
  );

  return supabaseResult(details, warnings);
});

export async function getStocksResult(): Promise<DataResult<IpoStock[]>> {
  const result = await getStockDetailsResult();
  return {
    ...result,
    data:
      result.source === "mock"
        ? mockStocks
        : result.data.map(toIpoStock),
  };
}

export const getSignalsResult = cache(async function getSignalsResult(): Promise<
  DataResult<DatabaseSignal[]>
> {
  const signalsClient = supabaseService ?? supabase;

  if (!signalsClient) {
    return mockResult(buildMockSignals(), "Supabase 환경변수가 없습니다.");
  }

  const { data, error } = await signalsClient
    .from("signals")
    .select(
      "stock_code,signal_date,signal_type,strength,current_group,close_price,volume,description",
    )
    .order("signal_date", { ascending: false });

  if (error || !data) {
    console.warn("Supabase signals fallback:", error?.message);
    return mockResult(buildMockSignals(), error?.message ?? "조회 실패");
  }

  const signals = data.map((row) => ({
    stock_code: normalizeStockCode(row.stock_code),
    signal_date: String(row.signal_date ?? ""),
    signal_type: String(row.signal_type ?? ""),
    strength:
      row.strength === "low" ||
      row.strength === "medium" ||
      row.strength === "high"
        ? row.strength
        : null,
    current_group:
      row.current_group === "S" ||
      row.current_group === "A" ||
      row.current_group === "B" ||
      row.current_group === "C" ||
      row.current_group === "D"
        ? row.current_group
        : null,
    close_price:
      row.close_price === null || row.close_price === undefined
        ? null
        : toNumber(row, "close_price"),
    volume:
      row.volume === null || row.volume === undefined
        ? null
        : toNumber(row, "volume"),
    description:
      row.description === null || row.description === undefined
        ? null
        : String(row.description),
  })) as DatabaseSignal[];

  return supabaseResult(signals);
});

export async function getDataMode(): Promise<DataConnectionStatus> {
  return (await getStockDetailsResult()).status;
}

export async function getStockDetails() {
  return (await getStockDetailsResult()).data;
}

export async function getStocks() {
  return (await getStocksResult()).data;
}

export async function getStockByCode(code: string) {
  const normalizedCode = normalizeStockCode(code);
  const stockClient = supabaseService ?? supabase;
  let stock: StockDetail | null = null;
  let source: DataSource = "mock";
  let status: DataConnectionStatus = "mock";

  if (stockClient) {
    const companiesResult = await stockClient.from("companies").select("*");

    if (!companiesResult.error && companiesResult.data) {
      const company = (companiesResult.data as unknown as CompanyRow[]).find(
        (row) => normalizeStockCode(row.stock_code) === normalizedCode,
      );

      if (!company) return null;

      const [metricsResult, groupResult, patternResult] = await Promise.all([
        stockClient.from("ipo_metrics").select("*"),
        stockClient.from("group_scores").select("*"),
        stockClient.from("cup_handle_patterns").select("*"),
      ]);

      const metricsRow = (
        (metricsResult.data ?? []) as unknown as MetricsRow[]
      ).find(
        (row) => normalizeStockCode(row.stock_code) === normalizedCode,
      );
      const groupRow = (
        (groupResult.data ?? []) as unknown as GroupScoreRow[]
      ).find(
        (row) => normalizeStockCode(row.stock_code) === normalizedCode,
      );
      const patternRow = (
        (patternResult.data ?? []) as unknown as PatternRow[]
      ).find(
        (row) => normalizeStockCode(row.stock_code) === normalizedCode,
      );

      stock = toStockDetail(
        company,
        metricsRow ? normalizeMetrics(metricsRow) : null,
        groupRow ? normalizeGroupScore(groupRow) : null,
        patternRow ? normalizePattern(patternRow) : null,
      );
      source = "supabase";
      status =
        metricsResult.error ||
        groupResult.error ||
        patternResult.error ||
        !metricsRow ||
        !groupRow ||
        !patternRow
          ? "partial"
          : "full";
    }
  }

  if (!stock) {
    const result = await getStockDetailsResult();
    stock =
      result.data.find(
        (item) => item.company.stock_code === normalizedCode,
      ) ?? null;
    source = result.source;
    status = result.status;
  }

  if (!stock) return null;

  let dailyPrices: DailyPrice[] | null = null;
  if (stockClient && source === "supabase") {
    const { data, error } = await stockClient
      .from("daily_prices")
      .select("*")
      .eq("stock_code", normalizedCode)
      .order("trade_date", { ascending: true });
    if (!error && data) {
      dailyPrices = (data as DailyPrice[]).map((price) => ({
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
  }

  return {
    stock,
    dailyPrices:
      dailyPrices ??
      (source === "mock"
        ? mockDailyPrices[normalizedCode] ?? []
        : []),
    source,
    status,
  };
}

export async function getStocksByGroupResult(group: StockGroup) {
  const result = await getStockDetailsResult();
  return {
    ...result,
    data: result.data.filter(
      (stock) => stock.group_score?.current_group === group,
    ),
  };
}

export async function getStocksByGroup(group: StockGroup) {
  return (await getStocksByGroupResult(group)).data;
}

export async function getSignals() {
  return (await getSignalsResult()).data;
}
