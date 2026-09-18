/**
 * Money maths for invoices, kept free of Prisma/IO so it can be unit tested
 * and reused by the browser UI (see public/facturas/index.html).
 *
 * Everything rounds through integer cents. The spreadsheet this replaces
 * produced totals such as 520.29999999999995 because it added binary floats;
 * an invoice total must be exact to the cent.
 */

export type InvoiceLineInput = {
  code?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
};

export type InvoiceLineTotals = InvoiceLineInput & { position: number; total: number };

export type DiscountType = 'percentage' | 'fixed';

export type InvoiceDiscountInput = {
  /** Coupon code or reason printed on the invoice, e.g. "BIENVENIDA10". */
  label?: string | null;
  type: DiscountType;
  /** A percentage (0-100) when type is "percentage", or a euro amount otherwise. */
  value: number;
};

/**
 * "excluded" (default): line prices don't carry VAT — the classic B2B
 * invoice, where VAT is ADDED on top of the base to reach the total (this
 * is how FACTURA 2026-037, the spreadsheet this replaces, always worked).
 *
 * "included": line prices already carry VAT — the normal case for a
 * consumer order from the web shop (WooCommerce shows and charges
 * tax-inclusive prices). Here VAT is EXTRACTED from inside a total that
 * must not change: the sum of the lines minus the coupon *is* the total,
 * and the base/cuota are worked out backwards from it.
 */
export type VatMode = 'excluded' | 'included';

export type InvoiceTotals = {
  lines: InvoiceLineTotals[];
  /** Sum of the lines before any discount ("Bruto"). */
  subtotal: number;
  discountAmount: number;
  /** What VAT is calculated on ("Base imponible") — see vatMode. */
  taxableBase: number;
  vatAmount: number;
  total: number;
  vatMode: VatMode;
};

/** Rounds to cents using half-up, the convention Spanish invoicing expects. */
export function roundCents(value: number): number {
  if (!Number.isFinite(value)) throw new Error('Cannot round a non-finite amount');
  const magnitude = Math.abs(value);
  const text = String(magnitude);
  // Shifting the decimal exponent inside the string sidesteps the binary error
  // that a plain `magnitude * 100` introduces: 1.005 * 100 is 100.49999999999999,
  // which would round a half down. Values printed in exponential notation are
  // far outside invoice range, so those fall back to the arithmetic shift.
  const shifted = text.includes('e') ? magnitude * 100 : Number(`${text}e2`);
  const cents = Math.round(shifted) * (value < 0 ? -1 : 1);
  return cents / 100;
}

/**
 * A coupon/discount is applied to the gross subtotal, before VAT — the
 * standard Spanish invoicing order (descuento sobre la base imponible).
 * Clamped so a mistyped coupon can never push the taxable base negative.
 */
function computeDiscountAmount(subtotal: number, discount?: InvoiceDiscountInput | null): number {
  if (!discount || !(discount.value > 0)) return 0;
  if (discount.type === 'percentage') {
    const pct = Math.min(Math.max(discount.value, 0), 100);
    return roundCents((subtotal * pct) / 100);
  }
  return roundCents(Math.min(Math.max(discount.value, 0), subtotal));
}

export function computeTotals(
  lines: InvoiceLineInput[],
  vatRate: number,
  discount?: InvoiceDiscountInput | null,
  vatMode: VatMode = 'excluded'
): InvoiceTotals {
  const computed = lines.map((line, index) => ({
    ...line,
    position: index + 1,
    total: roundCents(line.quantity * line.unitPrice)
  }));

  // Sum the already-rounded line totals so the printed lines always add up to
  // the printed subtotal.
  const subtotal = roundCents(computed.reduce((sum, line) => sum + line.total, 0));
  const discountAmount = computeDiscountAmount(subtotal, discount);
  const afterDiscount = roundCents(subtotal - discountAmount);

  if (vatMode === 'included') {
    // The total is fixed (it's what the customer actually paid): work the
    // base and the VAT out backwards from it, so base + vat always equals
    // that exact total to the cent, however the division rounds.
    const total = afterDiscount;
    const taxableBase = roundCents(total / (1 + vatRate / 100));
    const vatAmount = roundCents(total - taxableBase);
    return { lines: computed, subtotal, discountAmount, taxableBase, vatAmount, total, vatMode };
  }

  const taxableBase = afterDiscount;
  const vatAmount = roundCents((taxableBase * vatRate) / 100);
  const total = roundCents(taxableBase + vatAmount);
  return { lines: computed, subtotal, discountAmount, taxableBase, vatAmount, total, vatMode };
}

/** "2026-037" — year plus a zero-padded, gapless sequence. */
export function formatInvoiceNumber(year: number, sequence: number): string {
  return `${year}-${String(sequence).padStart(3, '0')}`;
}
