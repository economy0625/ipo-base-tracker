export function TopHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-white/95 backdrop-blur">
      <div className="flex min-h-16 items-center justify-between gap-4 px-5">
        <div>
          <p className="text-sm font-semibold text-accent">IPO Base Tracker</p>
          <h1 className="text-base font-bold text-ink">
            신규 상장주 베이스 모니터링
          </h1>
        </div>
        <div className="hidden rounded-md border border-line bg-panel px-3 py-2 text-sm text-muted sm:block">
          Mock data 모드
        </div>
      </div>
    </header>
  );
}
