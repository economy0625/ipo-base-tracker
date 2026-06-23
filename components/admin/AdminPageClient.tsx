"use client";

import { useMemo, useState, useTransition } from "react";
import { updateAdminStock } from "@/app/admin/actions";
import { GroupBadge } from "@/components/stocks/GroupBadge";
import type { StockDetail, StockGroup } from "@/types/stock";

type AdminPageClientProps = {
  initialStocks: StockDetail[];
  isSupabaseConnected: boolean;
};

type EditableStock = {
  stock_code: string;
  company_name: string;
  current_group: StockGroup;
  group_reason: string;
  industry: string;
  theme_tags_text: string;
  business_summary: string;
  is_tech_special: boolean;
  is_bio: boolean;
  is_manual: boolean;
};

const groups: StockGroup[] = ["S", "A", "B", "C", "D"];

function toEditableStock(stock: StockDetail): EditableStock {
  return {
    stock_code: stock.company.stock_code,
    company_name: stock.company.company_name,
    current_group: stock.group_score?.current_group ?? "C",
    group_reason: stock.group_score?.group_reason ?? "",
    industry: stock.company.industry,
    theme_tags_text: stock.company.theme_tags.join(", "),
    business_summary: stock.company.business_summary,
    is_tech_special: stock.company.is_tech_special,
    is_bio: stock.company.is_bio,
    is_manual: stock.group_score?.is_manual ?? false,
  };
}

export function AdminPageClient({
  initialStocks,
  isSupabaseConnected,
}: AdminPageClientProps) {
  const [stocks, setStocks] = useState(initialStocks);
  const [selectedCode, setSelectedCode] = useState(
    initialStocks[0]?.company.stock_code ?? "",
  );
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedStock = useMemo(
    () => stocks.find((stock) => stock.company.stock_code === selectedCode) ?? null,
    [selectedCode, stocks],
  );
  const [form, setForm] = useState<EditableStock | null>(
    selectedStock ? toEditableStock(selectedStock) : null,
  );

  function selectStock(code: string) {
    const stock = stocks.find((item) => item.company.stock_code === code);
    setSelectedCode(code);
    setForm(stock ? toEditableStock(stock) : null);
    setMessage(null);
  }

  function updateForm<K extends keyof EditableStock>(key: K, value: EditableStock[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function applyLocalUpdate(updated: EditableStock) {
    setStocks((current) =>
      current.map((stock) => {
        if (stock.company.stock_code !== updated.stock_code) {
          return stock;
        }

        return {
          ...stock,
          company: {
            ...stock.company,
            industry: updated.industry,
            theme_tags: updated.theme_tags_text
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
            business_summary: updated.business_summary,
            is_tech_special: updated.is_tech_special,
            is_bio: updated.is_bio,
          },
          group_score: stock.group_score
            ? {
                ...stock.group_score,
                current_group: updated.current_group,
                group_reason: updated.group_reason,
                is_manual: updated.is_manual,
              }
            : {
                current_group: updated.current_group,
                total_score: 0,
                chart_score: 0,
                volume_score: 0,
                financial_score: 0,
                business_score: 0,
                risk_score: 0,
                group_reason: updated.group_reason,
                is_manual: updated.is_manual,
              },
        };
      }),
    );
  }

  function save() {
    if (!form) return;

    const payload = {
      stock_code: form.stock_code,
      current_group: form.current_group,
      group_reason: form.group_reason,
      industry: form.industry,
      theme_tags: form.theme_tags_text
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      business_summary: form.business_summary,
      is_tech_special: form.is_tech_special,
      is_bio: form.is_bio,
      is_manual: form.is_manual,
    };

    if (!isSupabaseConnected) {
      applyLocalUpdate(form);
      setMessage({
        type: "success",
        text: "Supabase가 연결되어 있지 않아 mock 상태에서만 저장되었습니다.",
      });
      return;
    }

    startTransition(async () => {
      const result = await updateAdminStock(payload);

      setMessage({
        type: result.ok ? "success" : "error",
        text: result.message,
      });

      if (result.ok) {
        applyLocalUpdate(form);
      }
    });
  }

  if (!form) {
    return (
      <div className="rounded-md border border-line bg-white p-8 text-center text-muted">
        수정할 종목이 없습니다.
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <section className="rounded-md border border-line bg-white shadow-soft">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold text-ink">전체 종목</h2>
          <p className="mt-1 text-sm text-muted">총 {stocks.length}개</p>
        </div>
        <div className="max-h-[720px] divide-y divide-line overflow-y-auto">
          {stocks.map((stock) => {
            const group = stock.group_score?.current_group ?? "C";
            const selected = stock.company.stock_code === selectedCode;

            return (
              <button
                key={stock.company.stock_code}
                type="button"
                onClick={() => selectStock(stock.company.stock_code)}
                className={`w-full px-5 py-4 text-left transition hover:bg-panel ${
                  selected ? "bg-panel" : "bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{stock.company.company_name}</p>
                    <p className="mt-1 text-sm text-muted">
                      {stock.company.stock_code} · {stock.company.industry}
                    </p>
                  </div>
                  <GroupBadge group={group} />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-md border border-line bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-accent">종목 수정</p>
            <h2 className="mt-1 text-2xl font-bold text-ink">{form.company_name}</h2>
            <p className="mt-1 text-sm text-muted">{form.stock_code}</p>
          </div>
          <div className="rounded-md border border-line bg-panel px-3 py-2 text-sm text-muted">
            {isSupabaseConnected ? "Supabase 저장 모드" : "Mock 편집 모드"}
          </div>
        </div>

        {message ? (
          <div
            className={`mt-5 rounded-md border px-4 py-3 text-sm font-semibold ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {message.text}
          </div>
        ) : null}

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-ink">그룹</span>
            <select
              value={form.current_group}
              onChange={(event) =>
                updateForm("current_group", event.target.value as StockGroup)
              }
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink"
            >
              {groups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-ink">산업</span>
            <input
              value={form.industry}
              onChange={(event) => updateForm("industry", event.target.value)}
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink"
            />
          </label>

          <label className="block lg:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-ink">
              그룹 판정 사유
            </span>
            <textarea
              value={form.group_reason}
              onChange={(event) => updateForm("group_reason", event.target.value)}
              rows={3}
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm leading-6 text-ink"
            />
          </label>

          <label className="block lg:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-ink">
              테마태그
            </span>
            <input
              value={form.theme_tags_text}
              onChange={(event) => updateForm("theme_tags_text", event.target.value)}
              placeholder="쉼표로 구분"
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink"
            />
          </label>

          <label className="block lg:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-ink">
              사업성 요약
            </span>
            <textarea
              value={form.business_summary}
              onChange={(event) => updateForm("business_summary", event.target.value)}
              rows={4}
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm leading-6 text-ink"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-3 lg:col-span-2">
            <CheckboxField
              label="기술특례 여부"
              checked={form.is_tech_special}
              onChange={(checked) => updateForm("is_tech_special", checked)}
            />
            <CheckboxField
              label="바이오 여부"
              checked={form.is_bio}
              onChange={(checked) => updateForm("is_bio", checked)}
            />
            <CheckboxField
              label="수동분류 여부"
              checked={form.is_manual}
              onChange={(checked) => updateForm("is_manual", checked)}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="rounded-md bg-accent px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "저장 중..." : "저장"}
          </button>
        </div>
      </section>
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-3 text-sm font-semibold text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-accent"
      />
      {label}
    </label>
  );
}
