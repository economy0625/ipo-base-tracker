"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
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
  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: true,
      message: "Supabase가 연결되어 있지 않아 mock 상태에서만 저장되었습니다.",
    };
  }

  const now = new Date().toISOString();

  const { error: companyError } = await supabase
    .from("companies")
    .update({
      industry: input.industry,
      theme_tags: input.theme_tags,
      business_summary: input.business_summary,
      is_tech_special: input.is_tech_special,
      is_bio: input.is_bio,
      updated_at: now,
    })
    .eq("stock_code", input.stock_code);

  if (companyError) {
    return {
      ok: false,
      message: `회사 정보 저장 실패: ${companyError.message}`,
    };
  }

  const { error: groupError } = await supabase
    .from("group_scores")
    .update({
      current_group: input.current_group,
      group_reason: input.group_reason,
      is_manual: input.is_manual,
      updated_at: now,
    })
    .eq("stock_code", input.stock_code);

  if (groupError) {
    return {
      ok: false,
      message: `그룹 정보 저장 실패: ${groupError.message}`,
    };
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/stocks");
  revalidatePath(`/stocks/${input.stock_code}`);
  revalidatePath(`/groups/${input.current_group.toLowerCase()}`);

  return {
    ok: true,
    message: "Supabase에 저장되었습니다.",
  };
}
