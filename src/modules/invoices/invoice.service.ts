import { Prisma, type InvoiceStatus } from '@prisma/client';
import { INVOICE_ISSUER } from '../../config/company.js';
import { prisma } from '../../lib/prisma.js';
import {
  computeTotals,
  formatInvoiceNumber,
  type InvoiceDiscountInput,
  type InvoiceLineInput,
  type VatMode
} from './invoice.totals.js';

export type CreateInvoiceInput = {
  issueDate: Date;
  clientId?: string;
  client: {
    name: string;
    taxId?: string;
    addressLine1?: string;
    addressLine2?: string;
    postalCode?: string;
    city?: string;
    province?: string;
    email?: string;
    phone?: string;
  };
  lines: InvoiceLineInput[];
  vatRate: number;
  /** Coupon/discount applied to this invoice, e.g. a client's promo code. */
  discount?: InvoiceDiscountInput | null;
  /** "excluded" (default) adds VAT on top; "included" extracts it from a fixed total. */
  vatMode?: VatMode;
  reference?: string;
  orderId?: string;
  paymentMethod?: string;
  bankName?: string;
  bankIban?: string;
  notes?: string;
  status?: InvoiceStatus;
  /** Reuse this exact number instead of taking the next one in the series. */
  number?: string;
};

const invoiceWithLines = { lines: { orderBy: { position: 'asc' } } } as const;

/** The next free number in the current year's series, e.g. { number: '2026-038' }. */
export async function nextInvoiceNumber(year = new Date().getFullYear()) {
  const last = await prisma.invoice.findFirst({
    where: { year },
    orderBy: { sequence: 'desc' },
    select: { sequence: true }
  });
  const sequence = (last?.sequence ?? 0) + 1;
  return { year, sequence, number: formatInvoiceNumber(year, sequence) };
}

/**
 * Finds the client by tax id (or by name when there is none) and creates it the
 * first time it is invoiced, so the boss types a client's address once and picks
 * it from the list forever after.
 */
async function resolveClient(input: CreateInvoiceInput) {
  if (input.clientId) {
    const existing = await prisma.client.findUnique({ where: { id: input.clientId } });
    if (existing) return existing;
  }

  const where: Prisma.ClientWhereInput = input.client.taxId
    ? { taxId: input.client.taxId }
    : { name: { equals: input.client.name, mode: 'insensitive' } };
  const match = await prisma.client.findFirst({ where });
  if (match) {
    return prisma.client.update({ where: { id: match.id }, data: { ...input.client } });
  }

  return prisma.client.create({ data: { ...input.client } });
}

export async function createInvoice(input: CreateInvoiceInput) {
  if (input.lines.length === 0) throw new Error('An invoice needs at least one line');

  const totals = computeTotals(input.lines, input.vatRate, input.discount, input.vatMode);
  const client = await resolveClient(input);
  const year = input.issueDate.getFullYear();

  // Two invoices saved at the same moment would fight over the same sequence.
  // The [year, sequence] unique index is the referee; on a clash we simply take
  // the next number and try again.
  for (let attempt = 0; attempt < 5; attempt++) {
    const numbering = input.number
      ? parseInvoiceNumber(input.number, year)
      : await nextInvoiceNumber(year);

    try {
      return await prisma.invoice.create({
        data: {
          number: numbering.number,
          year: numbering.year,
          sequence: numbering.sequence,
          issueDate: input.issueDate,
          status: input.status ?? 'issued',
          clientId: client.id,
          clientName: client.name,
          clientTaxId: client.taxId,
          clientAddressLine1: client.addressLine1,
          clientAddressLine2: client.addressLine2,
          clientPostalCode: client.postalCode,
          clientCity: client.city,
          clientProvince: client.province,
          reference: input.reference,
          orderId: input.orderId,
          discountLabel: input.discount?.label || null,
          discountType: totals.discountAmount > 0 ? input.discount?.type ?? null : null,
          discountValue: input.discount?.value != null ? new Prisma.Decimal(input.discount.value) : null,
          discountAmount: new Prisma.Decimal(totals.discountAmount),
          vatRate: new Prisma.Decimal(input.vatRate),
          pricesIncludeVat: totals.vatMode === 'included',
          subtotal: new Prisma.Decimal(totals.subtotal),
          taxableBase: new Prisma.Decimal(totals.taxableBase),
          vatAmount: new Prisma.Decimal(totals.vatAmount),
          total: new Prisma.Decimal(totals.total),
          paymentMethod: input.paymentMethod ?? INVOICE_ISSUER.defaultPaymentMethod,
          bankName: input.bankName ?? INVOICE_ISSUER.bankName,
          bankIban: input.bankIban ?? INVOICE_ISSUER.bankIban,
          notes: input.notes,
          lines: {
            create: totals.lines.map(line => ({
              position: line.position,
              code: line.code ?? null,
              description: line.description,
              quantity: new Prisma.Decimal(line.quantity),
              unitPrice: new Prisma.Decimal(line.unitPrice),
              total: new Prisma.Decimal(line.total)
            }))
          }
        },
        include: invoiceWithLines
      });
    } catch (err) {
      const duplicate = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
      // An explicit number that is already taken is a mistake worth reporting,
      // not something to silently renumber.
      if (!duplicate || input.number) throw err;
    }
  }

  throw new Error('Could not allocate an invoice number, please retry');
}

