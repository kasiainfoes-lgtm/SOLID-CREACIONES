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
