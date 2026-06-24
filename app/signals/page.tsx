import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { GroupBadge } from "@/components/stocks/GroupBadge";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  getSignalsResult,
  getStockDetailsResult,
} from "@/lib/supabase";
import type { DatabaseSignal } from "@/types/stock";

type SignalCountKey =
  | "ipo_price_recovery"
  | "ma20_recovery"
  | "ma60_recovery"
  | "ma120_recovery"
  | "volume_surge"
  | "b_to_a"
  | "a_to_s"
  | "pivot_break";

const signalCards: Array<{
  key: SignalCountKey;
  label: string;
}> = [
  { key: "ipo_price_recovery", label: "공모가 회복" },
  { key: "ma20_recovery", label: "20일선 회복" },
  { key: "ma60_recovery", label: "60일선 회복" },
  { key: "ma120_recovery", label: "120일선 회복" },
  { key: "volume_surge", label: "거래량 급증" },
  { key: "b_to_a", label: "B→A 승격" },
  { key: "a_to_s", label: "A→S 승격" },
  { key: "pivot_break", label: "피벗 이탈" },
];

const signalTypeMap: Record<string, SignalCountKey> = {
  "공모가 회복": "ipo_price_recovery",
  "20일선 회복": "ma20_recovery",
  "60일선 회복": "ma60_recovery",
  "120일선 회복": "ma120_recovery",
  "거래량 급증": "volume_surge",
  "B→A 승격": "b_to_a",
  "B->A 승격": "b_to_a",
  "A→S 승격": "a_to_s",
  "A->S 승격": "a_to_s",
  "피벗 이탈": "pivot_break",
};

const strengthClassNames = {
  low: "border-slate-200 bg-slate-100 text-slate-700",
  medium: "border-amber-200 bg-amber-100 text-amber-800",
  high: "border-emerald-200 bg-emerald-100 text-emerald-800",
} as const;

export const dynamic = "force-dynamic";

function getTodayInKorea() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function selectDisplaySignals(signals: DatabaseSignal[]) {
  if (signals.length === 0) {
    return { date: null, signals: [] };
  }

  const today = getTodayInKorea();
  const todaySignals = signals.filter(
    (signal) => signal.signal_date === today,
  );
  if (todaySignals.length > 0) {
    return { date: today, signals: todaySignals };
  }

  const latestDate = signals.reduce(
    (latest, signal) =>
      signal.signal_date > latest ? signal.signal_date : latest,
    signals[0].signal_date,
  );
  return {
    date: latestDate,
    signals: signals.filter((signal) => signal.signal_date === latestDate),
  };
}

export default async function SignalsPage() {
  const [signalResult, stockResult] = await Promise.all([
    getSignalsResult(),
    getStockDetailsResult(),
  ]);
  const display = selectDisplaySignals(signalResult.data);
  const companyNames = new Map(
    stockResult.data.map((stock) => [
      stock.company.stock_code,
      stock.company.company_name,
    ]),
  );
  const signalCounts = Object.fromEntries(
    signalCards.map(({ key }) => [key, 0]),
  ) as Record<SignalCountKey, number>;

  for (const signal of display.signals) {
    const countKey = signalTypeMap[signal.signal_type.trim()];
    if (countKey) signalCounts[countKey] += 1;
  }

  const isConnectedEmpty =
    signalResult.source === "supabase" && signalResult.data.length === 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="변화 신호"
        title="오늘의 신호"
        description={`${signalResult.source === "supabase" ? "Supabase signals 테이블" : "mock fallback"}의 ${display.date ? `${formatDate(display.date)} 기준` : "신호"} 데이터를 표시합니다.`}
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {signalCards.map(({ key, label }) => (
          <div
            key={key}
            className="rounded-md border border-line bg-white p-4 shadow-soft"
          >
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-2 text-2xl font-bold text-ink">
              {signalCounts[key]}개
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-md border border-line bg-white shadow-soft">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold text-ink">신호 리스트</h2>
          <p className="mt-1 text-sm text-muted">
            {display.date ? `${formatDate(display.date)} · ` : ""}
            총 {display.signals.length}개 신호
          </p>
        </div>

        {isConnectedEmpty ? (
          <div className="px-5 py-14 text-center">
            <p className="font-semibold text-ink">
              Supabase 연결은 되었지만 신호 데이터가 없습니다.
            </p>
            <p className="mt-2 text-sm text-muted">
              public.signals 테이블에 데이터가 추가되면 이 화면에 표시됩니다.
            </p>
          </div>
        ) : display.signals.length === 0 ? (
          <div className="px-5 py-14 text-center text-muted">
            표시할 신호가 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-line">
            {display.signals.map((signal, index) => (
              <Link
                key={`${signal.stock_code}-${signal.signal_date}-${signal.signal_type}-${index}`}
                href={`/stocks/${signal.stock_code}`}
                className="block px-5 py-4 transition hover:bg-panel/70"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {signal.current_group ? (
                        <GroupBadge group={signal.current_group} />
                      ) : null}
                      <span className="font-bold text-ink">
                        {companyNames.get(signal.stock_code) ??
                          signal.stock_code}
                      </span>
                      <span className="text-sm text-muted">
                        {signal.stock_code}
                      </span>
                    </div>
                    <p className="mt-2 text-base font-semibold text-ink">
                      {signal.signal_type || "기타 신호"}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      {signal.description || "신호 설명이 없습니다."}
                    </p>
                    <p className="mt-2 text-xs text-muted">
                      종목코드 {signal.stock_code} · 발생일{" "}
                      {formatDate(signal.signal_date)}
                      {signal.close_price !== null
                        ? ` · 종가 ${formatCurrency(signal.close_price)}원`
                        : ""}
                      {signal.volume !== null
                        ? ` · 거래량 ${new Intl.NumberFormat("ko-KR").format(signal.volume)}주`
                        : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3 lg:justify-end">
                    {signal.strength ? (
                      <span
                        className={`rounded-md border px-2 py-1 text-xs font-bold ${strengthClassNames[signal.strength]}`}
                      >
                        {signal.strength}
                      </span>
                    ) : (
                      <span className="rounded-md border border-line bg-panel px-2 py-1 text-xs font-semibold text-muted">
                        강도 미지정
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
