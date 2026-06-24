import { AdminPageClient } from "@/components/admin/AdminPageClient";
import { PageHeader } from "@/components/layout/page-header";
import { getStockDetails } from "@/lib/supabase";

export default async function AdminPage() {
  const stocks = await getStockDetails();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow="관리"
        title="관리자"
        description="종목의 그룹, 판정 사유, 산업, 테마, 사업성 요약과 분류 플래그를 수정합니다."
      />
      <AdminPageClient initialStocks={stocks} />
    </div>
  );
}
