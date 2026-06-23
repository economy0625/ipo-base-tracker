import type {
  Company,
  CupHandlePattern,
  DailyPrice,
  DashboardMetric,
  Financial,
  GroupScore,
  IpoMetrics,
  IpoStock,
  PatternStatus,
  StockDetail,
  StockGroup,
} from "@/types/stock";

// UI 개발용 sample data입니다. 실제 투자 판단, 종목 추천, 매매 의사결정에 사용하지 마세요.

type SampleStockSeed = {
  stock_code: string;
  company_name: string;
  listing_date: string;
  ipo_price: number;
  adjusted_ipo_price: number;
  current_price: number;
  post_listing_high: number;
  post_listing_low: number;
  industry: string;
  theme_tags: string[];
  business_summary: string;
  current_group: StockGroup;
  group_reason: string;
  pattern_status: PatternStatus;
  is_tech_special?: boolean;
  is_bio?: boolean;
};

const today = new Date("2026-06-23T00:00:00+09:00");

const sampleSeeds: SampleStockSeed[] = [
  {
    stock_code: "373170",
    company_name: "엠아이큐브솔루션",
    listing_date: "2023-08-04",
    ipo_price: 12000,
    adjusted_ipo_price: 12000,
    current_price: 18500,
    post_listing_high: 23400,
    post_listing_low: 9700,
    industry: "스마트팩토리",
    theme_tags: ["스마트팩토리", "제조AI", "솔루션"],
    business_summary: "제조 데이터 분석과 스마트팩토리 운영 솔루션을 제공하는 기업",
    current_group: "A",
    group_reason: "20일선 회복 후 거래량이 증가하며 우측 상승 흐름을 형성",
    pattern_status: "FORMING_HANDLE",
    is_tech_special: true,
  },
  {
    stock_code: "432720",
    company_name: "퀄리타스반도체",
    listing_date: "2023-10-27",
    ipo_price: 17000,
    adjusted_ipo_price: 17000,
    current_price: 41200,
    post_listing_high: 48500,
    post_listing_low: 14500,
    industry: "반도체 설계",
    theme_tags: ["반도체", "IP", "AI반도체"],
    business_summary: "초고속 인터페이스 반도체 IP를 설계하고 공급하는 기업",
    current_group: "S",
    group_reason: "신고가 인근에서 컵앤핸들 돌파 흐름을 유지",
    pattern_status: "BREAKOUT",
    is_tech_special: true,
  },
  {
    stock_code: "451760",
    company_name: "컨텍",
    listing_date: "2023-11-09",
    ipo_price: 22500,
    adjusted_ipo_price: 22500,
    current_price: 17400,
    post_listing_high: 31500,
    post_listing_low: 12800,
    industry: "우주항공",
    theme_tags: ["우주", "위성", "지상국"],
    business_summary: "위성 지상국 서비스와 우주 데이터 플랫폼을 운영하는 기업",
    current_group: "C",
    group_reason: "테마 매력은 있으나 고점 대비 조정 후 거래대금 확인이 필요",
    pattern_status: "FORMING_CUP",
    is_tech_special: true,
  },
  {
    stock_code: "365330",
    company_name: "에스와이스틸텍",
    listing_date: "2023-11-13",
    ipo_price: 1800,
    adjusted_ipo_price: 1800,
    current_price: 5220,
    post_listing_high: 6700,
    post_listing_low: 1510,
    industry: "건자재",
    theme_tags: ["데크플레이트", "건설", "철강"],
    business_summary: "건축용 데크플레이트와 구조용 철강 제품을 생산하는 기업",
    current_group: "A",
    group_reason: "상장 후 재평가 구간에서 주요 이동평균선을 상회",
    pattern_status: "READY",
  },
  {
    stock_code: "457550",
    company_name: "우진엔텍",
    listing_date: "2024-01-24",
    ipo_price: 5300,
    adjusted_ipo_price: 5300,
    current_price: 24800,
    post_listing_high: 30700,
    post_listing_low: 10300,
    industry: "원전 정비",
    theme_tags: ["원전", "정비", "에너지"],
    business_summary: "원자력 발전소 계측제어 설비 정비 서비스를 제공하는 기업",
    current_group: "S",
    group_reason: "강한 테마 수급과 돌파 후 가격 유지가 확인",
    pattern_status: "BREAKOUT",
  },
  {
    stock_code: "482630",
    company_name: "삼양엔씨켐",
    listing_date: "2025-02-03",
    ipo_price: 18000,
    adjusted_ipo_price: 18000,
    current_price: 21900,
    post_listing_high: 27800,
    post_listing_low: 15100,
    industry: "반도체 소재",
    theme_tags: ["반도체소재", "포토레지스트", "소부장"],
    business_summary: "반도체 및 디스플레이용 정밀 화학 소재를 생산하는 기업",
    current_group: "B",
    group_reason: "초기 변동성 이후 60일선 부근에서 베이스를 형성",
    pattern_status: "FORMING_CUP",
    is_tech_special: true,
  },
  {
    stock_code: "459510",
    company_name: "나우로보틱스",
    listing_date: "2025-03-14",
    ipo_price: 11000,
    adjusted_ipo_price: 11000,
    current_price: 13800,
    post_listing_high: 19600,
    post_listing_low: 9800,
    industry: "로봇",
    theme_tags: ["로봇", "자동화", "스마트팩토리"],
    business_summary: "산업용 로봇과 자동화 시스템을 공급하는 기업",
    current_group: "B",
    group_reason: "로봇 테마 수급은 유지되지만 손잡이 구간 확인이 필요",
    pattern_status: "FORMING_HANDLE",
    is_tech_special: true,
  },
  {
    stock_code: "380550",
    company_name: "뉴로핏",
    listing_date: "2025-07-18",
    ipo_price: 14000,
    adjusted_ipo_price: 14000,
    current_price: 11900,
    post_listing_high: 17200,
    post_listing_low: 9100,
    industry: "의료AI",
    theme_tags: ["의료AI", "뇌질환", "헬스케어"],
    business_summary: "뇌 영상 분석 기반 의료 인공지능 솔루션을 개발하는 기업",
    current_group: "C",
    group_reason: "사업성은 양호하나 상장 후 모멘텀과 수급이 약함",
    pattern_status: "NONE",
    is_tech_special: true,
    is_bio: true,
  },
  {
    stock_code: "486990",
    company_name: "노타",
    listing_date: "2025-11-06",
    ipo_price: 15000,
    adjusted_ipo_price: 15000,
    current_price: 16750,
    post_listing_high: 22600,
    post_listing_low: 13200,
    industry: "AI 최적화",
    theme_tags: ["AI", "온디바이스AI", "모델경량화"],
    business_summary: "AI 모델 최적화와 온디바이스 AI 솔루션을 제공하는 기업",
    current_group: "B",
    group_reason: "AI 테마 관심은 있으나 거래량 확장이 아직 제한적",
    pattern_status: "FORMING_CUP",
    is_tech_special: true,
  },
  {
    stock_code: "489030",
    company_name: "세미파이브",
    listing_date: "2025-11-21",
    ipo_price: 24000,
    adjusted_ipo_price: 24000,
    current_price: 31800,
    post_listing_high: 35600,
    post_listing_low: 21200,
    industry: "반도체 플랫폼",
    theme_tags: ["반도체", "디자인하우스", "AI반도체"],
    business_summary: "시스템 반도체 설계 플랫폼과 디자인 서비스를 제공하는 기업",
    current_group: "A",
    group_reason: "반도체 디자인하우스 테마와 우측 상승 패턴이 동반",
    pattern_status: "READY",
    is_tech_special: true,
  },
  {
    stock_code: "403870",
    company_name: "HPSP",
    listing_date: "2022-07-15",
    ipo_price: 25000,
    adjusted_ipo_price: 12500,
    current_price: 39400,
    post_listing_high: 43200,
    post_listing_low: 10100,
    industry: "반도체 장비",
    theme_tags: ["반도체장비", "고압수소", "소부장"],
    business_summary: "반도체 고압 수소 어닐링 장비를 공급하는 기업",
    current_group: "S",
    group_reason: "장기 우상향 후 신고가 재돌파 후보로 강한 수급 유지",
    pattern_status: "BREAKOUT",
    is_tech_special: true,
  },
  {
    stock_code: "417200",
    company_name: "LS머트리얼즈",
    listing_date: "2023-12-12",
    ipo_price: 6000,
    adjusted_ipo_price: 6000,
    current_price: 27350,
    post_listing_high: 38500,
    post_listing_low: 13200,
    industry: "전력 부품",
    theme_tags: ["전력", "울트라커패시터", "ESS"],
    business_summary: "울트라커패시터와 전력 저장 부품을 생산하는 기업",
    current_group: "A",
    group_reason: "고점 조정 후 재상승이 진행되며 거래량이 회복",
    pattern_status: "FORMING_HANDLE",
  },
  {
    stock_code: "446540",
    company_name: "메가터치",
    listing_date: "2023-11-09",
    ipo_price: 4800,
    adjusted_ipo_price: 4800,
    current_price: 6080,
    post_listing_high: 9120,
    post_listing_low: 4410,
    industry: "검사용 부품",
    theme_tags: ["배터리", "반도체", "테스트핀"],
    business_summary: "배터리와 반도체 검사 공정용 핀을 제조하는 기업",
    current_group: "B",
    group_reason: "저점 대비 반등 후 중기 베이스를 형성",
    pattern_status: "FORMING_CUP",
  },
  {
    stock_code: "451220",
    company_name: "아이엠티",
    listing_date: "2023-10-10",
    ipo_price: 14000,
    adjusted_ipo_price: 14000,
    current_price: 12780,
    post_listing_high: 24100,
    post_listing_low: 9700,
    industry: "반도체 장비",
    theme_tags: ["반도체장비", "세정", "레이저"],
    business_summary: "반도체 건식 세정과 레이저 장비를 개발하는 기업",
    current_group: "C",
    group_reason: "반등은 있으나 주요 이동평균선 배열이 아직 혼조",
    pattern_status: "NONE",
    is_tech_special: true,
  },
  {
    stock_code: "456010",
    company_name: "아이씨티케이",
    listing_date: "2024-05-17",
    ipo_price: 20000,
    adjusted_ipo_price: 20000,
    current_price: 8400,
    post_listing_high: 28700,
    post_listing_low: 6900,
    industry: "보안 반도체",
    theme_tags: ["보안", "반도체", "인증"],
    business_summary: "보안 반도체와 하드웨어 인증 솔루션을 제공하는 기업",
    current_group: "D",
    group_reason: "상장 후 낙폭이 크고 장기 이동평균선 회복 전",
    pattern_status: "FAILED",
    is_tech_special: true,
  },
  {
    stock_code: "145170",
    company_name: "노브랜드",
    listing_date: "2024-05-23",
    ipo_price: 14000,
    adjusted_ipo_price: 14000,
    current_price: 22100,
    post_listing_high: 28900,
    post_listing_low: 13300,
    industry: "패션 ODM",
    theme_tags: ["소비재", "ODM", "수출"],
    business_summary: "글로벌 의류 브랜드 대상 디자인 및 생산 서비스를 제공하는 기업",
    current_group: "B",
    group_reason: "실적 기대는 있으나 고점 매물 소화 구간",
    pattern_status: "FORMING_HANDLE",
  },
  {
    stock_code: "460870",
    company_name: "에이피알",
    listing_date: "2024-02-27",
    ipo_price: 250000,
    adjusted_ipo_price: 50000,
    current_price: 71400,
    post_listing_high: 84200,
    post_listing_low: 43800,
    industry: "뷰티테크",
    theme_tags: ["화장품", "뷰티디바이스", "수출"],
    business_summary: "뷰티 디바이스와 화장품 브랜드를 운영하는 기업",
    current_group: "S",
    group_reason: "실적 모멘텀과 신고가 돌파 시도가 동시에 확인",
    pattern_status: "BREAKOUT",
  },
  {
    stock_code: "452160",
    company_name: "제이투케이바이오",
    listing_date: "2024-03-25",
    ipo_price: 13000,
    adjusted_ipo_price: 13000,
    current_price: 7800,
    post_listing_high: 18800,
    post_listing_low: 6500,
    industry: "바이오 소재",
    theme_tags: ["바이오", "화장품원료", "소재"],
    business_summary: "바이오 기반 화장품 원료와 기능성 소재를 개발하는 기업",
    current_group: "D",
    group_reason: "공모가 하회와 수급 약세로 장기 관찰 필요",
    pattern_status: "FAILED",
    is_bio: true,
  },
  {
    stock_code: "450080",
    company_name: "에코아이",
    listing_date: "2023-11-21",
    ipo_price: 34700,
    adjusted_ipo_price: 34700,
    current_price: 45100,
    post_listing_high: 62100,
    post_listing_low: 29800,
    industry: "탄소배출권",
    theme_tags: ["탄소배출권", "친환경", "ESG"],
    business_summary: "탄소배출권 개발과 온실가스 감축 사업을 수행하는 기업",
    current_group: "B",
    group_reason: "테마 반등은 있으나 박스권 상단 돌파 전",
    pattern_status: "READY",
  },
  {
    stock_code: "424960",
    company_name: "스마트레이더시스템",
    listing_date: "2023-08-22",
    ipo_price: 8000,
    adjusted_ipo_price: 8000,
    current_price: 14600,
    post_listing_high: 21600,
    post_listing_low: 7200,
    industry: "자율주행 센서",
    theme_tags: ["자율주행", "레이다", "로봇"],
    business_summary: "4D 이미징 레이다 센서와 응용 솔루션을 개발하는 기업",
    current_group: "A",
    group_reason: "저점 대비 강한 반등 후 돌파 대기권에 위치",
    pattern_status: "READY",
    is_tech_special: true,
  },
  {
    stock_code: "452260",
    company_name: "한싹",
    listing_date: "2023-10-04",
    ipo_price: 12500,
    adjusted_ipo_price: 6250,
    current_price: 11900,
    post_listing_high: 15800,
    post_listing_low: 5150,
    industry: "보안 소프트웨어",
    theme_tags: ["보안", "망연계", "클라우드"],
    business_summary: "망연계 보안과 클라우드 보안 솔루션을 제공하는 기업",
    current_group: "A",
    group_reason: "보안 테마 수급과 20일선 지지가 양호",
    pattern_status: "FORMING_HANDLE",
    is_tech_special: true,
  },
  {
    stock_code: "439580",
    company_name: "블루엠텍",
    listing_date: "2023-12-13",
    ipo_price: 19000,
    adjusted_ipo_price: 19000,
    current_price: 11200,
    post_listing_high: 51600,
    post_listing_low: 9100,
    industry: "의약품 플랫폼",
    theme_tags: ["헬스케어", "플랫폼", "의약품유통"],
    business_summary: "의약품 유통과 병의원 대상 디지털 플랫폼을 운영하는 기업",
    current_group: "D",
    group_reason: "고점 대비 낙폭이 크고 추세 복원 전",
    pattern_status: "FAILED",
    is_bio: true,
  },
  {
    stock_code: "445680",
    company_name: "큐리옥스바이오시스템즈",
    listing_date: "2023-08-10",
    ipo_price: 13000,
    adjusted_ipo_price: 13000,
    current_price: 32800,
    post_listing_high: 45500,
    post_listing_low: 10100,
    industry: "바이오 장비",
    theme_tags: ["바이오", "세포분석", "장비"],
    business_summary: "세포 분석 자동화 장비와 관련 소모품을 공급하는 기업",
    current_group: "A",
    group_reason: "바이오 장비 모멘텀과 중기 상승 추세가 유지",
    pattern_status: "FORMING_HANDLE",
    is_tech_special: true,
    is_bio: true,
  },
  {
    stock_code: "440320",
    company_name: "오픈놀",
    listing_date: "2023-06-30",
    ipo_price: 10000,
    adjusted_ipo_price: 10000,
    current_price: 6120,
    post_listing_high: 18400,
    post_listing_low: 5100,
    industry: "HR 플랫폼",
    theme_tags: ["AI", "HR테크", "플랫폼"],
    business_summary: "채용과 직무 매칭을 위한 HR 플랫폼을 운영하는 기업",
    current_group: "D",
    group_reason: "상장 초반 급등 이후 추세 회복이 지연",
    pattern_status: "FAILED",
    is_tech_special: true,
  },
  {
    stock_code: "419530",
    company_name: "SAMG엔터",
    listing_date: "2022-12-06",
    ipo_price: 17000,
    adjusted_ipo_price: 17000,
    current_price: 14800,
    post_listing_high: 57800,
    post_listing_low: 10300,
    industry: "콘텐츠",
    theme_tags: ["콘텐츠", "캐릭터", "키즈"],
    business_summary: "애니메이션 IP와 캐릭터 콘텐츠 사업을 운영하는 기업",
    current_group: "C",
    group_reason: "IP 사업 기대는 있으나 장기 매물대 돌파 전",
    pattern_status: "FORMING_CUP",
  },
  {
    stock_code: "389470",
    company_name: "인벤티지랩",
    listing_date: "2022-11-22",
    ipo_price: 12000,
    adjusted_ipo_price: 12000,
    current_price: 16400,
    post_listing_high: 28700,
    post_listing_low: 6400,
    industry: "바이오 플랫폼",
    theme_tags: ["바이오", "약물전달", "플랫폼"],
    business_summary: "장기지속형 주사제와 약물전달 플랫폼을 개발하는 기업",
    current_group: "B",
    group_reason: "저점 대비 반등은 강하지만 임상 이벤트 변동성 존재",
    pattern_status: "READY",
    is_bio: true,
  },
  {
    stock_code: "314930",
    company_name: "바이오다인",
    listing_date: "2021-03-17",
    ipo_price: 30000,
    adjusted_ipo_price: 15000,
    current_price: 21100,
    post_listing_high: 38600,
    post_listing_low: 8200,
    industry: "진단 장비",
    theme_tags: ["바이오", "진단", "의료기기"],
    business_summary: "액상세포검사 장비와 진단 솔루션을 공급하는 기업",
    current_group: "C",
    group_reason: "기술력 대비 거래대금이 낮아 추세 확인 필요",
    pattern_status: "FORMING_CUP",
    is_bio: true,
  },
  {
    stock_code: "294090",
    company_name: "이오플로우",
    listing_date: "2020-09-14",
    ipo_price: 19000,
    adjusted_ipo_price: 9500,
    current_price: 4300,
    post_listing_high: 32500,
    post_listing_low: 2800,
    industry: "의료기기",
    theme_tags: ["의료기기", "당뇨", "웨어러블"],
    business_summary: "웨어러블 인슐린 펌프와 당뇨 관리 기기를 개발하는 기업",
    current_group: "D",
    group_reason: "장기 하락 이후 바닥권 확인 단계",
    pattern_status: "NONE",
    is_tech_special: true,
    is_bio: true,
  },
  {
    stock_code: "347860",
    company_name: "알체라",
    listing_date: "2020-12-21",
    ipo_price: 10000,
    adjusted_ipo_price: 10000,
    current_price: 5120,
    post_listing_high: 41200,
    post_listing_low: 3900,
    industry: "AI 영상인식",
    theme_tags: ["AI", "영상인식", "보안"],
    business_summary: "얼굴인식과 영상 분석 인공지능 솔루션을 개발하는 기업",
    current_group: "D",
    group_reason: "AI 테마에도 불구하고 장기 추세와 실적 검증이 필요",
    pattern_status: "FAILED",
    is_tech_special: true,
  },
  {
    stock_code: "352910",
    company_name: "오비고",
    listing_date: "2021-07-13",
    ipo_price: 14300,
    adjusted_ipo_price: 14300,
    current_price: 9340,
    post_listing_high: 28600,
    post_listing_low: 7100,
    industry: "차량용 소프트웨어",
    theme_tags: ["모빌리티", "차량SW", "자율주행"],
    business_summary: "차량용 브라우저와 커넥티드카 소프트웨어를 제공하는 기업",
    current_group: "C",
    group_reason: "테마 재부각 가능성은 있으나 박스권 돌파 전",
    pattern_status: "FORMING_CUP",
    is_tech_special: true,
  },
];

