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

export function calculateGrossProfitMinor(costMinor: number, sellingPriceMinor: number) {
  return sellingPriceMinor - costMinor;
}

export function isSalePriceActive(
  salePriceMinor: number | null | undefined,
  saleStartsAt: Date | null | undefined,
  saleEndsAt: Date | null | undefined,
  now = new Date(),
) {
  if (salePriceMinor == null) {
    return false;
  }
  if (saleStartsAt && now < saleStartsAt) {
    return false;
  }
  if (saleEndsAt && now > saleEndsAt) {
    return false;
  }

  return true;
}

export function resolveAdminSellingPriceMinor(params: {
  regularPriceMinor: number;
  salePriceMinor?: number | null;
  saleStartsAt?: Date | null;
  saleEndsAt?: Date | null;
  now?: Date;
}) {
  return isSalePriceActive(params.salePriceMinor, params.saleStartsAt, params.saleEndsAt, params.now)
    ? params.salePriceMinor ?? params.regularPriceMinor
    : params.regularPriceMinor;
}
