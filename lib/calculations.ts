import type { IpoStock, StockGroup } from "@/types/stock";

export function countStocksByGroup(stocks: IpoStock[]) {
  return stocks.reduce<Record<StockGroup, number>>(
    (acc, stock) => {
      acc[stock.group] += 1;
      return acc;
    },
    { S: 0, A: 0, B: 0, C: 0, D: 0 },
  );
}

export function getAverageChangeRate(stocks: IpoStock[]) {
  if (stocks.length === 0) {
    return 0;
  }

  const total = stocks.reduce((sum, stock) => sum + stock.changeRate, 0);
  return total / stocks.length;
}
