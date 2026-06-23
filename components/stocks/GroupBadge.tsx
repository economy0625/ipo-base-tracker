import { groupDefinitions } from "@/lib/groups";
import type { StockGroup } from "@/types/stock";

type GroupBadgeProps = {
  group: StockGroup;
  size?: "sm" | "lg";
};

const sizeClassNames = {
  sm: "px-2 py-1 text-xs",
  lg: "px-3 py-2 text-sm",
};

export function GroupBadge({ group, size = "sm" }: GroupBadgeProps) {
  const definition = groupDefinitions[group];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-bold ${definition.colorClassName} ${sizeClassNames[size]}`}
      aria-label={`${definition.label} ${definition.statusLabel}`}
    >
      <span>{definition.group}</span>
      <span>{definition.statusLabel}</span>
    </span>
  );
}
