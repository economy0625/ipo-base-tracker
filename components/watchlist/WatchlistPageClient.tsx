"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { GroupBadge } from "@/components/stocks/GroupBadge";
import { formatDate } from "@/lib/format";
import {
  createWatchlistItem,
  localWatchlistStorage,
  watchlistReasons,
  type WatchlistItem,
  type WatchlistReason,
} from "@/lib/watchlist";
import type { DatabaseSignal, StockDetail } from "@/types/stock";

type WatchlistPageClientProps = {
  stocks: StockDetail[];
  signals: DatabaseSignal[];
};

type Feedback = {
  type: "success" | "error";
  text: string;
} | null;

function getLatestSignals(signals: DatabaseSignal[]) {
  const latest = new Map<string, DatabaseSignal>();
  for (const signal of signals) {
    const current = latest.get(signal.stock_code);
    if (!current || signal.signal_date > current.signal_date) {
      latest.set(signal.stock_code, signal);
    }
  }
  return latest;
}

export function WatchlistPageClient({
  stocks,
  signals,
}: WatchlistPageClientProps) {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [selectedReason, setSelectedReason] =
    useState<WatchlistReason>("사업성 관심");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setItems(localWatchlistStorage.load());
    setIsLoaded(true);
  }, []);

  const stockMap = useMemo(
    () =>
      new Map(stocks.map((stock) => [stock.company.stock_code, stock])),
    [stocks],
  );
  const latestSignalMap = useMemo(
    () => getLatestSignals(signals),
    [signals],
  );
  const registeredCodes = useMemo(
    () => new Set(items.map((item) => item.stock_code)),
    [items],
  );
  const availableStocks = useMemo(
    () =>
      stocks
        .filter((stock) => !registeredCodes.has(stock.company.stock_code))
        .sort((a, b) =>
          a.company.company_name.localeCompare(b.company.company_name, "ko"),
        ),
    [registeredCodes, stocks],
  );

  function persist(nextItems: WatchlistItem[], message: string) {
    try {
      localWatchlistStorage.save(nextItems);
      setItems(nextItems);
      setFeedback({ type: "success", text: message });
    } catch {
      setFeedback({
        type: "error",
        text: "브라우저 저장소에 저장하지 못했습니다.",
      });
    }
  }

  function addStock() {
    if (!selectedCode) {
      setFeedback({ type: "error", text: "관심종목을 선택해 주세요." });
      return;
    }
    if (registeredCodes.has(selectedCode)) {
      setFeedback({ type: "error", text: "이미 등록된 관심종목입니다." });
      return;
    }

    persist(
      [createWatchlistItem(selectedCode, selectedReason), ...items],
      "관심종목을 등록했습니다.",
    );
    setSelectedCode("");
  }

  function updateItem(stockCode: string, patch: Partial<WatchlistItem>) {
    setItems((current) =>
      current.map((item) =>
        item.stock_code === stockCode ? { ...item, ...patch } : item,
      ),
    );
    setFeedback(null);
  }

  function saveItem(stockCode: string) {
    const item = items.find((candidate) => candidate.stock_code === stockCode);
    if (!item) return;
    persist(items, `${stockCode} 관심 정보를 저장했습니다.`);
  }

  function removeItem(stockCode: string) {
    persist(
      items.filter((item) => item.stock_code !== stockCode),
      "관심종목에서 삭제했습니다.",
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-line bg-white p-5 shadow-soft">
        <div className="grid gap-4 lg:grid-cols-[1fr_220px_auto] lg:items-end">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-ink">
              관심종목
            </span>
            <select
              value={selectedCode}
              onChange={(event) => setSelectedCode(event.target.value)}
              className="w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink"
            >
              <option value="">종목을 선택하세요</option>
              {availableStocks.map((stock) => (
                <option
                  key={stock.company.stock_code}
                  value={stock.company.stock_code}
                >
                  {stock.company.company_name} ({stock.company.stock_code})
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-ink">
              관심 사유
            </span>
            <select
              value={selectedReason}
              onChange={(event) =>
                setSelectedReason(event.target.value as WatchlistReason)
              }
              className="w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink"
            >
              {watchlistReasons.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={addStock}
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            관심종목 등록
          </button>
        </div>
        <p className="mt-3 text-xs text-muted">
          관심종목 정보는 현재 브라우저의 localStorage에 저장됩니다.
        </p>
      </section>

      {feedback ? (
        <div
          role="status"
          className={`rounded-md border px-4 py-3 text-sm font-semibold ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {feedback.text}
        </div>
      ) : null}

      {!isLoaded ? (
        <div className="rounded-md border border-line bg-white p-10 text-center text-sm text-muted shadow-soft">
          관심종목을 불러오는 중입니다.
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-line bg-white p-10 text-center shadow-soft">
          <p className="font-semibold text-ink">등록된 관심종목이 없습니다.</p>
          <p className="mt-2 text-sm text-muted">
            위에서 검토할 종목과 관심 사유를 선택해 등록하세요.
          </p>
        </div>
      ) : (
        <section className="grid gap-5 xl:grid-cols-2">
          {items.map((item) => {
            const stock = stockMap.get(item.stock_code);
            const signal = latestSignalMap.get(item.stock_code);
            if (!stock) {
              return (
                <article
                  key={item.stock_code}
                  className="rounded-md border border-amber-200 bg-amber-50 p-5"
                >
                  <p className="font-bold text-amber-900">
                    {item.stock_code} 종목 데이터를 찾을 수 없습니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => removeItem(item.stock_code)}
                    className="mt-4 text-sm font-semibold text-rose-700"
                  >
                    목록에서 삭제
                  </button>
                </article>
              );
            }

            return (
              <article
                key={item.stock_code}
                className="rounded-md border border-line bg-white shadow-soft"
              >
                <div className="border-b border-line p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {stock.group_score ? (
                          <GroupBadge
                            group={stock.group_score.current_group}
                          />
                        ) : (
                          <span className="rounded-md border border-line bg-panel px-2 py-1 text-xs font-semibold text-muted">
                            그룹 미분류
                          </span>
                        )}
                        <Link
                          href={`/stocks/${item.stock_code}`}
                          className="text-lg font-bold text-ink hover:text-accent"
                        >
                          {stock.company.company_name}
                        </Link>
                      </div>
                      <p className="mt-2 text-sm text-muted">
                        {item.stock_code} · {stock.company.industry}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted">total_score</p>
                      <p className="mt-1 text-xl font-bold text-accent">
                        {stock.group_score
                          ? `${stock.group_score.total_score}점`
                          : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md bg-panel p-3">
                      <p className="text-xs text-muted">최근 신호</p>
                      <p className="mt-1 font-semibold text-ink">
                        {signal?.signal_type || "최근 신호 없음"}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {signal ? formatDate(signal.signal_date) : "-"}
                      </p>
                    </div>
                    <div className="rounded-md bg-panel p-3">
                      <p className="text-xs text-muted">관심종목 등록일</p>
                      <p className="mt-1 font-semibold text-ink">
                        {formatDate(item.registered_at)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-5">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-ink">
                      관심 사유
                    </span>
                    <select
                      value={item.reason}
                      onChange={(event) =>
                        updateItem(item.stock_code, {
                          reason: event.target.value as WatchlistReason,
                        })
                      }
                      className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink"
                    >
                      {watchlistReasons.map((reason) => (
                        <option key={reason} value={reason}>
                          {reason}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-ink">
                      투자 검토 메모
                    </span>
                    <textarea
                      value={item.note}
                      onChange={(event) =>
                        updateItem(item.stock_code, {
                          note: event.target.value,
                        })
                      }
                      rows={4}
                      placeholder="확인할 가격대, 실적 일정, 리스크 등을 기록하세요."
                      className="w-full resize-y rounded-md border border-line bg-white px-3 py-2 text-sm leading-6 text-ink"
                    />
                  </label>

                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => removeItem(item.stock_code)}
                      className="rounded-md border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                    >
                      삭제
                    </button>
                    <button
                      type="button"
                      onClick={() => saveItem(item.stock_code)}
                      className="rounded-md bg-accent px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
                    >
                      메모 저장
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
