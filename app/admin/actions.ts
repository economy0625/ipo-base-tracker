"use server";

import type { StockGroup } from "@/types/stock";

export type AdminStockUpdateInput = {
  stock_code: string;
  current_group: StockGroup;
  group_reason: string;
  industry: string;
  theme_tags: string[];
  business_summary: string;
  is_tech_special: boolean;
  is_bio: boolean;
  is_manual: boolean;
};

export async function updateAdminStock(input: AdminStockUpdateInput) {
  void input;
  return {
    ok: false,
    message:
      "현재는 Supabase 저장 미지원 상태입니다. 관리자 인증과 권한 검증이 적용된 서버 저장 경로가 준비된 뒤 활성화됩니다.",
  };
}
