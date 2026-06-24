export const WATCHLIST_STORAGE_KEY = "ipo-base-tracker.watchlist.v1";

export const watchlistReasons = [
  "B그룹 바닥권",
  "A그룹 회복",
  "S그룹 돌파",
  "거래량 급증",
  "공모가 회복",
  "사업성 관심",
  "기타",
] as const;

export type WatchlistReason = (typeof watchlistReasons)[number];

export type WatchlistItem = {
  stock_code: string;
  reason: WatchlistReason;
  note: string;
  registered_at: string;
};

export interface WatchlistStorage {
  load(): WatchlistItem[];
  save(items: WatchlistItem[]): void;
}

function normalizeStockCode(value: unknown) {
  return String(value ?? "")
    .replace(/\.0$/, "")
    .trim()
    .padStart(6, "0");
}

function isWatchlistReason(value: unknown): value is WatchlistReason {
  return watchlistReasons.includes(value as WatchlistReason);
}

function normalizeItem(value: unknown): WatchlistItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<WatchlistItem>;
  const stockCode = normalizeStockCode(item.stock_code);
  if (!/^\d{6}$/.test(stockCode)) return null;

  return {
    stock_code: stockCode,
    reason: isWatchlistReason(item.reason) ? item.reason : "기타",
    note: typeof item.note === "string" ? item.note : "",
    registered_at:
      typeof item.registered_at === "string" && item.registered_at
        ? item.registered_at
        : new Date().toISOString(),
  };
}

export const localWatchlistStorage: WatchlistStorage = {
  load() {
    if (typeof window === "undefined") return [];

    try {
      const raw = window.localStorage.getItem(WATCHLIST_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      const items = parsed
        .map(normalizeItem)
        .filter((item): item is WatchlistItem => item !== null);
      return Array.from(
        new Map(items.map((item) => [item.stock_code, item])).values(),
      );
    } catch {
      return [];
    }
  },

  save(items) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(items));
  },
};

export function createWatchlistItem(
  stockCode: string,
  reason: WatchlistReason,
): WatchlistItem {
  return {
    stock_code: normalizeStockCode(stockCode),
    reason,
    note: "",
    registered_at: new Date().toISOString(),
  };
}
