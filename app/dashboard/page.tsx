import Link from "next/link";
import { GroupDistribution } from "@/components/charts/group-distribution";
import { PageHeader } from "@/components/layout/page-header";
import { countStocksByGroup } from "@/lib/calculations";
import { formatCurrency, formatPercent } from "@/lib/format";
import { getStockDetails, getStocks } from "@/lib/supabase";
import type { StockDetail, StockGroup } from "@/types/stock";

type SummaryCard = {
  label: string;
  value: string;
  description: string;
  href: string;
};

const groupOrder: StockGroup[] = ["S", "A", "B", "C", "D"];

function getGroup(stock: StockDetail) {
  return stock.group_score?.current_group ?? "C";
}

function getCurrentPrice(stock: StockDetail) {
  return stock.metrics?.current_price ?? stock.company.adjusted_ipo_price;
}

function getTodaySignals(stocks: StockDetail[]) {
  return stocks
    .filter((stock) => {
      const group = getGroup(stock);
      const volumeRatio = stock.metrics?.volume_ratio_20d ?? 0;
      const patternStatus = stock.cup_handle_pattern?.pattern_status;

      return (
        patternStatus === "BREAKOUT" ||
        patternStatus === "READY" ||
        volumeRatio >= 1.8 ||
        group === "S"
      );
    })
    .slice(0, 6);
}

function getRecentSGroupStocks(stocks: StockDetail[]) {
  return stocks
    .filter((stock) => getGroup(stock) === "S")
    .sort(
      (a, b) =>
        new Date(b.company.listing_date).getTime() -
        new Date(a.company.listing_date).getTime(),
    )
    .slice(0, 5);
}

function getBGroupCandidates(stocks: StockDetail[]) {
  return stocks
    .filter((stock) => getGroup(stock) === "B")
    .sort(
      (a, b) =>
        (b.group_score?.total_score ?? 0) - (a.group_score?.total_score ?? 0),
    )
    .slice(0, 6);
}

function StockMiniList({
  title,
  href,
  stocks,
}: {
  title: string;
  href: string;
  stocks: StockDetail[];
}) {
  return (
    <section className="rounded-md border border-line bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-ink">{title}</h3>
        <Link href={href} className="text-sm font-semibold text-accent">
          전체 보기
        </Link>
      </div>
      <div className="space-y-3">
        {stocks.map((stock) => (
          <Link
            key={stock.company.stock_code}
            href={href}
            className="block rounded-md border border-line p-4 transition hover:border-accent"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-ink">{stock.company.company_name}</p>
                <p className="mt-1 text-xs text-muted">
                  {stock.company.stock_code} · {stock.company.industry}
                </p>
              </div>
              <span className="rounded-md bg-panel px-2 py-1 text-xs font-bold text-accent">
                {getGroup(stock)}그룹
              </span>
            </div>
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">
              {stock.group_score?.group_reason ?? "분류 사유 준비 중"}
            </p>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-muted">현재가</span>
              <span className="font-semibold text-ink">
                {formatCurrency(getCurrentPrice(stock))}원
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function TodaySignalList({ signals }: { signals: StockDetail[] }) {
  return (
    <section className="mt-8 rounded-md border border-line bg-white p-5 shadow-soft xl:mt-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-ink">오늘의 신호</h3>
        <Link href="/signals" className="text-sm font-semibold text-accent">
          전체 보기
        </Link>
      </div>
      <div className="space-y-3">
        {signals.map((stock) => {
          const metrics = stock.metrics;
          const pattern = stock.cup_handle_pattern;
          const signalText =
            pattern?.pattern_status === "BREAKOUT"
              ? "돌파 신호"
              : pattern?.pattern_status === "READY"
                ? "돌파 대기"
                : "거래량 증가";

          return (
            <Link
              key={stock.company.stock_code}
              href="/signals"
              className="flex items-center justify-between gap-4 rounded-md border border-line p-4 transition hover:border-accent"
            >
              <div>
                <p className="font-semibold text-ink">{stock.company.company_name}</p>
                <p className="mt-1 text-sm text-muted">
                  {signalText} · 거래량 {metrics?.volume_ratio_20d.toFixed(1)}배
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-accent">
                  {formatPercent(metrics?.return_vs_ipo ?? 0)}
                </p>
                <p className="mt-1 text-xs text-muted">공모가 대비</p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default async function DashboardPage() {
  const stockDetails = await getStockDetails();
  const stocks = await getStocks();
  const counts = countStocksByGroup(stocks);
  const todaySignals = getTodaySignals(stockDetails);
  const recentSGroupStocks = getRecentSGroupStocks(stockDetails);
  const bGroupCandidates = getBGroupCandidates(stockDetails);
  const watchlistCount = recentSGroupStocks.length + bGroupCandidates.length;

  const summaryCards: SummaryCard[] = [
    {
      label: "전체 신규상장주",
      value: `${stocks.length}개`,
      description: "2020년 이후 코스닥 IPO 샘플",
      href: "/stocks",
    },
    {
      label: "S그룹",
      value: `${counts.S}개`,
      description: "돌파 유지 또는 최상위 후보",
      href: "/groups/s",
    },
    {
      label: "A그룹",
      value: `${counts.A}개`,
      description: "돌파 전후 강한 후보",
      href: "/groups/a",
    },
    {
      label: "B그룹",
      value: `${counts.B}개`,
      description: "베이스 형성 관심 후보",
      href: "/groups/b",
    },
    {
      label: "오늘의 신호",
      value: `${todaySignals.length}개`,
      description: "돌파, 거래량, 대기 신호",
      href: "/signals",
    },
    {
      label: "관심종목",
      value: `${watchlistCount}개`,
      description: "S그룹과 B그룹 후보 합산",
      href: "/watchlist",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="IPO 베이스 현황"
        title="대시보드"
        description="mock data로 신규상장주 그룹, 오늘의 신호, 관심 후보를 한눈에 확인합니다."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {summaryCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-md border border-line bg-white p-5 shadow-soft transition hover:border-accent"
          >
            <p className="text-sm font-medium text-muted">{card.label}</p>
            <p className="mt-3 text-3xl font-bold text-ink">{card.value}</p>
            <p className="mt-3 text-sm leading-5 text-muted">{card.description}</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <GroupDistribution counts={counts} />
        <TodaySignalList signals={todaySignals} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <StockMiniList
          title="최근 S그룹 편입 종목"
          href="/groups/s"
          stocks={recentSGroupStocks}
        />
        <StockMiniList
          title="B그룹 관심 후보"
          href="/groups/b"
          stocks={bGroupCandidates}
        />
      </div>

      <section className="mt-6 rounded-md border border-line bg-white p-5 shadow-soft">
        <h3 className="text-lg font-bold text-ink">그룹별 빠른 이동</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-5">
          {groupOrder.map((group) => (
            <Link
              key={group}
              href={`/groups/${group.toLowerCase()}`}
              className="rounded-md border border-line bg-panel px-4 py-3 text-center font-semibold text-ink transition hover:border-accent hover:text-accent"
            >
              {group}그룹 {counts[group]}개
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
