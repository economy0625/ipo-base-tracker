import { groupLabels } from "@/lib/groups";
import type { StockGroup } from "@/types/stock";

type GroupDistributionProps = {
  counts: Record<StockGroup, number>;
};

const groups: StockGroup[] = ["S", "A", "B", "C", "D"];

export function GroupDistribution({ counts }: GroupDistributionProps) {
  const total = groups.reduce((sum, group) => sum + counts[group], 0);

  return (
    <section className="mt-8 rounded-md border border-line bg-white p-5 shadow-soft">
      <h3 className="text-lg font-bold text-ink">그룹별 종목 수</h3>
      <div className="mt-5 space-y-4">
        {groups.map((group) => {
          const percent = total === 0 ? 0 : (counts[group] / total) * 100;

          return (
            <div key={group}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-ink">{groupLabels[group]}</span>
                <span className="text-muted">{counts[group]}개</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-panel">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
