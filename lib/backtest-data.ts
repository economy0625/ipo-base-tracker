import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

export type BacktestDataSource = "csv" | "mock";
export type BacktestStrategy = "B" | "A" | "S";

export type StrategySummary = {
  strategy: BacktestStrategy;
  tradeCount: number;
  winRate: number;
  averageReturn: number;
  totalReturn: number;
  maximumReturn: number;
  maximumLoss: number;
  averageHoldingDays: number;
};

export type TradeLog = {
  stockCode: string;
  strategy: BacktestStrategy | null;
  signalType: string;
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  returnPercent: number;
  holdingDays: number;
};

export type YearlyReturn = {
  year: number;
  tradeCount: number;
  averageReturn: number;
  totalReturn: number;
};

export type StockReturn = {
  stockCode: string;
  tradeCount: number;
  averageReturn: number;
  totalReturn: number;
};

type BacktestSection<T> = {
  data: T;
  source: BacktestDataSource;
};

export type BacktestData = {
  strategySummary: BacktestSection<StrategySummary[]>;
  tradeLog: BacktestSection<TradeLog[]>;
  yearlyReturns: BacktestSection<YearlyReturn[]>;
  stockReturns: BacktestSection<StockReturn[]>;
};

const outputDirectory = path.join(process.cwd(), "data", "output");
const strategies: BacktestStrategy[] = ["B", "A", "S"];

const mockTrades: TradeLog[] = [
  {
    stockCode: "432720",
    strategy: "S",
    signalType: "A→S 승격",
    entryDate: "2025-02-10",
    exitDate: "2025-03-10",
    entryPrice: 32800,
    exitPrice: 39100,
    returnPercent: 19.2,
    holdingDays: 20,
  },
  {
    stockCode: "448710",
    strategy: "A",
    signalType: "거래량 급증",
    entryDate: "2025-03-18",
    exitDate: "2025-04-15",
    entryPrice: 15900,
    exitPrice: 17650,
    returnPercent: 11,
    holdingDays: 20,
  },
  {
    stockCode: "452260",
    strategy: "B",
    signalType: "60일선 회복",
    entryDate: "2025-04-07",
    exitDate: "2025-05-07",
    entryPrice: 22100,
    exitPrice: 20800,
    returnPercent: -5.9,
    holdingDays: 20,
  },
];

const mockBacktestData: BacktestData = {
  strategySummary: {
    source: "mock",
    data: summarizeTradesByStrategy(mockTrades),
  },
  tradeLog: { source: "mock", data: mockTrades },
  yearlyReturns: {
    source: "mock",
    data: [
      { year: 2023, tradeCount: 9, averageReturn: 4.8, totalReturn: 43.2 },
      { year: 2024, tradeCount: 17, averageReturn: 6.5, totalReturn: 110.5 },
      { year: 2025, tradeCount: 22, averageReturn: 9.2, totalReturn: 202.4 },
    ],
  },
  stockReturns: {
    source: "mock",
    data: [
      {
        stockCode: "432720",
        tradeCount: 4,
        averageReturn: 15.8,
        totalReturn: 63.2,
      },
      {
        stockCode: "448710",
        tradeCount: 3,
        averageReturn: 9.7,
        totalReturn: 29.1,
      },
      {
        stockCode: "452260",
        tradeCount: 2,
        averageReturn: -2.1,
        totalReturn: -4.2,
      },
    ],
  },
};

function parseCsv(content: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const nextCharacter = content[index + 1];

    if (character === '"') {
      if (quoted && nextCharacter === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && nextCharacter === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((value) => value.trim() !== "")) rows.push(row);
  }
  if (rows.length === 0) return [];

  const headers = rows[0].map((header) =>
    header.replace(/^\uFEFF/, "").trim(),
  );
  return rows.slice(1).map((values) =>
    Object.fromEntries(
      headers.map((header, index) => [header, values[index]?.trim() ?? ""]),
    ),
  );
}

