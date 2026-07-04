export function calculateAvailableStock(stockOnHand: number, reservedStock: number) {
  return Math.max(stockOnHand - reservedStock, 0);
}

export function calculateMarginPercentage(costMinor: number, retailMinor: number) {
  if (retailMinor <= 0) {
    return 0;
  }

  const marginMinor = retailMinor - costMinor;
  return Math.round((marginMinor / retailMinor) * 100);
}
