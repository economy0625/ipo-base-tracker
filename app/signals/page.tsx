import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { GroupBadge } from "@/components/stocks/GroupBadge";
import { formatCurrency, formatDate } from "@/lib/format";
import { getStockDetails } from "@/lib/supabase";
import type { StockDetail } from "@/types/stock";

type SignalName =
  | "공모가 회복"
  | "20일선 회복"
  | "60일선 회복"
  | "120일선 회복"
  | "거래량 급증"
  | "B→A 승격"
  | "A→S 승격"
  | "피벗 이탈";

type SignalStrength = "low" | "medium" | "high";

type TodaySignal = {
  id: string;
  stock: StockDetail;
  signalName: SignalName;
  signalDate: string;
  description: string;
  strength: SignalStrength;
};

const today = "2026-06-23";

const strengthLabels: Record<SignalStrength, string> = {
  low: "low",
  medium: "medium",
  high: "high",
};

const strengthClassNames: Record<SignalStrength, string> = {
  low: "border-slate-200 bg-slate-100 text-slate-700",
  medium: "border-amber-200 bg-amber-100 text-amber-800",
  high: "border-emerald-200 bg-emerald-100 text-emerald-800",
};

function getGroup(stock: StockDetail) {
  return stock.group_score?.current_group ?? "C";
}

function buildSignals(stock: StockDetail): TodaySignal[] {
  const metrics = stock.metrics;
  const pattern = stock.cup_handle_pattern;

  if (!metrics) return [];

  const signals: TodaySignal[] = [];
  const code = stock.company.stock_code;

  if (metrics.current_price >= stock.company.adjusted_ipo_price) {
    signals.push({
      id: `${code}-ipo-recovery`,
      stock,
      signalName: "공모가 회복",
      signalDate: today,
      description: `현재가가 조정공모가 ${formatCurrency(stock.company.adjusted_ipo_price)}원을 회복했습니다.`,
      strength: metrics.return_vs_ipo >= 50 ? "high" : "medium",
    });
  }

  if (metrics.current_price >= metrics.ma20) {
    signals.push({
      id: `${code}-ma20`,
      stock,
      signalName: "20일선 회복",
      signalDate: today,
      description: `현재가가 MA20 ${formatCurrency(metrics.ma20)}원 위에 있습니다.`,
      strength: "low",
    });
  }

  if (metrics.current_price >= metrics.ma60) {
    signals.push({
      id: `${code}-ma60`,
      stock,
      signalName: "60일선 회복",
      signalDate: today,
      description: `중기 기준선인 MA60 ${formatCurrency(metrics.ma60)}원을 회복했습니다.`,
      strength: "medium",
    });
  }

  if (metrics.current_price >= metrics.ma120) {
    signals.push({
      id: `${code}-ma120`,
      stock,
      signalName: "120일선 회복",
      signalDate: today,
      description: `장기 기준선인 MA120 ${formatCurrency(metrics.ma120)}원을 회복했습니다.`,
      strength: "medium",
    });
  }

  if (metrics.volume_ratio_20d >= 1.5) {
    signals.push({
      id: `${code}-volume`,
      stock,
      signalName: "거래량 급증",
      signalDate: today,
      description: `20일 평균 대비 거래량이 ${metrics.volume_ratio_20d.toFixed(1)}배로 증가했습니다.`,
      strength: metrics.volume_ratio_20d >= 2 ? "high" : "medium",
    });
  }

  if (getGroup(stock) === "A") {
    signals.push({
      id: `${code}-upgrade-a`,
      stock,
      signalName: "B→A 승격",
      signalDate: today,
      description: "우측 상승 또는 돌파 임박 조건을 충족해 A그룹 후보로 승격되었습니다.",
      strength: "high",
    });
  }

  if (getGroup(stock) === "S") {
    signals.push({
      id: `${code}-upgrade-s`,
      stock,
      signalName: "A→S 승격",
      signalDate: today,
      description: "전고점 또는 핵심 저항 돌파 후 S그룹으로 승격되었습니다.",
      strength: "high",
    });
  }

  if (pattern?.pivot_price && metrics.current_price < pattern.pivot_price * 0.97) {
    signals.push({
      id: `${code}-pivot-fail`,
      stock,
      signalName: "피벗 이탈",
      signalDate: today,
      description: `현재가가 피벗 가격 ${formatCurrency(pattern.pivot_price)}원을 이탈했습니다.`,
      strength: "high",
    });
  }

  return signals;
}

export default async function SignalsPage() {
  const stockDetails = await getStockDetails();
  const signals = stockDetails
    .flatMap(buildSignals)
    .sort((a, b) => {
      const strengthOrder: Record<SignalStrength, number> = {
        high: 3,
        medium: 2,
        low: 1,
      };
      return strengthOrder[b.strength] - strengthOrder[a.strength];
    });

  const signalCounts = signals.reduce<Record<SignalName, number>>(
    (acc, signal) => {
      acc[signal.signalName] += 1;
      return acc;
    },
    {
      "공모가 회복": 0,
      "20일선 회복": 0,
      "60일선 회복": 0,
      "120일선 회복": 0,
      "거래량 급증": 0,
      "B→A 승격": 0,
      "A→S 승격": 0,
      "피벗 이탈": 0,
    },
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="변화 신호"
        title="오늘의 신호"
        description="mock data를 기준으로 오늘 발생한 가격, 이동평균선, 거래량, 그룹 변화 신호를 표시합니다."
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(signalCounts) as SignalName[]).map((name) => (
          <div key={name} className="rounded-md border border-line bg-white p-4 shadow-soft">
            <p className="text-sm text-muted">{name}</p>
            <p className="mt-2 text-2xl font-bold text-ink">{signalCounts[name]}개</p>
          </div>
        ))}
      </section>

      <section className="rounded-md border border-line bg-white shadow-soft">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold text-ink">신호 리스트</h2>
          <p className="mt-1 text-sm text-muted">총 {signals.length}개 신호</p>
        </div>

        <div className="divide-y divide-line">
          {signals.map((signal) => (
            <Link
              key={signal.id}
              href={`/stocks/${signal.stock.company.stock_code}`}
              className="block px-5 py-4 transition hover:bg-panel/70"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <GroupBadge group={getGroup(signal.stock)} />
                    <span className="font-bold text-ink">
                      {signal.stock.company.company_name}
                    </span>
                    <span className="text-sm text-muted">
                      {signal.stock.company.stock_code}
                    </span>
                  </div>
                  <p className="mt-2 text-base font-semibold text-ink">
                    {signal.signalName}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    {signal.description}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3 lg:justify-end">
                  <span className="text-sm text-muted">
                    {formatDate(signal.signalDate)}
                  </span>
                  <span
                    className={`rounded-md border px-2 py-1 text-xs font-bold ${strengthClassNames[signal.strength]}`}
                  >
                    {strengthLabels[signal.strength]}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
