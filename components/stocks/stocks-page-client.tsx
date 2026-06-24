"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import type { StockDetail, StockGroup } from "@/types/stock";

type GroupFilter = "ALL" | StockGroup;

type SortKey =
  | "listing_date"
  | "total_score"
  | "return_vs_ipo"
  | "drawdown_from_high"
  | "volume_ratio_20d";

type StocksPageClientProps = {
  stocks: StockDetail[];
};

const groupFilters: { label: string; value: GroupFilter }[] = [
  { label: "전체", value: "ALL" },
  { label: "S", value: "S" },
  { label: "A", value: "A" },
  { label: "B", value: "B" },
  { label: "C", value: "C" },
  { label: "D", value: "D" },
];

const sortOptions: { label: string; value: SortKey }[] = [
  { label: "상장일", value: "listing_date" },
  { label: "그룹 총점", value: "total_score" },
  { label: "공모가 대비 수익률", value: "return_vs_ipo" },
  { label: "전고점 대비 하락률", value: "drawdown_from_high" },
  { label: "거래량 배수", value: "volume_ratio_20d" },
];

function getGroup(stock: StockDetail) {
  return stock.group_score?.current_group ?? "C";
}

function getListingYears(stocks: StockDetail[]) {
  return Array.from(
    new Set(stocks.map((stock) => stock.company.listing_date.slice(0, 4))),
  ).sort((a, b) => Number(b) - Number(a));
}

function currencyOrDash(value: number | null | undefined) {
  return value === null || value === undefined
    ? "-"
    : `${formatCurrency(value)}원`;
}

function percentOrDash(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : formatPercent(value);
}

function hasIpoPrice(stock: StockDetail) {
  return stock.company.adjusted_ipo_price > 0;
}

function returnVsIpoOrDash(stock: StockDetail) {
  if (!hasIpoPrice(stock)) return "-";
  return percentOrDash(stock.metrics?.return_vs_ipo);
}

function volumeRatioOrDash(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : `${value.toFixed(1)}배`;
}

