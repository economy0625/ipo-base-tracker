import { PageHeader } from "@/components/layout/page-header";
import { StocksPageClient } from "@/components/stocks/stocks-page-client";
import { getStockDetailsResult } from "@/lib/supabase";

export default async function StocksPage() {
  const stockDetails = await getStockDetailsResult();

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="전체 종목"
        title="IPO 종목 목록"
        description={`${stockDetails.source === "supabase" ? "Supabase" : "mock"} 데이터 기반으로 그룹, 상장연도, 산업, 테마, 가격 조건을 필터링합니다.`}
      />
      {stockDetails.status === "partial" ? (
        <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Supabase 부분 연결</p>
          <p className="mt-1">{stockDetails.warnings.join(" ")}</p>
        </div>
      ) : null}
      <StocksPageClient stocks={stockDetails.data} />
    </div>
  );
}
