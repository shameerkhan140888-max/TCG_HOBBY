import { describe, expect, it } from 'vitest';
import proformaSummary from '../data/final-proforma-summary.json';

describe('Iron Sprue final proforma inventory summary', () => {
  it('records the updated final workbook count without treating excluded planning rows as stock', () => {
    expect(proformaSummary.salesOrder).toBe('updated-sales-prices-and-margins');
    expect(proformaSummary.purchaseOrderReference).toBe('IRON-SPRUE-LAUNCH-2026-08');
    expect(proformaSummary.pdfRowCount).toBe(84);
    expect(proformaSummary.workbookRowCount).toBe(81);
    expect(proformaSummary.approvedSellableLineCount).toBe(81);
    expect(proformaSummary.approvedUnitCount).toBe(256);
    expect(proformaSummary.zeroQuantityLines).toHaveLength(0);
    expect(proformaSummary.reviewRequiredRows).toBe(5);
    expect(proformaSummary.sourceLinkedRows).toBe(43);
    expect(proformaSummary.sourceLinkRequiredRows).toBe(38);
    expect(proformaSummary.provisionalSourceDocument).toBe('Iron_Sprue_Purchase_Order_v3_Focused_CubicFun.xlsx');
  });
});