export function StocksPageClient({ stocks }: StocksPageClientProps) {
  const [groupFilter, setGroupFilter] = useState<GroupFilter>("ALL");
  const [listingYear, setListingYear] = useState("ALL");
  const [industryQuery, setIndustryQuery] = useState("");
  const [themeQuery, setThemeQuery] = useState("");
  const [belowIpoOnly, setBelowIpoOnly] = useState(false);
  const [deepDrawdownOnly, setDeepDrawdownOnly] = useState(false);
  const [volumeSpikeOnly, setVolumeSpikeOnly] = useState(false);
  const [ma60RecoveredOnly, setMa60RecoveredOnly] = useState(false);
  const [ma120RecoveredOnly, setMa120RecoveredOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("listing_date");

  const listingYears = useMemo(() => getListingYears(stocks), [stocks]);

  const filteredStocks = useMemo(() => {
    return stocks
      .filter((stock) => {
        const metrics = stock.metrics;
        const group = getGroup(stock);
        const industryMatch = stock.company.industry
          .toLowerCase()
          .includes(industryQuery.trim().toLowerCase());
        const themeMatch = stock.company.theme_tags.some((tag) =>
          tag.toLowerCase().includes(themeQuery.trim().toLowerCase()),
        );

        if (groupFilter !== "ALL" && group !== groupFilter) return false;
        if (listingYear !== "ALL" && !stock.company.listing_date.startsWith(listingYear)) return false;
        if (industryQuery.trim() && !industryMatch) return false;
        if (themeQuery.trim() && !themeMatch) return false;
        if (
          belowIpoOnly &&
          (!metrics ||
            !hasIpoPrice(stock) ||
            metrics.current_price > stock.company.adjusted_ipo_price)
        )
          return false;
        if (
          deepDrawdownOnly &&
          (!metrics || metrics.drawdown_from_high > -50)
        )
          return false;
        if (
          volumeSpikeOnly &&
          (!metrics || metrics.volume_ratio_20d < 1.5)
        )
          return false;
        if (
          ma60RecoveredOnly &&
          (!metrics || metrics.current_price < metrics.ma60)
        )
          return false;
        if (
          ma120RecoveredOnly &&
          (!metrics || metrics.current_price < metrics.ma120)
        )
          return false;

        return true;
      })
      .sort((a, b) => {
        if (sortKey === "listing_date") {
          return (
            new Date(b.company.listing_date).getTime() -
            new Date(a.company.listing_date).getTime()
          );
        }

        if (sortKey === "total_score") {
          return (
            (b.group_score?.total_score ?? -Infinity) -
            (a.group_score?.total_score ?? -Infinity)
          );
        }

        return (
          (b.metrics?.[sortKey] ?? -Infinity) -
          (a.metrics?.[sortKey] ?? -Infinity)
        );
      });
  }, [
    belowIpoOnly,
    deepDrawdownOnly,
    groupFilter,
    industryQuery,
    listingYear,
    ma120RecoveredOnly,
    ma60RecoveredOnly,
    sortKey,
    stocks,
    themeQuery,
    volumeSpikeOnly,
  ]);

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-line bg-white p-5 shadow-soft">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">그룹</p>
            <div className="flex flex-wrap gap-2">
              {groupFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setGroupFilter(filter.value)}
                  className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                    groupFilter === filter.value
                      ? "border-accent bg-accent text-white"
                      : "border-line bg-panel text-ink hover:border-accent"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-ink">상장연도</span>
            <select
              value={listingYear}
              onChange={(event) => setListingYear(event.target.value)}
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink"
            >
              <option value="ALL">전체</option>
              {listingYears.map((year) => (
                <option key={year} value={year}>
                  {year}년
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-ink">산업 검색</span>
            <input
              value={industryQuery}
              onChange={(event) => setIndustryQuery(event.target.value)}
              placeholder="예: 반도체"
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-ink">테마 검색</span>
            <input
              value={themeQuery}
              onChange={(event) => setThemeQuery(event.target.value)}
              placeholder="예: AI"
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink"
            />
          </label>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-2 text-sm font-medium text-ink">
            <input type="checkbox" checked={belowIpoOnly} onChange={(event) => setBelowIpoOnly(event.target.checked)} className="h-4 w-4 accent-accent" />
            공모가 이하
          </label>
          <label className="flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-2 text-sm font-medium text-ink">
            <input type="checkbox" checked={deepDrawdownOnly} onChange={(event) => setDeepDrawdownOnly(event.target.checked)} className="h-4 w-4 accent-accent" />
            전고점 대비 -50% 이하
          </label>
          <label className="flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-2 text-sm font-medium text-ink">
            <input type="checkbox" checked={volumeSpikeOnly} onChange={(event) => setVolumeSpikeOnly(event.target.checked)} className="h-4 w-4 accent-accent" />
            거래량 1.5배 이상
          </label>
          <label className="flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-2 text-sm font-medium text-ink">
            <input type="checkbox" checked={ma60RecoveredOnly} onChange={(event) => setMa60RecoveredOnly(event.target.checked)} className="h-4 w-4 accent-accent" />
            60일선 회복
          </label>
          <label className="flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-2 text-sm font-medium text-ink">
            <input type="checkbox" checked={ma120RecoveredOnly} onChange={(event) => setMa120RecoveredOnly(event.target.checked)} className="h-4 w-4 accent-accent" />
            120일선 회복
          </label>
          <select
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value as SortKey)}
            className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} 정렬
              </option>
            ))}
          </select>
        </div>
      </section>

      <p className="text-sm font-semibold text-muted">총 {filteredStocks.length}개 종목</p>

      <section className="hidden overflow-hidden rounded-md border border-line bg-white shadow-soft xl:block">
        <div className="overflow-x-auto">
          <table className="min-w-[1400px] divide-y divide-line text-sm">
            <thead className="bg-panel">
              <tr className="text-left text-muted">
                <th className="px-4 py-3 font-semibold">그룹</th>
                <th className="px-4 py-3 font-semibold">종목명</th>
                <th className="px-4 py-3 font-semibold">종목코드</th>
                <th className="px-4 py-3 font-semibold">상장일</th>
                <th className="px-4 py-3 font-semibold">산업</th>
                <th className="px-4 py-3 font-semibold">공모가</th>
                <th className="px-4 py-3 font-semibold">현재가</th>
                <th className="px-4 py-3 font-semibold">공모가 대비 수익률</th>
                <th className="px-4 py-3 font-semibold">전고점 대비 하락률</th>
                <th className="px-4 py-3 font-semibold">저점 대비 반등률</th>
                <th className="px-4 py-3 font-semibold">거래량 배수</th>
                <th className="px-4 py-3 font-semibold">테마태그</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredStocks.map((stock) => {
                const metrics = stock.metrics;
                const group = getGroup(stock);

                return (
                  <tr key={stock.company.stock_code} className="transition hover:bg-panel/70">
                    <td className="px-4 py-4 font-bold text-accent">{group}</td>
                    <td className="px-4 py-4">
                      <Link href={`/stocks/${stock.company.stock_code}`} className="font-semibold text-ink hover:text-accent">
                        {stock.company.company_name}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-muted">{stock.company.stock_code}</td>
                    <td className="px-4 py-4 text-muted">{formatDate(stock.company.listing_date)}</td>
                    <td className="px-4 py-4 text-muted">{stock.company.industry}</td>
                    <td className="px-4 py-4">
                      {hasIpoPrice(stock)
                        ? `${formatCurrency(stock.company.adjusted_ipo_price)}원`
                        : "-"}
                    </td>
                    <td className="px-4 py-4 font-semibold">{currencyOrDash(metrics?.current_price)}</td>
                    <td className="px-4 py-4 font-semibold text-accent">{returnVsIpoOrDash(stock)}</td>
                    <td className="px-4 py-4 font-semibold text-red-600">{percentOrDash(metrics?.drawdown_from_high)}</td>
                    <td className="px-4 py-4 font-semibold text-accent">{percentOrDash(metrics?.rebound_from_low)}</td>
                    <td className="px-4 py-4">{volumeRatioOrDash(metrics?.volume_ratio_20d)}</td>
                    <td className="px-4 py-4">
                      <div className="flex max-w-xs flex-wrap gap-1">
                        {stock.company.theme_tags.map((tag) => (
                          <span key={tag} className="rounded-md bg-panel px-2 py-1 text-xs text-muted">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-3 xl:hidden">
        {filteredStocks.map((stock) => {
          const metrics = stock.metrics;
          const group = getGroup(stock);

          return (
            <Link
              key={stock.company.stock_code}
              href={`/stocks/${stock.company.stock_code}`}
              className="rounded-md border border-line bg-white p-4 shadow-soft transition hover:border-accent"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-bold text-ink">{stock.company.company_name}</p>
                  <p className="mt-1 text-sm text-muted">
                    {stock.company.stock_code} · {formatDate(stock.company.listing_date)}
                  </p>
                </div>
                <span className="rounded-md bg-panel px-2 py-1 text-sm font-bold text-accent">
                  {group}그룹
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted">산업</p>
                  <p className="mt-1 font-semibold text-ink">{stock.company.industry}</p>
                </div>
                <div>
                  <p className="text-muted">현재가</p>
                  <p className="mt-1 font-semibold text-ink">{currencyOrDash(metrics?.current_price)}</p>
                </div>
                <div>
                  <p className="text-muted">공모가 대비</p>
                  <p className="mt-1 font-semibold text-accent">{returnVsIpoOrDash(stock)}</p>
                </div>
                <div>
                  <p className="text-muted">거래량 배수</p>
                  <p className="mt-1 font-semibold text-ink">{volumeRatioOrDash(metrics?.volume_ratio_20d)}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1">
                {stock.company.theme_tags.map((tag) => (
                  <span key={tag} className="rounded-md bg-panel px-2 py-1 text-xs text-muted">
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
