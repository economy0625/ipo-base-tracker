import { formatCurrency, formatPercent } from "@/lib/format";
import { groupLabels } from "@/lib/groups";
import type { IpoStock } from "@/types/stock";

type StockTableProps = {
  stocks: IpoStock[];
};

export function StockTable({ stocks }: StockTableProps) {
  if (stocks.length === 0) {
    return (
      <div className="rounded-md border border-line bg-white p-8 text-center text-muted">
        표시할 종목이 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-line bg-white shadow-soft">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-sm">
          <thead className="bg-panel">
            <tr className="text-left text-muted">
              <th className="px-4 py-3 font-semibold">종목</th>
              <th className="px-4 py-3 font-semibold">그룹</th>
              <th className="px-4 py-3 font-semibold">상장일</th>
              <th className="px-4 py-3 font-semibold">현재가</th>
              <th className="px-4 py-3 font-semibold">공모가 대비</th>
              <th className="px-4 py-3 font-semibold">베이스 상태</th>
              <th className="px-4 py-3 font-semibold">거래량</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {stocks.map((stock) => (
              <tr key={stock.code} className="align-top">
                <td className="px-4 py-4">
                  <div className="font-semibold text-ink">{stock.name}</div>
                  <div className="mt-1 text-xs text-muted">{stock.code}</div>
                </td>
                <td className="px-4 py-4 font-medium text-accent">
                  {groupLabels[stock.group]}
                </td>
                <td className="px-4 py-4 text-muted">{stock.listedAt}</td>
                <td className="px-4 py-4 font-medium">
                  {formatCurrency(stock.currentPrice)}원
                </td>
                <td
                  className={`px-4 py-4 font-medium ${
                    stock.changeRate >= 0 ? "text-accent" : "text-red-600"
                  }`}
                >
                  {formatPercent(stock.changeRate)}
                </td>
                <td className="max-w-xs px-4 py-4 text-muted">
                  {stock.baseStatus}
                </td>
                <td className="px-4 py-4">{stock.volumeSignal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
