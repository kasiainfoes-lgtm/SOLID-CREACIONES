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

export type InvoiceTotals = {
  lines: InvoiceLineTotals[];
  subtotal: number;
  vatAmount: number;
  total: number;
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

export function computeTotals(lines: InvoiceLineInput[], vatRate: number): InvoiceTotals {
  const computed = lines.map((line, index) => ({
    ...line,
    position: index + 1,
    total: roundCents(line.quantity * line.unitPrice)
  }));

  // Sum the already-rounded line totals so the printed lines always add up to
  // the printed subtotal.
  const subtotal = roundCents(computed.reduce((sum, line) => sum + line.total, 0));
  const vatAmount = roundCents((subtotal * vatRate) / 100);
  const total = roundCents(subtotal + vatAmount);

  return { lines: computed, subtotal, vatAmount, total };
}

/** "2026-037" — year plus a zero-padded, gapless sequence. */
export function formatInvoiceNumber(year: number, sequence: number): string {
  return `${year}-${String(sequence).padStart(3, '0')}`;
}
