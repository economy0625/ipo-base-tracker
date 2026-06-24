import { PageHeader } from "@/components/layout/page-header";
import { WatchlistPageClient } from "@/components/watchlist/WatchlistPageClient";
import {
  getSignalsResult,
  getStockDetailsResult,
} from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  const [stockResult, signalResult] = await Promise.all([
    getStockDetailsResult(),
    getSignalsResult(),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="투자 검토"
        title="관심종목"
        description="그룹 점수와 최근 신호를 확인하며 관심 사유와 검토 메모를 관리합니다."
      />

      {stockResult.status === "partial" ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          일부 지표 또는 그룹 데이터가 부족하여 가능한 항목만 표시합니다.
        </div>
      ) : null}

      <WatchlistPageClient
        stocks={stockResult.data}
        signals={signalResult.data}
      />
    </div>
  );
}
