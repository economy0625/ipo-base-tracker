import Link from "next/link";
import { GroupDistribution } from "@/components/charts/group-distribution";
import { PageHeader } from "@/components/layout/page-header";
import { GroupBadge } from "@/components/stocks/GroupBadge";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import {
  getSignalsResult,
  getStockDetailsResult,
} from "@/lib/supabase";
import type {
  DatabaseSignal,
  StockDetail,
  StockGroup,
} from "@/types/stock";

const groupOrder: StockGroup[] = ["S", "A", "B", "C", "D"];

const signalTypeAliases = {
  ipoRecovery: new Set(["공모가 회복"]),
  ma60Recovery: new Set(["60일선 회복"]),
  volumeSurge: new Set(["거래량 급증"]),
};

function getTodayInKorea() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function selectRecentSignals(signals: DatabaseSignal[]) {
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

function countUniqueSignals(
  signals: DatabaseSignal[],
  acceptedTypes: Set<string>,
  eligibleCodes?: Set<string>,
) {
  return new Set(
    signals
      .filter((signal) => acceptedTypes.has(signal.signal_type.trim()))
      .filter((signal) => !eligibleCodes || eligibleCodes.has(signal.stock_code))
      .map((signal) => signal.stock_code),
  ).size;
}

function getGroupCounts(stocks: StockDetail[]) {
  const counts: Record<StockGroup, number> = {
    S: 0,
    A: 0,
    B: 0,
    C: 0,
    D: 0,
  };

  for (const stock of stocks) {
    const group = stock.group_score?.current_group;
    if (group) counts[group] += 1;
  }
  return counts;
}

function getTopGroupStocks(
  stocks: StockDetail[],
  group: StockGroup,
  limit = 5,
) {
  return stocks
    .filter((stock) => stock.group_score?.current_group === group)
    .sort(
      (a, b) =>
        (b.group_score?.total_score ?? Number.NEGATIVE_INFINITY) -
        (a.group_score?.total_score ?? Number.NEGATIVE_INFINITY),
    )
    .slice(0, limit);
}

function getAPromotionCandidates(stocks: StockDetail[]) {
  return stocks
    .filter((stock) => stock.group_score?.current_group === "A")
    .sort((a, b) => {
      const scoreDiff =
        (b.group_score?.total_score ?? 0) -
        (a.group_score?.total_score ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      return (
        (b.metrics?.volume_ratio_20d ?? 0) -
        (a.metrics?.volume_ratio_20d ?? 0)
      );
    })
    .slice(0, 5);
}

function DataModeBadge({
  mode,
}: {
  mode: "supabase" | "partial" | "mock";
}) {
  const labels = {
    supabase: "Supabase data 모드",
    partial: "부분 연결",
    mock: "Mock data 모드",
  };
  return (
    <span
      className={`inline-flex rounded-md border px-3 py-2 text-sm font-semibold ${
        mode === "partial"
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : mode === "supabase"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-line bg-panel text-muted"
      }`}
    >
      {labels[mode]}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  description,
  href,
}: {
  label: string;
  value: number;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-md border border-line bg-white p-5 shadow-soft transition hover:border-accent"
    >
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-3 text-3xl font-bold text-ink">
        {value.toLocaleString("ko-KR")}개
      </p>
      <p className="mt-2 text-sm leading-5 text-muted">{description}</p>
    </Link>
  );
}

function RecentSignalList({
  signals,
  companyNames,
}: {
  signals: DatabaseSignal[];
  companyNames: Map<string, string>;
}) {
  return (
    <section className="rounded-md border border-line bg-white shadow-soft">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-lg font-bold text-ink">최근 신호 5개</h2>
        <Link href="/signals" className="text-sm font-semibold text-accent">
          전체 보기
        </Link>
      </div>
      {signals.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-muted">
          표시할 신호가 없습니다.
        </p>
      ) : (
        <div className="divide-y divide-line">
          {signals.map((signal, index) => (
            <Link
              key={`${signal.stock_code}-${signal.signal_date}-${signal.signal_type}-${index}`}
              href={`/stocks/${signal.stock_code}`}
              className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-panel"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">
                  {companyNames.get(signal.stock_code) ?? signal.stock_code}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {signal.signal_type || "기타 신호"} ·{" "}
                  {formatDate(signal.signal_date)}
                </p>
              </div>
              <span className="shrink-0 rounded-md bg-panel px-2 py-1 text-xs font-semibold text-muted">
                {signal.strength ?? "강도 미정"}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function CandidateList({
  title,
  description,
  stocks,
  emptyMessage,
}: {
  title: string;
  description: string;
  stocks: StockDetail[];
  emptyMessage: string;
}) {
  return (
    <section className="rounded-md border border-line bg-white shadow-soft">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      {stocks.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-muted">
          {emptyMessage}
        </p>
      ) : (
        <div className="divide-y divide-line">
          {stocks.map((stock) => {
            const score = stock.group_score?.total_score;
            const metrics = stock.metrics;
            return (
              <Link
                key={stock.company.stock_code}
                href={`/stocks/${stock.company.stock_code}`}
                className="block px-5 py-4 transition hover:bg-panel"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {stock.group_score ? (
                        <GroupBadge group={stock.group_score.current_group} />
                      ) : null}
                      <p className="font-semibold text-ink">
                        {stock.company.company_name}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-muted">
                      {stock.company.stock_code} · {stock.company.industry}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-accent">
                      {score === null || score === undefined
                        ? "-"
                        : `${score}점`}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      거래량{" "}
                      {metrics
                        ? `${metrics.volume_ratio_20d.toFixed(1)}배`
                        : "-"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  <span>
                    현재가{" "}
                    {metrics
                      ? `${formatCurrency(metrics.current_price)}원`
                      : "-"}
                  </span>
                  <span>
                    공모가 대비{" "}
                    {metrics &&
                    stock.company.adjusted_ipo_price > 0 &&
                    metrics.return_vs_ipo !== null
                      ? formatPercent(metrics.return_vs_ipo)
                      : "-"}
                  </span>
                  <span>
                    전고점 대비{" "}
                    {metrics
                      ? formatPercent(metrics.drawdown_from_high)
                      : "-"}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stockResult, signalResult] = await Promise.all([
    getStockDetailsResult(),
    getSignalsResult(),
  ]);
  const stocks = stockResult.data;
  const displaySignals = selectRecentSignals(signalResult.data);
  const recentSignals = [...displaySignals.signals]
    .sort((a, b) => b.signal_date.localeCompare(a.signal_date))
    .slice(0, 5);
  const counts = getGroupCounts(stocks);
  const unclassifiedCount = stocks.filter((stock) => !stock.group_score).length;
  const bCandidates = getTopGroupStocks(stocks, "B");
  const aPromotionCandidates = getAPromotionCandidates(stocks);
  const companyNames = new Map(
    stocks.map((stock) => [
      stock.company.stock_code,
      stock.company.company_name,
    ]),
  );
  const ipoAvailableCodes = new Set(
    stocks
      .filter((stock) => stock.company.adjusted_ipo_price > 0)
      .map((stock) => stock.company.stock_code),
  );

  const isPartial =
    stockResult.status === "partial" ||
    signalResult.status === "partial" ||
    stockResult.source !== signalResult.source ||
    unclassifiedCount > 0;
  const mode =
    stockResult.source === "supabase" &&
    signalResult.source === "supabase" &&
    !isPartial
      ? "supabase"
      : isPartial
        ? "partial"
        : "mock";

  const warnings = [
    ...stockResult.warnings,
    ...signalResult.warnings,
    ...(unclassifiedCount > 0
      ? [`그룹 분류가 없는 종목이 ${unclassifiedCount}개 있습니다.`]
      : []),
    ...(stockResult.source !== signalResult.source
      ? ["종목 데이터와 신호 데이터의 출처가 서로 다릅니다."]
      : []),
  ];

  const summaryCards = [
    {
      label: "전체 신규상장주",
      value: stocks.length,
      description: "현재 조회된 코스닥 신규상장 일반기업",
      href: "/stocks",
    },
    ...groupOrder.map((group) => ({
      label: `${group}그룹`,
      value: counts[group],
      description: "그룹 점수 기준 종목 수",
      href: `/groups/${group.toLowerCase()}`,
    })),
    {
      label: "오늘 또는 최근 신호",
      value: displaySignals.signals.length,
      description: displaySignals.date
        ? `${formatDate(displaySignals.date)} 기준`
        : "발생 신호 없음",
      href: "/signals",
    },
    {
      label: "공모가 회복",
      value: countUniqueSignals(
        displaySignals.signals,
        signalTypeAliases.ipoRecovery,
        ipoAvailableCodes,
      ),
      description: "기준일 신호 발생 종목",
      href: "/signals",
    },
    {
      label: "60일선 회복",
      value: countUniqueSignals(
        displaySignals.signals,
        signalTypeAliases.ma60Recovery,
      ),
      description: "기준일 신호 발생 종목",
      href: "/signals",
    },
    {
      label: "거래량 급증",
      value: countUniqueSignals(
        displaySignals.signals,
        signalTypeAliases.volumeSurge,
      ),
      description: "기준일 신호 발생 종목",
      href: "/signals",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          eyebrow="IPO 베이스 현황"
          title="대시보드"
          description="신규상장주 그룹 분포와 최근 변화 신호를 한눈에 확인합니다."
        />
        <DataModeBadge mode={mode} />
      </div>

      {isPartial ? (
        <section className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-bold">부분 연결</p>
          <p className="mt-1">
            {warnings.length > 0
              ? warnings.join(" ")
              : "일부 관계 데이터가 부족하여 가능한 항목만 표시합니다."}
          </p>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <GroupDistribution counts={counts} />
        <RecentSignalList
          signals={recentSignals}
          companyNames={companyNames}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <CandidateList
          title="B그룹 상위 5개"
          description="total_score가 높은 순서로 표시합니다."
          stocks={bCandidates}
          emptyMessage="B그룹 후보가 없습니다."
        />
        <CandidateList
          title="A그룹 S 승격 후보 5개"
          description="total_score와 거래량 배수를 기준으로 우선순위를 표시합니다."
          stocks={aPromotionCandidates}
          emptyMessage="현재 A그룹 승격 후보가 없습니다."
        />
      </div>
    </div>
  );
}