function toNumber(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStrategy(value: string | undefined): BacktestStrategy | null {
  const normalized = (value ?? "").trim().toUpperCase();
  if (normalized === "B" || normalized === "B전략") return "B";
  if (normalized === "A" || normalized === "A전략") return "A";
  if (normalized === "S" || normalized === "S전략") return "S";
  return null;
}

function inferStrategy(row: Record<string, string>): BacktestStrategy | null {
  const explicit = normalizeStrategy(
    row.strategy ?? row.entry_group ?? row.current_group,
  );
  if (explicit) return explicit;

  const signal = (row.signal_type ?? "").replace(/\s/g, "");
  if (
    signal.includes("A→S") ||
    signal.includes("A->S") ||
    signal.includes("돌파")
  ) {
    return "S";
  }
  if (
    signal.includes("B→A") ||
    signal.includes("B->A") ||
    signal.includes("60일선회복")
  ) {
    return "A";
  }
  if (
    signal.includes("베이스") ||
    signal.includes("바닥") ||
    signal.includes("공모가회복")
  ) {
    return "B";
  }
  return null;
}

function emptyStrategySummary(strategy: BacktestStrategy): StrategySummary {
  return {
    strategy,
    tradeCount: 0,
    winRate: 0,
    averageReturn: 0,
    totalReturn: 0,
    maximumReturn: 0,
    maximumLoss: 0,
    averageHoldingDays: 0,
  };
}

function summarizeTradesByStrategy(trades: TradeLog[]): StrategySummary[] {
  return strategies.map((strategy) => {
    const rows = trades.filter((trade) => trade.strategy === strategy);
    if (rows.length === 0) return emptyStrategySummary(strategy);

    const returns = rows.map((trade) => trade.returnPercent);
    return {
      strategy,
      tradeCount: rows.length,
      winRate:
        (rows.filter((trade) => trade.returnPercent > 0).length / rows.length) *
        100,
      averageReturn:
        returns.reduce((sum, value) => sum + value, 0) / returns.length,
      totalReturn: returns.reduce((sum, value) => sum + value, 0),
      maximumReturn: Math.max(...returns),
      maximumLoss: Math.min(...returns),
      averageHoldingDays:
        rows.reduce((sum, trade) => sum + trade.holdingDays, 0) / rows.length,
    };
  });
}

async function loadSection<T>(
  filename: string,
  mockData: T[],
  mapper: (row: Record<string, string>) => T,
): Promise<BacktestSection<T[]>> {
  try {
    const content = await fs.readFile(
      path.join(outputDirectory, filename),
      "utf8",
    );
    return { source: "csv", data: parseCsv(content).map(mapper) };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return { source: "mock", data: mockData };
  }
}

export async function getBacktestData(): Promise<BacktestData> {
  const [rawSummary, tradeLog, yearlyReturns, stockReturns] =
    await Promise.all([
      loadSection(
        "strategy_summary.csv",
        mockBacktestData.strategySummary.data,
        (row) => ({
          strategy:
            normalizeStrategy(row.strategy ?? row.entry_group) ?? "B",
          tradeCount: toNumber(row.trade_count),
          winRate: toNumber(row.win_rate),
          averageReturn: toNumber(row.average_return),
          totalReturn: toNumber(row.total_return),
          maximumReturn: toNumber(row.maximum_return ?? row.max_return),
          maximumLoss: toNumber(row.maximum_loss ?? row.max_loss),
          averageHoldingDays: toNumber(
            row.average_holding_days ?? row.avg_holding_days,
          ),
        }),
      ),
      loadSection("trade_log.csv", mockBacktestData.tradeLog.data, (row) => ({
        stockCode: row.stock_code ?? "",
        strategy: inferStrategy(row),
        signalType: row.signal_type ?? "",
        entryDate: row.entry_date ?? "",
        exitDate: row.exit_date ?? "",
        entryPrice: toNumber(row.entry_price),
        exitPrice: toNumber(row.exit_price),
        returnPercent: toNumber(row.return_percent),
        holdingDays: toNumber(row.holding_days),
      })),
      loadSection(
        "yearly_returns.csv",
        mockBacktestData.yearlyReturns.data,
        (row) => ({
          year: toNumber(row.year),
          tradeCount: toNumber(row.trade_count),
          averageReturn: toNumber(row.average_return),
          totalReturn: toNumber(row.total_return),
        }),
      ),
      loadSection(
        "stock_returns.csv",
        mockBacktestData.stockReturns.data,
        (row) => ({
          stockCode: row.stock_code ?? "",
          tradeCount: toNumber(row.trade_count),
          averageReturn: toNumber(row.average_return),
          totalReturn: toNumber(row.total_return),
        }),
      ),
    ]);

  let strategySummary: BacktestSection<StrategySummary[]>;
  if (tradeLog.data.length > 0) {
    strategySummary = {
      source: tradeLog.source,
      data: summarizeTradesByStrategy(tradeLog.data),
    };
  } else if (rawSummary.source === "mock") {
    strategySummary = rawSummary;
  } else {
    const byStrategy = new Map(
      rawSummary.data.map((summary) => [summary.strategy, summary]),
    );
    const hasExplicitStrategies =
      rawSummary.data.length > 1 ||
      rawSummary.data.some((summary) => summary.tradeCount > 0);
    strategySummary = {
      source: "csv",
      data: hasExplicitStrategies
        ? strategies.map(
            (strategy) =>
              byStrategy.get(strategy) ?? emptyStrategySummary(strategy),
          )
        : strategies.map(emptyStrategySummary),
    };
  }

  return { strategySummary, tradeLog, yearlyReturns, stockReturns };
}
