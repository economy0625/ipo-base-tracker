import { formatCurrency } from "@/lib/format";
import type { DailyPrice, IpoMetrics } from "@/types/stock";

type StockPriceChartProps = {
  prices: DailyPrice[];
  adjustedIpoPrice: number;
  metrics: IpoMetrics;
};

const width = 900;
const priceHeight = 260;
const volumeHeight = 88;
const padding = 34;
const chartBottom = priceHeight - padding;
const chartTop = padding;

function scaleY(value: number, min: number, max: number) {
  if (max === min) return chartBottom;
  return chartBottom - ((value - min) / (max - min)) * (chartBottom - chartTop);
}

function scaleX(index: number, total: number) {
  if (total <= 1) return padding;
  return padding + (index / (total - 1)) * (width - padding * 2);
}

function linePath(values: number[], min: number, max: number) {
  return values
    .map((value, index) => `${scaleX(index, values.length)},${scaleY(value, min, max)}`)
    .join(" ");
}

export function StockPriceChart({
  prices,
  adjustedIpoPrice,
  metrics,
}: StockPriceChartProps) {
  const closes = prices.map((price) => price.close);
  const volumes = prices.map((price) => price.volume);
  const priceLines = [
    adjustedIpoPrice,
    metrics.post_listing_high,
    metrics.ma20,
    metrics.ma60,
    metrics.ma120,
  ];
  const minPrice = Math.min(...closes, ...priceLines) * 0.94;
  const maxPrice = Math.max(...closes, ...priceLines) * 1.06;
  const maxVolume = Math.max(...volumes);
  const volumeTop = priceHeight + 18;
  const volumeBottom = priceHeight + volumeHeight;

  const referenceLines = [
    { label: "공모가", value: adjustedIpoPrice, color: "#64748b" },
    { label: "전고점", value: metrics.post_listing_high, color: "#dc2626" },
    { label: "MA20", value: metrics.ma20, color: "#059669" },
    { label: "MA60", value: metrics.ma60, color: "#2563eb" },
    { label: "MA120", value: metrics.ma120, color: "#7c3aed" },
  ];

  return (
    <section className="rounded-md border border-line bg-white p-5 shadow-soft">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-ink">가격 차트</h2>
        <div className="flex flex-wrap gap-3 text-xs text-muted">
          {referenceLines.map((line) => (
            <span key={line.label} className="inline-flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: line.color }}
              />
              {line.label}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          role="img"
          aria-label="가격, 이동평균선, 공모가, 전고점, 거래량 차트"
          viewBox={`0 0 ${width} ${priceHeight + volumeHeight + 24}`}
          className="min-w-[760px]"
        >
          <rect x="0" y="0" width={width} height={priceHeight + volumeHeight + 24} fill="#ffffff" />
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = chartTop + tick * (chartBottom - chartTop);
            const value = maxPrice - tick * (maxPrice - minPrice);
            return (
              <g key={tick}>
                <line x1={padding} x2={width - padding} y1={y} y2={y} stroke="#e5ece6" />
                <text x={padding} y={y - 6} fontSize="11" fill="#66736a">
                  {formatCurrency(Math.round(value))}
                </text>
              </g>
            );
          })}

          {referenceLines.map((line) => {
            const y = scaleY(line.value, minPrice, maxPrice);
            return (
              <g key={line.label}>
                <line
                  x1={padding}
                  x2={width - padding}
                  y1={y}
                  y2={y}
                  stroke={line.color}
                  strokeDasharray={line.label.startsWith("MA") ? "0" : "6 5"}
                  strokeWidth="1.6"
                  opacity="0.9"
                />
                <text x={width - padding - 54} y={y - 6} fontSize="11" fill={line.color}>
                  {line.label}
                </text>
              </g>
            );
          })}

          <polyline
            fill="none"
            stroke="#17211b"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
            points={linePath(closes, minPrice, maxPrice)}
          />

          <line x1={padding} x2={width - padding} y1={volumeTop} y2={volumeTop} stroke="#e5ece6" />
          {prices.map((price, index) => {
            const barWidth = Math.max(5, (width - padding * 2) / prices.length - 4);
            const barHeight = (price.volume / maxVolume) * (volumeBottom - volumeTop);
            return (
              <rect
                key={price.trade_date}
                x={scaleX(index, prices.length) - barWidth / 2}
                y={volumeBottom - barHeight}
                width={barWidth}
                height={barHeight}
                rx="2"
                fill="#9ab7a8"
              />
            );
          })}
          <text x={padding} y={volumeTop + 14} fontSize="12" fill="#66736a">
            거래량
          </text>
        </svg>
      </div>
    </section>
  );
}
