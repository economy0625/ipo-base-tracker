import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { GroupBadge } from "@/components/stocks/GroupBadge";
import { StockPriceChart } from "@/components/stocks/StockPriceChart";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { groupDefinitions } from "@/lib/groups";
import { getStockByCode } from "@/lib/supabase";
import type { StockGroup } from "@/types/stock";

type StockDetailPageProps = {
  params: Promise<{
    code: string;
  }>;
};

const investmentStrategies: Record<StockGroup, string> = {
  S: "보유/눌림 재진입",
  A: "비중 확대 후보",
  B: "분할매수 후보",
  C: "관찰",
  D: "소액/제외",
};

function numberOrDash(value: number | null | undefined, suffix = "") {
  if (value === null || value === undefined) return "-";
  return `${formatCurrency(value)}${suffix}`;
}

function percentOrDash(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return formatPercent(value);
}

export default async function StockDetailPage({ params }: StockDetailPageProps) {
  const { code } = await params;
  const stockResult = await getStockByCode(code);

  if (!stockResult) {
    notFound();
  }

  const { stock, dailyPrices } = stockResult;
  const metrics = stock.metrics;
  const groupScore = stock.group_score;
  const pattern = stock.cup_handle_pattern;

  if (!metrics || !groupScore || !pattern) {
    notFound();
  }

  const company = stock.company;
  const group = groupScore.current_group;
  const groupDefinition = groupDefinitions[group];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        eyebrow={`${groupDefinition.label} 상세`}
        title={company.company_name}
        description={company.business_summary}
      />

      <section className="rounded-md border border-line bg-white p-6 shadow-soft">
        <div className="flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold text-ink">{company.company_name}</h2>
              <GroupBadge group={group} size="lg" />
            </div>
            <p className="mt-2 text-sm text-muted">
              종목코드 {company.stock_code} · {company.industry}
            </p>
          </div>
          <Link
            href="/stocks"
            className="inline-flex rounded-md border border-line bg-panel px-4 py-2 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent"
          >
            전체 종목
          </Link>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryItem label="상장일" value={formatDate(company.listing_date)} />
          <SummaryItem label="현재가" value={`${formatCurrency(metrics.current_price)}원`} />
          <SummaryItem label="조정공모가" value={`${formatCurrency(company.adjusted_ipo_price)}원`} />
          <SummaryItem label="공모가 대비 수익률" value={formatPercent(metrics.return_vs_ipo)} tone="up" />
          <SummaryItem label="전고점 대비 하락률" value={formatPercent(metrics.drawdown_from_high)} tone="down" />
          <SummaryItem label="저점 대비 반등률" value={formatPercent(metrics.rebound_from_low)} tone="up" />
          <SummaryItem label="상장 후 경과일" value={`${metrics.days_since_listing}일`} />
          <SummaryItem label="MA20" value={`${formatCurrency(metrics.ma20)}원`} />
          <SummaryItem label="MA60" value={`${formatCurrency(metrics.ma60)}원`} />
          <SummaryItem label="거래량 배수" value={`${metrics.volume_ratio_20d.toFixed(1)}배`} />
        </div>
      </section>

      <StockPriceChart
        prices={dailyPrices}
        adjustedIpoPrice={company.adjusted_ipo_price}
        metrics={metrics}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-md border border-line bg-white p-5 shadow-soft">
          <h2 className="text-lg font-bold text-ink">그룹 판정 근거</h2>
          <div className="mt-4">
            <GroupBadge group={group} size="lg" />
          </div>
          <p className="mt-4 text-sm font-semibold text-ink">그룹 정의</p>
          <p className="mt-2 leading-7 text-muted">{groupDefinition.definition}</p>
          <p className="mt-4 text-sm font-semibold text-ink">전략</p>
          <p className="mt-2 leading-7 text-muted">{groupDefinition.strategy}</p>
          <p className="mt-4 text-sm font-semibold text-ink">판정 사유</p>
          <p className="mt-2 leading-7 text-muted">{groupScore.group_reason}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {groupDefinition.conditions.map((condition) => (
              <span key={condition} className="rounded-md bg-panel px-3 py-2 text-sm text-muted">
                {condition}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-md border border-line bg-white p-5 shadow-soft">
          <h2 className="text-lg font-bold text-ink">컵앤핸들 분석</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <InfoItem label="좌측 고점" value={numberOrDash(pattern.cup_left_peak_price, "원")} />
            <InfoItem label="컵 저점" value={numberOrDash(pattern.cup_low_price, "원")} />
            <InfoItem label="컵 깊이" value={percentOrDash(pattern.cup_depth_percent)} />
            <InfoItem label="베이스 기간" value={`${pattern.base_days}일`} />
            <InfoItem label="손잡이 깊이" value={percentOrDash(pattern.handle_depth_percent)} />
            <InfoItem label="피벗 가격" value={numberOrDash(pattern.pivot_price, "원")} />
            <InfoItem label="돌파일" value={pattern.breakout_date ? formatDate(pattern.breakout_date) : "-"} />
            <InfoItem
              label="돌파 거래량"
              value={pattern.breakout_volume_ratio ? `${pattern.breakout_volume_ratio.toFixed(1)}배` : "-"}
            />
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-md border border-line bg-white p-5 shadow-soft">
          <h2 className="text-lg font-bold text-ink">사업성 요약</h2>
          <p className="mt-3 leading-7 text-muted">{company.business_summary}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {company.theme_tags.map((tag) => (
              <span key={tag} className="rounded-md bg-panel px-3 py-2 text-sm text-muted">
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <InfoItem label="기술특례" value={company.is_tech_special ? "해당" : "미해당"} />
            <InfoItem label="바이오" value={company.is_bio ? "해당" : "미해당"} />
            <InfoItem label="스팩" value={company.is_spac ? "해당" : "미해당"} />
            <InfoItem label="이전상장" value={company.is_transfer_listing ? "해당" : "미해당"} />
          </div>
        </section>

        <section className="rounded-md border border-line bg-white p-5 shadow-soft">
          <h2 className="text-lg font-bold text-ink">재무 요약</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-line text-sm">
              <thead className="bg-panel">
                <tr className="text-left text-muted">
                  <th className="px-3 py-3 font-semibold">연도</th>
                  <th className="px-3 py-3 font-semibold">매출</th>
                  <th className="px-3 py-3 font-semibold">영업이익</th>
                  <th className="px-3 py-3 font-semibold">순이익</th>
                  <th className="px-3 py-3 font-semibold">영업이익률</th>
                  <th className="px-3 py-3 font-semibold">매출성장률</th>
                  <th className="px-3 py-3 font-semibold">부채비율</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {stock.financials.map((financial) => (
                  <tr key={`${financial.fiscal_year}-${financial.quarter}`}>
                    <td className="px-3 py-3 font-semibold text-ink">
                      {financial.fiscal_year}년 {financial.quarter ? `${financial.quarter}Q` : ""}
                    </td>
                    <td className="px-3 py-3">{numberOrDash(financial.revenue, "백만원")}</td>
                    <td className="px-3 py-3">{numberOrDash(financial.operating_profit, "백만원")}</td>
                    <td className="px-3 py-3">{numberOrDash(financial.net_income, "백만원")}</td>
                    <td className="px-3 py-3">{percentOrDash(financial.operating_margin)}</td>
                    <td className="px-3 py-3">{percentOrDash(financial.revenue_growth)}</td>
                    <td className="px-3 py-3">{percentOrDash(financial.debt_ratio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="rounded-md border border-line bg-white p-5 shadow-soft">
        <h2 className="text-lg font-bold text-ink">투자전략</h2>
        <p className="mt-3 text-2xl font-bold text-accent">{investmentStrategies[group]}</p>
        <p className="mt-3 leading-7 text-muted">
          현재 {groupDefinition.label}은 {groupDefinition.statusLabel} 단계입니다. 이 화면의 전략은
          UI 개발용 mock data를 기반으로 표시되며 실제 투자 판단에는 사용할 수 없습니다.
        </p>
      </section>
    </div>
  );
}

function SummaryItem({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="rounded-md border border-line bg-panel p-4">
      <p className="text-sm text-muted">{label}</p>
      <p
        className={`mt-2 text-lg font-bold ${
          tone === "up" ? "text-accent" : tone === "down" ? "text-red-600" : "text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-panel p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-semibold text-ink">{value}</p>
    </div>
  );
}