function daysSince(date: string) {
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.max(
    0,
    Math.floor((today.getTime() - new Date(`${date}T00:00:00+09:00`).getTime()) / oneDay),
  );
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function createCompany(seed: SampleStockSeed): Company {
  return {
    stock_code: seed.stock_code,
    company_name: seed.company_name,
    market: "KOSDAQ",
    listing_date: seed.listing_date,
    ipo_price: seed.ipo_price,
    adjusted_ipo_price: seed.adjusted_ipo_price,
    industry: seed.industry,
    theme_tags: seed.theme_tags,
    business_summary: seed.business_summary,
    is_spac: false,
    is_transfer_listing: false,
    is_spac_merger: false,
    is_tech_special: seed.is_tech_special ?? false,
    is_bio: seed.is_bio ?? false,
  };
}

function createMetrics(seed: SampleStockSeed): IpoMetrics {
  const returnVsIpo =
    ((seed.current_price - seed.adjusted_ipo_price) / seed.adjusted_ipo_price) * 100;
  const drawdownFromHigh =
    ((seed.current_price - seed.post_listing_high) / seed.post_listing_high) * 100;
  const reboundFromLow =
    ((seed.current_price - seed.post_listing_low) / seed.post_listing_low) * 100;

  return {
    current_price: seed.current_price,
    return_vs_ipo: round(returnVsIpo),
    post_listing_high: seed.post_listing_high,
    post_listing_low: seed.post_listing_low,
    drawdown_from_high: round(drawdownFromHigh),
    rebound_from_low: round(reboundFromLow),
    days_since_listing: daysSince(seed.listing_date),
    ma20: Math.round(seed.current_price * (seed.current_group === "S" ? 0.96 : 1.02)),
    ma60: Math.round(seed.current_price * (seed.current_group === "D" ? 1.28 : 0.94)),
    ma120: Math.round(seed.current_price * (seed.current_group === "D" ? 1.45 : 0.9)),
    volume_ratio_20d: round(
      seed.current_group === "S"
        ? 2.4
        : seed.current_group === "A"
          ? 1.8
          : seed.current_group === "B"
            ? 1.2
            : seed.current_group === "C"
              ? 0.9
              : 0.6,
    ),
  };
}

function scoreForGroup(group: StockGroup) {
  const baseScore: Record<StockGroup, number> = {
    S: 91,
    A: 78,
    B: 62,
    C: 45,
    D: 28,
  };
  return baseScore[group];
}

function createGroupScore(seed: SampleStockSeed): GroupScore {
  const totalScore = scoreForGroup(seed.current_group);

  return {
    current_group: seed.current_group,
    total_score: totalScore,
    chart_score: Math.max(10, totalScore - 4),
    volume_score: Math.max(8, totalScore - 12),
    financial_score: Math.max(8, totalScore - 18),
    business_score: Math.max(12, totalScore - 8),
    risk_score: seed.current_group === "D" ? 18 : Math.max(35, 100 - totalScore),
    group_reason: seed.group_reason,
    is_manual: false,
  };
}

function createCupHandlePattern(seed: SampleStockSeed): CupHandlePattern {
  const leftPeakPrice = Math.round(seed.post_listing_high * 0.92);
  const lowPrice = seed.post_listing_low;
  const pivotPrice = Math.round(seed.post_listing_high * 0.98);

  return {
    cup_left_peak_date: "2026-01-16",
    cup_left_peak_price: leftPeakPrice,
    cup_low_date: "2026-03-05",
    cup_low_price: lowPrice,
    cup_depth_percent: round(((lowPrice - leftPeakPrice) / leftPeakPrice) * 100),
    base_days: seed.current_group === "S" || seed.current_group === "A" ? 74 : 42,
    handle_start_date:
      seed.pattern_status === "NONE" || seed.pattern_status === "FAILED"
        ? null
        : "2026-05-20",
    handle_end_date:
      seed.pattern_status === "BREAKOUT" || seed.pattern_status === "READY"
        ? "2026-06-12"
        : null,
    handle_depth_percent:
      seed.pattern_status === "NONE" || seed.pattern_status === "FAILED" ? null : -8.4,
    pivot_price:
      seed.pattern_status === "NONE" || seed.pattern_status === "FAILED" ? null : pivotPrice,
    breakout_date: seed.pattern_status === "BREAKOUT" ? "2026-06-17" : null,
    breakout_close: seed.pattern_status === "BREAKOUT" ? seed.current_price : null,
    breakout_volume_ratio: seed.pattern_status === "BREAKOUT" ? 2.7 : null,
    breakout_maintained_days: seed.pattern_status === "BREAKOUT" ? 4 : 0,
    pattern_status: seed.pattern_status,
  };
}

function createFinancials(seed: SampleStockSeed): Financial[] {
  const revenueBase = seed.adjusted_ipo_price * 90;
  const groupMultiplier: Record<StockGroup, number> = {
    S: 1.45,
    A: 1.25,
    B: 1,
    C: 0.82,
    D: 0.58,
  };
  const revenue = Math.round(revenueBase * groupMultiplier[seed.current_group]);
  const margin = seed.current_group === "D" ? -4.5 : seed.current_group === "C" ? 3.2 : 12.4;
  const operatingProfit = Math.round(revenue * (margin / 100));

  return [
    {
      stock_code: seed.stock_code,
      fiscal_year: 2025,
      quarter: 4,
      revenue,
      operating_profit: operatingProfit,
      net_income: Math.round(operatingProfit * 0.74),
      operating_margin: margin,
      revenue_growth: round(groupMultiplier[seed.current_group] * 12),
      operating_profit_growth: seed.current_group === "D" ? -18.5 : round(margin * 2.2),
      debt_ratio: seed.current_group === "D" ? 92.4 : 41.6,
      cash_and_equivalents: Math.round(revenue * 0.18),
    },
  ];
}

function createDailyPrices(seed: SampleStockSeed): DailyPrice[] {
  const prices: DailyPrice[] = [];
  const start = new Date("2026-05-13T00:00:00+09:00");
  const steps = 30;

  for (let index = 0; index < steps; index += 1) {
    const progress = index / (steps - 1);
    const wave = Math.sin(index * 0.9) * 0.035;
    const base =
      seed.current_group === "D"
        ? seed.current_price * (1.22 - progress * 0.22)
        : seed.current_price * (0.86 + progress * 0.14);
    const close = Math.max(100, Math.round(base * (1 + wave)));
    const open = Math.round(close * (1 - 0.012 + (index % 3) * 0.008));
    const high = Math.round(Math.max(open, close) * 1.025);
    const low = Math.round(Math.min(open, close) * 0.975);
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    prices.push({
      stock_code: seed.stock_code,
      trade_date: date.toISOString().slice(0, 10),
      open,
      high,
      low,
      close,
      adjusted_close: close,
      volume: Math.round(80_000 + index * 7_500 + seed.current_price * 2.2),
      trading_value: Math.round(close * (80_000 + index * 7_500 + seed.current_price * 2.2)),
    });
  }

  return prices;
}

function toIpoStock(detail: StockDetail): IpoStock {
  const metrics = detail.metrics;
  const groupScore = detail.group_score;

  return {
    code: detail.company.stock_code,
    name: detail.company.company_name,
    market: "KOSDAQ",
    listedAt: detail.company.listing_date,
    group: groupScore?.current_group ?? "C",
    currentPrice: metrics?.current_price ?? detail.company.adjusted_ipo_price,
    ipoPrice: detail.company.adjusted_ipo_price,
    changeRate: metrics?.return_vs_ipo ?? 0,
    baseStatus: groupScore?.group_reason ?? "분류 전",
    volumeSignal:
      (metrics?.volume_ratio_20d ?? 0) >= 1.7
        ? "강함"
        : (metrics?.volume_ratio_20d ?? 0) >= 1
          ? "보통"
          : "약함",
    movingAverageStatus:
      metrics && metrics.current_price >= metrics.ma20
        ? "20일선 위"
        : "20일선 아래",
    businessSummary: detail.company.business_summary,
  };
}

export const mockStockDetails: StockDetail[] = sampleSeeds.map((seed) => ({
  company: createCompany(seed),
  latest_price: null,
  metrics: createMetrics(seed),
  group_score: createGroupScore(seed),
  cup_handle_pattern: createCupHandlePattern(seed),
  financials: createFinancials(seed),
  signals: [],
}));

export const mockDailyPrices: Record<string, DailyPrice[]> = Object.fromEntries(
  sampleSeeds.map((seed) => [seed.stock_code, createDailyPrices(seed)]),
);

export const mockCompanies: Company[] = mockStockDetails.map((stock) => stock.company);

export const mockIpoMetrics: Record<string, IpoMetrics> = Object.fromEntries(
  mockStockDetails.map((stock) => [stock.company.stock_code, stock.metrics as IpoMetrics]),
);

export const mockGroupScores: Record<string, GroupScore> = Object.fromEntries(
  mockStockDetails.map((stock) => [stock.company.stock_code, stock.group_score as GroupScore]),
);

export const mockCupHandlePatterns: Record<string, CupHandlePattern> = Object.fromEntries(
  mockStockDetails.map((stock) => [
    stock.company.stock_code,
    stock.cup_handle_pattern as CupHandlePattern,
  ]),
);

export const mockFinancials: Record<string, Financial[]> = Object.fromEntries(
  mockStockDetails.map((stock) => [stock.company.stock_code, stock.financials]),
);

export const mockStocks: IpoStock[] = mockStockDetails.map(toIpoStock);

export const dashboardMetrics: DashboardMetric[] = [
  {
    label: "추적 종목",
    value: `${mockStocks.length}개`,
    description: "UI 개발용 sample data 기준",
  },
  {
    label: "강한 후보",
    value: `${mockStocks.filter((stock) => ["S", "A"].includes(stock.group)).length}개`,
    description: "S/A 그룹 합산",
  },
  {
    label: "데이터 상태",
    value: "Sample",
    description: "실거래 판단용 데이터 아님",
  },
];
