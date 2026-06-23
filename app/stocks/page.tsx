import { PageHeader } from "@/components/layout/page-header";
import { StocksPageClient } from "@/components/stocks/stocks-page-client";
import { getStockDetails } from "@/lib/supabase";

export default async function StocksPage() {
  const stockDetails = await getStockDetails();

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        eyebrow="전체 종목"
        title="IPO 종목 목록"
        description="mock data 기반으로 그룹, 상장연도, 산업, 테마, 가격 조건, 이동평균선 회복 여부를 필터링합니다."
      />
      <StocksPageClient stocks={stockDetails} />
    </div>
  );
}