function parseInvoiceNumber(number: string, fallbackYear: number) {
  const match = /^(\d{4})-(\d+)$/.exec(number.trim());
  if (!match) throw new Error(`Invalid invoice number "${number}", expected a format like 2026-038`);
  return { number: number.trim(), year: Number(match[1]) || fallbackYear, sequence: Number(match[2]) };
}

export function listInvoices(params: { year?: number; clientId?: string; take?: number; skip?: number }) {
  return prisma.invoice.findMany({
    where: { year: params.year, clientId: params.clientId },
    orderBy: [{ year: 'desc' }, { sequence: 'desc' }],
    take: Math.min(params.take ?? 50, 200),
    skip: params.skip ?? 0,
    include: invoiceWithLines
  });
}

export function getInvoice(id: string) {
  return prisma.invoice.findUnique({ where: { id }, include: invoiceWithLines });
}

/**
 * Quarterly totals for the year, which is the shape the gestoría asks for when
 * filing the IVA (modelo 303).
 */
export async function quarterlySummary(year: number) {
  const invoices = await prisma.invoice.findMany({
    where: { year, status: { not: 'cancelled' } },
    select: { issueDate: true, taxableBase: true, vatAmount: true, total: true }
  });

  const quarters = [1, 2, 3, 4].map(quarter => ({
    quarter,
    count: 0,
    // "Base": the taxable base (after any coupon), which is what the
    // modelo 303 wants — not the gross subtotal before the discount.
    subtotal: 0,
    vatAmount: 0,
    total: 0
  }));

  for (const invoice of invoices) {
    const quarter = Math.floor(invoice.issueDate.getMonth() / 3);
    const bucket = quarters[quarter];
    bucket.count += 1;
    bucket.subtotal += invoice.taxableBase.toNumber();
    bucket.vatAmount += invoice.vatAmount.toNumber();
    bucket.total += invoice.total.toNumber();
  }

  return { year, quarters };
}

/**
 * Turns an automated WooCommerce order into a ready-to-save invoice draft.
 * Nothing is persisted here: the boss still reviews the lines and presses save.
 */
export async function invoiceDraftFromOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: true } } }
  });
  if (!order) return null;

  return {
    issueDate: new Date().toISOString().slice(0, 10),
    reference: `Pedido nº ${order.externalOrderId}`,
    orderId: order.id,
    vatRate: INVOICE_ISSUER.defaultVatRate,
    client: {
      name: order.customerName,
      addressLine1: order.addressLine1,
      addressLine2: order.addressLine2 ?? '',
      postalCode: order.postalCode,
      city: order.city,
      province: order.province ?? '',
      email: order.customerEmail,
      phone: order.customerPhone ?? ''
    },
    lines: order.items.map(item => ({
      code: item.sku,
      description: item.product.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice?.toNumber() ?? 0
    }))
  };
}
