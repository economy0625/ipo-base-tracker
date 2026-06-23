import { formatPercent } from "@/lib/format";
import type { DashboardMetric } from "@/types/stock";

type MetricCardsProps = {
  metrics: DashboardMetric[];
  averageChangeRate: number;
};

export function MetricCards({ metrics, averageChangeRate }: MetricCardsProps) {
  return (
    <section className="grid gap-4 md:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-md border border-line bg-white p-5 shadow-soft"
        >
          <p className="text-sm font-medium text-muted">{metric.label}</p>
          <p className="mt-2 text-2xl font-bold text-ink">{metric.value}</p>
          <p className="mt-2 text-sm text-muted">{metric.description}</p>
        </div>
      ))}
      <div className="rounded-md border border-line bg-white p-5 shadow-soft">
        <p className="text-sm font-medium text-muted">평균 수익률</p>
        <p className="mt-2 text-2xl font-bold text-ink">
          {formatPercent(averageChangeRate)}
        </p>
        <p className="mt-2 text-sm text-muted">공모가 대비 단순 평균</p>
      </div>
    </section>
  );
}
