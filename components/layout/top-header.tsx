import { getDataMode } from "@/lib/supabase";

export async function TopHeader() {
  const dataMode = await getDataMode();
  const modeLabel =
    dataMode === "full"
      ? "Supabase data 모드"
      : dataMode === "partial"
        ? "Supabase 부분 연결"
        : "Mock data 모드";

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-white/95 backdrop-blur">
      <div className="flex min-h-16 items-center justify-between gap-4 px-5">
        <div>
          <p className="text-sm font-semibold text-accent">IPO Base Tracker</p>
          <h1 className="text-base font-bold text-ink">
            신규 상장주 베이스 모니터링
          </h1>
        </div>
        <div
          className={`hidden rounded-md border px-3 py-2 text-sm sm:block ${
            dataMode === "partial"
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-line bg-panel text-muted"
          }`}
        >
          {modeLabel}
        </div>
      </div>
    </header>
  );
}
