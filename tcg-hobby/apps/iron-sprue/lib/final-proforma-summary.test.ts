import { describe, expect, it } from 'vitest';
import proformaSummary from '../data/final-proforma-summary.json';

describe('Iron Sprue final proforma inventory summary', () => {
  it('records the approved final PO count without treating zero-quantity rows as stock', () => {
    expect(proformaSummary.salesOrder).toBe('27676');
    expect(proformaSummary.purchaseOrderReference).toBe('IS-PO-2026-07');
    expect(proformaSummary.pdfRowCount).toBe(84);
    expect(proformaSummary.approvedSellableLineCount).toBe(81);
    expect(proformaSummary.approvedUnitCount).toBe(233);
    expect(proformaSummary.zeroQuantityLines).toHaveLength(3);
  });
});
