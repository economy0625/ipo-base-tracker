import { PageHeader } from "@/components/layout/page-header";
import {
  getBacktestData,
  type BacktestDataSource,
} from "@/lib/backtest-data";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

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

export default async function BacktestPage() {
  const data = await getBacktestData();
  const summary = data.strategySummary.data[0];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="전략 검증"
        title="백테스트"
        description="Python 데이터 파이프라인의 실제 결과 CSV를 우선 사용하며, 파일이 없을 때만 화면 확인용 샘플 데이터를 표시합니다."
      />

      <section>
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-ink">전략 요약</h2>
          <SourceBadge source={data.strategySummary.source} />
        </div>
        {summary ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["총 거래", `${summary.tradeCount}건`],
              ["승률", formatPercent(summary.winRate)],
              ["평균 수익률", formatPercent(summary.averageReturn)],
              ["누적 수익률", formatPercent(summary.totalReturn)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-md border border-line bg-white p-5 shadow-soft"
              >
                <p className="text-sm text-muted">{label}</p>
                <p className="mt-3 text-2xl font-bold text-ink">{value}</p>
              </div>
            ))}
          </div>
        ) : (
          <section className="rounded-md border border-line bg-white shadow-soft">
            <EmptyState filename="data/output/strategy_summary.csv" />
          </section>
        )}
      </section>

      <section className="rounded-md border border-line bg-white shadow-soft">
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-ink">거래 로그</h2>
            <p className="mt-1 text-sm text-muted">
              총 {data.tradeLog.data.length}건
            </p>
          </div>
          <SourceBadge source={data.tradeLog.source} />
        </div>
        {data.tradeLog.data.length === 0 ? (
          <EmptyState filename="data/output/trade_log.csv" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="bg-panel text-muted">
                <tr>
                  {[
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
                {data.tradeLog.data.map((trade, index) => (
                  <tr
                    key={`${trade.stockCode}-${trade.entryDate}-${index}`}
                    className="hover:bg-panel/60"
                  >
                    <td className="px-4 py-3 font-semibold text-ink">
                      {trade.stockCode}
                    </td>
                    <td className="px-4 py-3 text-ink">{trade.signalType}</td>
                    <td className="px-4 py-3 text-muted">
                      {formatDate(trade.entryDate)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatDate(trade.exitDate)}
                    </td>
                    <td className="px-4 py-3 text-ink">
                      {formatCurrency(trade.entryPrice)}원
                    </td>
                    <td className="px-4 py-3 text-ink">
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
        <section className="rounded-md border border-line bg-white shadow-soft">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
            <h2 className="text-lg font-bold text-ink">연도별 수익률</h2>
            <SourceBadge source={data.yearlyReturns.source} />
          </div>
          {data.yearlyReturns.data.length === 0 ? (
            <EmptyState filename="data/output/yearly_returns.csv" />
          ) : (
            <div className="divide-y divide-line">
              {data.yearlyReturns.data.map((row) => (
                <div
                  key={row.year}
                  className="grid grid-cols-4 items-center gap-3 px-5 py-4 text-sm"
                >
                  <span className="font-bold text-ink">{row.year}년</span>
                  <span className="text-muted">{row.tradeCount}건</span>
                  <ReturnValue value={row.averageReturn} />
                  <ReturnValue value={row.totalReturn} />
                </div>
              ))}
              <div className="grid grid-cols-4 gap-3 bg-panel px-5 py-3 text-xs font-semibold text-muted">
                <span>연도</span>
                <span>거래</span>
                <span>평균</span>
                <span>누적</span>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-md border border-line bg-white shadow-soft">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
            <h2 className="text-lg font-bold text-ink">종목별 수익률</h2>
            <SourceBadge source={data.stockReturns.source} />
          </div>
          {data.stockReturns.data.length === 0 ? (
            <EmptyState filename="data/output/stock_returns.csv" />
          ) : (
            <div className="divide-y divide-line">
              {data.stockReturns.data.map((row) => (
                <div
                  key={row.stockCode}
                  className="grid grid-cols-4 items-center gap-3 px-5 py-4 text-sm"
                >
                  <span className="font-bold text-ink">{row.stockCode}</span>
                  <span className="text-muted">{row.tradeCount}건</span>
                  <ReturnValue value={row.averageReturn} />
                  <ReturnValue value={row.totalReturn} />
                </div>
              ))}
              <div className="grid grid-cols-4 gap-3 bg-panel px-5 py-3 text-xs font-semibold text-muted">
                <span>종목코드</span>
                <span>거래</span>
                <span>평균</span>
                <span>누적</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
