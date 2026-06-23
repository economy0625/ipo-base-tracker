import type { IpoStock, StockGroup } from "@/types/stock";

export type GroupDefinition = {
  group: StockGroup;
  label: string;
  statusLabel: string;
  definition: string;
  strategy: string;
  conditions: string[];
  colorClassName: string;
};

export const groupDefinitions: Record<StockGroup, GroupDefinition> = {
  S: {
    group: "S",
    label: "S그룹",
    statusLabel: "돌파완료",
    definition: "컵앤핸들 완성 후 전고점 또는 핵심 저항 돌파",
    strategy: "보유와 추세 관리를 우선하며, 눌림 구간에서는 재진입 가능성을 점검한다.",
    conditions: [
      "전고점 또는 핵심 저항 돌파",
      "돌파일 거래량 20일 평균 대비 1.5배 이상",
      "20일선 위에서 가격 유지",
      "돌파 후 3거래일 이상 이탈 없음",
    ],
    colorClassName: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  A: {
    group: "A",
    label: "A그룹",
    statusLabel: "돌파임박",
    definition: "컵 우측 상승 또는 돌파 임박",
    strategy: "피벗 가격, 거래량 증가, 20일선 지지 여부를 확인하며 비중 확대 후보로 관리한다.",
    conditions: [
      "컵 우측 상승 진행",
      "피벗 가격 근접",
      "20일선 또는 60일선 회복",
      "거래량 감소 후 재증가 조짐",
    ],
    colorClassName: "bg-lime-100 text-lime-800 border-lime-200",
  },
  B: {
    group: "B",
    label: "B그룹",
    statusLabel: "베이스형성",
    definition: "장기 조정 후 베이스 형성",
    strategy: "분할매수 후보로 관찰하며, 거래대금 증가와 박스권 상단 접근을 기다린다.",
    conditions: [
      "장기 조정 이후 변동성 축소",
      "저점 대비 의미 있는 반등",
      "60일선 부근에서 가격 안정",
      "사업 모멘텀 또는 테마 재부각 가능성",
    ],
    colorClassName: "bg-sky-100 text-sky-800 border-sky-200",
  },
  C: {
    group: "C",
    label: "C그룹",
    statusLabel: "관찰",
    definition: "모멘텀 미확인 관찰군",
    strategy: "매수 판단보다 추적을 우선하고, 추세 전환 신호가 나올 때까지 보수적으로 본다.",
    conditions: [
      "주요 이동평균선 혼조",
      "거래량 확장 부족",
      "박스권 돌파 전",
      "실적 또는 수급 확인 필요",
    ],
    colorClassName: "bg-amber-100 text-amber-800 border-amber-200",
  },
  D: {
    group: "D",
    label: "D그룹",
    statusLabel: "장기검증",
    definition: "바이오·기술특례·이벤트 의존 장기검증군",
    strategy: "소액 관찰 또는 제외를 기본으로 두고, 바닥 확인과 실적 회복 전까지 판단을 보류한다.",
    conditions: [
      "공모가 또는 장기 이동평균선 하회",
      "전고점 대비 큰 낙폭",
      "이벤트 의존도가 높음",
      "실적, 임상, 소송, 수급 등 위험 요인 확인 필요",
    ],
    colorClassName: "bg-rose-100 text-rose-800 border-rose-200",
  },
};

export const groupLabels: Record<StockGroup, string> = {
  S: groupDefinitions.S.label,
  A: groupDefinitions.A.label,
  B: groupDefinitions.B.label,
  C: groupDefinitions.C.label,
  D: groupDefinitions.D.label,
};

export const groupDescriptions: Record<StockGroup, string> = {
  S: groupDefinitions.S.definition,
  A: groupDefinitions.A.definition,
  B: groupDefinitions.B.definition,
  C: groupDefinitions.C.definition,
  D: groupDefinitions.D.definition,
};

export function getStocksByGroup(stocks: IpoStock[], group: StockGroup) {
  return stocks.filter((stock) => stock.group === group);
}

export function getGroupRoute(group: StockGroup) {
  return `/groups/${group.toLowerCase()}`;
}
