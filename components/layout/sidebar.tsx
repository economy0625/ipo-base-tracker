import Link from "next/link";

const menuItems = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/stocks", label: "전체 종목" },
  { href: "/groups/s", label: "S그룹" },
  { href: "/groups/a", label: "A그룹" },
  { href: "/groups/b", label: "B그룹" },
  { href: "/groups/c", label: "C그룹" },
  { href: "/groups/d", label: "D그룹" },
  { href: "/signals", label: "오늘의 신호" },
  { href: "/backtest", label: "백테스트" },
  { href: "/watchlist", label: "관심종목" },
  { href: "/admin", label: "관리자" },
];

export function Sidebar() {
  return (
    <aside className="border-b border-line bg-ink text-white lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-col">
        <Link href="/dashboard" className="border-b border-white/10 px-5 py-5">
          <span className="block text-lg font-bold">IPO Base Tracker</span>
          <span className="mt-1 block text-sm text-white/65">
            코스닥 IPO 베이스 추적
          </span>
        </Link>
        <nav className="flex gap-2 overflow-x-auto px-3 py-3 lg:flex-1 lg:flex-col lg:overflow-visible">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-md px-3 py-2 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
