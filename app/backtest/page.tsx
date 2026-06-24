import { PageHeader } from "@/components/layout/page-header";
import {
  getBacktestData,
  type BacktestDataSource,
  type BacktestStrategy,
  type StockReturn,
  type StrategySummary,
} from "@/lib/backtest-data";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

const strategyDescriptions: Record<BacktestStrategy, string> = {
  B: "장기 조정 후 베이스 형성 구간에서 진입",
  A: "이동평균선 회복과 돌파 임박 구간에서 진입",
  S: "핵심 저항 돌파 또는 A→S 승격 시 진입",
};

function SourceBadge({ source }: { source: BacktestDataSource }) {
  return (
    <span
      className={`rounded-md border px-2 py-1 text-xs font-semibold ${
        source === "csv"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
    >
      {source === "csv" ? "실제 CSV" : "샘플 데이터"}
    </span>
  );
}

function ReturnValue({ value }: { value: number }) {
  return (
    <span
      className={
        value > 0
          ? "font-semibold text-emerald-700"
          : value < 0
            ? "font-semibold text-rose-700"
            : "font-semibold text-muted"
      }
    >
      {formatPercent(value)}
    </span>
  );
}

function StrategyCard({ summary }: { summary: StrategySummary }) {
  const metrics = [
    ["총 거래수", `${summary.tradeCount}건`],
    ["승률", formatPercent(summary.winRate)],
    ["평균수익률", formatPercent(summary.averageReturn)],
    ["최대수익률", formatPercent(summary.maximumReturn)],
    ["최대손실", formatPercent(summary.maximumLoss)],
    ["평균 보유일", `${summary.averageHoldingDays.toFixed(1)}일`],
  ];

  return (
    <article className="rounded-md border border-line bg-white shadow-soft">
      <div className="border-b border-line px-5 py-4">
        <h3 className="text-xl font-bold text-ink">
          {summary.strategy}전략
        </h3>
        <p className="mt-1 text-sm text-muted">
          {strategyDescriptions[summary.strategy]}
        </p>
      </div>
      {summary.tradeCount === 0 ? (
        <p className="px-5 py-8 text-center text-sm font-semibold text-muted">
          현재 데이터에서는 해당 전략 조건이 발생하지 않았습니다.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-px bg-line">
          {metrics.map(([label, value]) => (
            <div key={label} className="bg-white p-4">
              <p className="text-xs text-muted">{label}</p>
              <p className="mt-2 text-lg font-bold text-ink">{value}</p>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function EmptyState({ filename }: { filename: string }) {
  return (
    <div className="px-5 py-12 text-center">
      <p className="font-semibold text-ink">표시할 백테스트 결과가 없습니다.</p>
      <p className="mt-2 text-sm text-muted">
        {filename} 파일은 존재하지만 데이터 행이 비어 있습니다.
      </p>
    </div>
  );
}

export default async function BacktestPage() {
  const data = await getBacktestData();
  const recentTrades = [...data.tradeLog.data]
    .sort((a, b) => b.exitDate.localeCompare(a.exitDate))
    .slice(0, 10);
  const rankedStocks = [...data.stockReturns.data].sort(
    (a, b) => b.averageReturn - a.averageReturn,
  );
  const topStocks = rankedStocks.slice(0, 5);
  const bottomStocks = [...rankedStocks].reverse().slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="전략 검증"
        title="백테스트"
        description="B·A·S 그룹 진입 전략의 거래 성과와 종목별 결과를 비교합니다."
      />

      <section className="rounded-md border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
        <p className="font-bold">
          본 결과는 투자 권유가 아닌 전략 검증용입니다.
        </p>
        <p className="mt-1">
          과거 데이터와 단순 조건을 사용한 결과이며 실제 수수료, 세금,
          슬리피지와 체결 가능성을 완전히 반영하지 않습니다.
        </p>
      </section>

      <section className="rounded-md border border-line bg-white p-5 shadow-soft">
        <h2 className="text-lg font-bold text-ink">백테스트 조건</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Condition label="진입 기준" value="signals.csv 신호 발생일 종가" />
          <Condition label="보유 기간" value="최대 20거래일" />
          <Condition label="청산 기준" value="보유기간 마지막 거래일 종가" />
          <Condition label="수익률" value="(청산가-진입가) / 진입가" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {(["B", "A", "S"] as BacktestStrategy[]).map((strategy) => (
            <div key={strategy} className="rounded-md bg-panel p-3 text-sm">
              <span className="font-bold text-ink">{strategy}전략</span>
              <p className="mt-1 text-muted">
                {strategyDescriptions[strategy]}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-ink">전략별 성과 비교</h2>
          <SourceBadge source={data.strategySummary.source} />
        </div>
        <div className="grid gap-5 xl:grid-cols-3">
          {data.strategySummary.data.map((summary) => (
            <StrategyCard key={summary.strategy} summary={summary} />
          ))}
        </div>
      </section>

      <section className="rounded-md border border-line bg-white shadow-soft">
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-ink">최근 거래 로그</h2>
            <p className="mt-1 text-sm text-muted">
              trade_log.csv 기준 최근 {recentTrades.length}건
            </p>
          </div>
          <SourceBadge source={data.tradeLog.source} />
        </div>
        {recentTrades.length === 0 ? (
          <EmptyState filename="data/output/trade_log.csv" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-panel text-muted">
                <tr>
                  {[
                    "전략",
                    "종목코드",
                    "신호",
                    "진입일",
                    "청산일",
                    "진입가",
                    "청산가",
                    "수익률",
                    "보유일",
                  ].map((label) => (
                    <th key={label} className="px-4 py-3 font-semibold">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {recentTrades.map((trade, index) => (
                  <tr key={`${trade.stockCode}-${trade.entryDate}-${index}`}>
                    <td className="px-4 py-3 font-bold text-accent">
                      {trade.strategy ? `${trade.strategy}전략` : "-"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-ink">
                      {trade.stockCode}
                    </td>
                    <td className="px-4 py-3">{trade.signalType}</td>
                    <td className="px-4 py-3 text-muted">
                      {formatDate(trade.entryDate)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatDate(trade.exitDate)}
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(trade.entryPrice)}원
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(trade.exitPrice)}원
                    </td>
                    <td className="px-4 py-3">
                      <ReturnValue value={trade.returnPercent} />
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {trade.holdingDays}일
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <StockRanking
          title="수익률 상위 종목"
          rows={topStocks}
          source={data.stockReturns.source}
        />
        <StockRanking
          title="수익률 하위 종목"
          rows={bottomStocks}
          source={data.stockReturns.source}
        />
      </div>
    </div>
  );
}

function Condition({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-panel p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function StockRanking({
  title,
  rows,
  source,
}: {
  title: string;
  rows: StockReturn[];
  source: BacktestDataSource;
}) {
  return (
    <section className="rounded-md border border-line bg-white shadow-soft">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        <SourceBadge source={source} />
      </div>
      {rows.length === 0 ? (
        <EmptyState filename="data/output/stock_returns.csv" />
      ) : (
        <div className="divide-y divide-line">
          {rows.map((row) => (
            <div
              key={row.stockCode}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-4 text-sm"
            >
              <span className="font-bold text-ink">{row.stockCode}</span>
              <span className="text-muted">{row.tradeCount}건</span>
              <ReturnValue value={row.averageReturn} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
