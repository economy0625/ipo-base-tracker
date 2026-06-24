import Link from "next/link";
import { groupDefinitions } from "@/lib/groups";
import type { StockGroup } from "@/types/stock";

type GroupDistributionProps = {
  counts: Record<StockGroup, number>;
};

const groups: StockGroup[] = ["S", "A", "B", "C", "D"];
const barColors: Record<StockGroup, string> = {
  S: "bg-emerald-600",
  A: "bg-sky-500",
  B: "bg-amber-500",
  C: "bg-slate-400",
  D: "bg-rose-500",
};

export function GroupDistribution({ counts }: GroupDistributionProps) {
  const total = groups.reduce((sum, group) => sum + counts[group], 0);

  return (
    <section className="rounded-md border border-line bg-white p-5 shadow-soft">
      <div>
        <h2 className="text-lg font-bold text-ink">그룹별 비중</h2>
        <p className="mt-1 text-sm text-muted">
          그룹 분류가 완료된 {total.toLocaleString("ko-KR")}개 종목 기준
        </p>
      </div>
      <div className="mt-5 space-y-4">
        {groups.map((group) => {
          const percent = total === 0 ? 0 : (counts[group] / total) * 100;
          const definition = groupDefinitions[group];

          return (
            <Link
              key={group}
              href={`/groups/${group.toLowerCase()}`}
              className="block rounded-md border border-transparent p-2 transition hover:border-line hover:bg-panel"
            >
              <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                <span className="font-semibold text-ink">
                  {definition.label} · {definition.statusLabel}
                </span>
                <span className="text-muted">
                  {counts[group]}개 · {percent.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-panel">
                <div
                  className={`h-full rounded-full ${barColors[group]}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
