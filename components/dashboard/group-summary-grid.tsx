import Link from "next/link";
import { groupDescriptions, groupLabels, getGroupRoute } from "@/lib/groups";
import type { StockGroup } from "@/types/stock";

type GroupSummaryGridProps = {
  counts: Record<StockGroup, number>;
};

const groups: StockGroup[] = ["S", "A", "B", "C", "D"];

export function GroupSummaryGrid({ counts }: GroupSummaryGridProps) {
  return (
    <section className="mt-8 grid gap-4 lg:grid-cols-5">
      {groups.map((group) => (
        <Link
          key={group}
          href={getGroupRoute(group)}
          className="rounded-md border border-line bg-white p-5 shadow-soft transition hover:border-accent"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-ink">{groupLabels[group]}</h3>
            <span className="text-2xl font-bold text-accent">
              {counts[group]}
            </span>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted">
            {groupDescriptions[group]}
          </p>
        </Link>
      ))}
    </section>
  );
}
