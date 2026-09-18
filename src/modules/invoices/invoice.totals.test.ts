import { describe, expect, it } from 'vitest';
import { computeTotals, formatInvoiceNumber, roundCents } from './invoice.totals.js';

describe('computeTotals', () => {
  it('reproduces a real invoice without floating point drift', () => {
    // FACTURA 2026-037: 2 x 215,00 € at 21% IVA. The spreadsheet printed
    // 520.29999999999995 for this same invoice.
    const result = computeTotals(
      [{ description: 'ENCIMERAS DE 80 X 37, CON LAVABO DE 40', quantity: 2, unitPrice: 215 }],
      21
    );
    expect(result.subtotal).toBe(430);
    expect(result.discountAmount).toBe(0);
    expect(result.taxableBase).toBe(430);
    expect(result.vatAmount).toBe(90.3);
    expect(result.total).toBe(520.3);
  });

  it('keeps the printed lines adding up to the printed subtotal', () => {
    const result = computeTotals(
      [
        { description: 'Corte a medida', quantity: 3, unitPrice: 12.35 },
        { description: 'Pulido de canto', quantity: 1, unitPrice: 0.005 }
      ],
      21
    );
    expect(result.lines.map(l => l.total)).toEqual([37.05, 0.01]);
    expect(result.subtotal).toBe(37.06);
    expect(roundCents(result.lines[0].total + result.lines[1].total)).toBe(result.subtotal);
  });

  it('supports fractional quantities and a 0% rate', () => {
    const result = computeTotals([{ description: 'Encimera Krion m2', quantity: 2.5, unitPrice: 189.9 }], 0);
    expect(result.subtotal).toBe(474.75);
    expect(result.vatAmount).toBe(0);
    expect(result.total).toBe(474.75);
  });

  it('numbers lines from one in the order they were entered', () => {
    const result = computeTotals(
      [{ description: 'A', quantity: 1, unitPrice: 1 }, { description: 'B', quantity: 1, unitPrice: 1 }],
      21
    );
    expect(result.lines.map(l => l.position)).toEqual([1, 2]);
  });
});

describe('computeTotals con cupón/descuento', () => {
  // Same 2026-037 invoice as above (2 x 215,00 €, 21% IVA), now with a
  // client's coupon applied — the case that prompted this feature.
  const lines = [{ description: 'ENCIMERAS DE 80 X 37', quantity: 2, unitPrice: 215 }];

  it('applies a percentage coupon before VAT (Bruto -> Descuento -> Base imponible -> IVA)', () => {
    const result = computeTotals(lines, 21, { label: 'BIENVENIDA10', type: 'percentage', value: 10 });
    expect(result.subtotal).toBe(430);
    expect(result.discountAmount).toBe(43); // 10% of 430
    expect(result.taxableBase).toBe(387);
    expect(result.vatAmount).toBe(81.27); // 21% of 387, not of 430
    expect(result.total).toBe(468.27);
  });

  it('applies a fixed-amount coupon in euros', () => {
    const result = computeTotals(lines, 21, { type: 'fixed', value: 30 });
    expect(result.discountAmount).toBe(30);
    expect(result.taxableBase).toBe(400);
    expect(result.vatAmount).toBe(84);
    expect(result.total).toBe(484);
  });

  it('clamps a coupon so the taxable base never goes negative', () => {
    const result = computeTotals(lines, 21, { type: 'fixed', value: 999 });
    expect(result.discountAmount).toBe(430);
    expect(result.taxableBase).toBe(0);
    expect(result.vatAmount).toBe(0);
    expect(result.total).toBe(0);
  });

  it('clamps a percentage coupon at 100%', () => {
    const result = computeTotals(lines, 21, { type: 'percentage', value: 150 });
    expect(result.discountAmount).toBe(430);
    expect(result.total).toBe(0);
  });

  it('ignores a zero, negative or missing discount', () => {
    const base = computeTotals(lines, 21);
    expect(computeTotals(lines, 21, null)).toEqual(base);
    expect(computeTotals(lines, 21, { type: 'fixed', value: 0 })).toEqual(base);
    expect(computeTotals(lines, 21, { type: 'fixed', value: -10 })).toEqual(base);
  });
});

describe('roundCents', () => {
  it('rounds halves up, including negatives (abonos)', () => {
    expect(roundCents(1.005)).toBe(1.01);
    expect(roundCents(2.675)).toBe(2.68);
    expect(roundCents(-1.005)).toBe(-1.01);
  });
});

describe('formatInvoiceNumber', () => {
  it('pads the sequence to three digits and keeps longer ones intact', () => {
    expect(formatInvoiceNumber(2026, 37)).toBe('2026-037');
    expect(formatInvoiceNumber(2026, 1)).toBe('2026-001');
    expect(formatInvoiceNumber(2026, 1234)).toBe('2026-1234');
  });
});
