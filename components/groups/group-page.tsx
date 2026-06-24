import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { GroupBadge } from "@/components/stocks/GroupBadge";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { groupDefinitions } from "@/lib/groups";
import { getStocksByGroupResult } from "@/lib/supabase";
import type { StockDetail, StockGroup } from "@/types/stock";

type GroupPageProps = {
  group: StockGroup;
};

function getGroup(stock: StockDetail) {
  return stock.group_score?.current_group ?? "C";
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function hasIpoReturn(stock: StockDetail) {
  return (
    stock.company.adjusted_ipo_price > 0 &&
    stock.metrics?.return_vs_ipo !== null &&
    stock.metrics?.return_vs_ipo !== undefined
  );
}

function returnVsIpoOrDash(stock: StockDetail) {
  return hasIpoReturn(stock)
    ? formatPercent(stock.metrics!.return_vs_ipo!)
    : "-";
}

export async function GroupPage({ group }: GroupPageProps) {
  const definition = groupDefinitions[group];
  const result = await getStocksByGroupResult(group);
  const stocks = result.data;
  const averageReturn = average(
    stocks
      .filter(hasIpoReturn)
      .map((stock) => stock.metrics!.return_vs_ipo!),
  );
  const averageDrawdown = average(
    stocks.map((stock) => stock.metrics?.drawdown_from_high ?? 0),
  );
  const averageVolumeRatio = average(
    stocks.map((stock) => stock.metrics?.volume_ratio_20d ?? 0),
  );
  const recoveredMa60Count = stocks.filter(
    (stock) =>
      (stock.metrics?.current_price ?? 0) >= (stock.metrics?.ma60 ?? Infinity),
  ).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="그룹별 모니터링"
        title={definition.label}
        description={definition.definition}
      />
      {result.status === "partial" ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Supabase 부분 연결</p>
          <p className="mt-1">{result.warnings.join(" ")}</p>
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="rounded-md border border-line bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-ink">그룹 설명</h2>
            <GroupBadge group={group} size="lg" />
          </div>
          <p className="mt-4 leading-7 text-muted">{definition.definition}</p>
          <p className="mt-5 text-sm font-semibold text-ink">투자전략</p>
          <p className="mt-2 leading-7 text-muted">{definition.strategy}</p>
        </div>

        <div className="rounded-md border border-line bg-white p-5 shadow-soft">
          <h2 className="text-lg font-bold text-ink">그룹 조건 체크리스트</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {definition.conditions.map((condition) => (
              <div
                key={condition}
                className="flex items-start gap-3 rounded-md border border-line bg-panel p-3"
              >
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                  ✓
                </span>
                <span className="text-sm leading-6 text-ink">{condition}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="해당 종목"
          value={`${stocks.length}개`}
          helper={`${result.source === "supabase" ? "Supabase" : "mock"} data 기준`}
        />
        <MetricCard
          label="평균 공모가 대비"
          value={
            stocks.some(hasIpoReturn) ? formatPercent(averageReturn) : "-"
          }
          helper="그룹 내 단순 평균"
        />
        <MetricCard
          label="평균 전고점 대비"
          value={formatPercent(averageDrawdown)}
          helper="낙폭이 작을수록 강함"
        />
        <MetricCard
          label="60일선 회복"
          value={`${recoveredMa60Count}개`}
          helper={`평균 거래량 ${averageVolumeRatio.toFixed(1)}배`}
        />
      </section>

      <section className="overflow-hidden rounded-md border border-line bg-white shadow-soft">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold text-ink">해당 그룹 종목 테이블</h2>
        </div>
        {stocks.length === 0 ? (
          <div className="p-8 text-center text-muted">해당 그룹 종목이 없습니다.</div>
        ) : (
          <>
            <div className="hidden overflow-x-auto xl:block">
              <table className="min-w-full divide-y divide-line text-sm">
                <thead className="bg-panel">
                  <tr className="text-left text-muted">
                    <th className="px-4 py-3 font-semibold">그룹</th>
                    <th className="px-4 py-3 font-semibold">종목명</th>
                    <th className="px-4 py-3 font-semibold">종목코드</th>
                    <th className="px-4 py-3 font-semibold">상장일</th>
                    <th className="px-4 py-3 font-semibold">산업</th>
                    <th className="px-4 py-3 font-semibold">현재가</th>
                    <th className="px-4 py-3 font-semibold">공모가 대비</th>
                    <th className="px-4 py-3 font-semibold">전고점 대비</th>
                    <th className="px-4 py-3 font-semibold">거래량</th>
                    <th className="px-4 py-3 font-semibold">판정 사유</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {stocks.map((stock) => (
                    <StockTableRow key={stock.company.stock_code} stock={stock} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-4 xl:hidden">
              {stocks.map((stock) => (
                <StockMobileCard key={stock.company.stock_code} stock={stock} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-md border border-line bg-white p-5 shadow-soft">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 text-2xl font-bold text-ink">{value}</p>
      <p className="mt-2 text-sm text-muted">{helper}</p>
    </div>
  );
}

function StockTableRow({ stock }: { stock: StockDetail }) {
  const metrics = stock.metrics;
  const group = getGroup(stock);

  return (
    <tr className="transition hover:bg-panel/70">
      <td className="px-4 py-4">
        <GroupBadge group={group} />
      </td>
      <td className="px-4 py-4">
        <Link
          href={`/stocks/${stock.company.stock_code}`}
          className="font-semibold text-ink hover:text-accent"
        >
          {stock.company.company_name}
        </Link>
      </td>
      <td className="px-4 py-4 text-muted">{stock.company.stock_code}</td>
      <td className="px-4 py-4 text-muted">
        {formatDate(stock.company.listing_date)}
      </td>
      <td className="px-4 py-4 text-muted">{stock.company.industry}</td>
      <td className="px-4 py-4 font-semibold">
        {metrics ? `${formatCurrency(metrics.current_price)}원` : "-"}
      </td>
      <td className="px-4 py-4 font-semibold text-accent">
        {returnVsIpoOrDash(stock)}
      </td>
      <td className="px-4 py-4 font-semibold text-red-600">
        {metrics ? formatPercent(metrics.drawdown_from_high) : "-"}
      </td>
      <td className="px-4 py-4">
        {metrics ? `${metrics.volume_ratio_20d.toFixed(1)}배` : "-"}
      </td>
      <td className="max-w-sm px-4 py-4 text-muted">
        {stock.group_score?.group_reason}
      </td>
    </tr>
  );
}

function StockMobileCard({ stock }: { stock: StockDetail }) {
  const metrics = stock.metrics;
  const group = getGroup(stock);

  return (
    <Link
      href={`/stocks/${stock.company.stock_code}`}
      className="rounded-md border border-line bg-white p-4 transition hover:border-accent"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-ink">{stock.company.company_name}</p>
          <p className="mt-1 text-sm text-muted">
            {stock.company.stock_code} · {stock.company.industry}
          </p>
        </div>
        <GroupBadge group={group} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted">상장일</p>
          <p className="mt-1 font-semibold text-ink">
            {formatDate(stock.company.listing_date)}
          </p>
        </div>
        <div>
          <p className="text-muted">현재가</p>
          <p className="mt-1 font-semibold text-ink">
            {metrics ? `${formatCurrency(metrics.current_price)}원` : "-"}
          </p>
        </div>
        <div>
          <p className="text-muted">공모가 대비</p>
          <p className="mt-1 font-semibold text-accent">
            {returnVsIpoOrDash(stock)}
          </p>
        </div>
        <div>
          <p className="text-muted">거래량</p>
          <p className="mt-1 font-semibold text-ink">
            {metrics ? `${metrics.volume_ratio_20d.toFixed(1)}배` : "-"}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted">
        {stock.group_score?.group_reason}
      </p>
    </Link>
  );
}
