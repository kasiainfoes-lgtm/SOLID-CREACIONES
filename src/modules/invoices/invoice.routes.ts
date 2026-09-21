import { readFileSync } from 'node:fs';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { INVOICE_ISSUER } from '../../config/company.js';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import {
  createInvoice,
  getInvoice,
  invoiceDraftFromOrder,
  listInvoices,
  nextInvoiceNumber,
  quarterlySummary
} from './invoice.service.js';
import { AutofillNotConfiguredError, autofillInvoiceFromText } from './invoice.autofill.js';

const clientInput = z.object({
  name: z.string().min(1),
  taxId: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional()
});

const invoiceInput = z.object({
  issueDate: z.coerce.date(),
  number: z.string().optional(),
  clientId: z.string().optional(),
  client: clientInput,
  lines: z.array(z.object({
    code: z.string().optional(),
    description: z.string().min(1),
    quantity: z.number(),
    unitPrice: z.number()
  })).min(1),
  vatRate: z.number().min(0).max(100),
  discount: z.object({
    label: z.string().optional(),
    type: z.enum(['percentage', 'fixed']),
    value: z.number().min(0)
  }).nullish(),
  // "excluded" (default): line prices don't carry VAT, it's added on top.
  // "included": line prices already carry VAT (a web shop order) — the total
  // stays fixed and VAT is extracted from inside it instead.
  vatMode: z.enum(['excluded', 'included']).optional(),
  reference: z.string().optional(),
  orderId: z.string().optional(),
  paymentMethod: z.string().optional(),
  bankName: z.string().optional(),
  bankIban: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['draft', 'issued', 'paid', 'cancelled']).optional()
});

type InvoiceWithLines = NonNullable<Awaited<ReturnType<typeof getInvoice>>>;

/** Prisma serializes Decimal as a string; the UI wants plain numbers. */
function serialize(invoice: InvoiceWithLines) {
  return {
    ...invoice,
    vatRate: invoice.vatRate.toNumber(),
    subtotal: invoice.subtotal.toNumber(),
    discountValue: invoice.discountValue?.toNumber() ?? null,
    discountAmount: invoice.discountAmount.toNumber(),
    taxableBase: invoice.taxableBase.toNumber(),
    vatAmount: invoice.vatAmount.toNumber(),
    total: invoice.total.toNumber(),
    lines: invoice.lines.map(line => ({
      ...line,
      quantity: line.quantity.toNumber(),
      unitPrice: line.unitPrice.toNumber(),
      total: line.total.toNumber()
    }))
  };
}

// The UI is a single self-contained HTML file with no build step. It sits at the
// repository root in development and next to dist/ inside the Docker image.
const PAGE_CANDIDATES = [
  new URL('../../../public/facturas/index.html', import.meta.url),
  new URL('../../../../public/facturas/index.html', import.meta.url)
];

let cachedPage: string | null = null;

function invoicePage() {
  if (cachedPage && env.NODE_ENV === 'production') return cachedPage;
  for (const candidate of PAGE_CANDIDATES) {
    try {
      cachedPage = readFileSync(candidate, 'utf8');
      return cachedPage;
    } catch {
      // Try the next location.
    }
  }
  throw new Error('public/facturas/index.html was not found');
}

export async function invoiceRoutes(app: FastifyInstance) {
  // The page itself is public; every piece of data behind it needs a login.
  app.get('/facturas', async (_req, reply) => reply.type('text/html; charset=utf-8').send(invoicePage()));

  app.get('/invoices/settings', { onRequest: [app.authenticate] }, async () => ({
    issuer: INVOICE_ISSUER,
    aiAvailable: Boolean(env.ANTHROPIC_API_KEY)
  }));

  app.post('/invoices/autofill', { onRequest: [app.authenticate] }, async (req, reply) => {
    const parsed = z.object({ text: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(parsed.error.flatten());
    try {
      return await autofillInvoiceFromText(parsed.data.text);
    } catch (e) {
      if (e instanceof AutofillNotConfiguredError) {
        return reply.code(501).send({ error: 'ai_not_configured' });
      }
      return reply.code(502).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.get('/invoices/next-number', { onRequest: [app.authenticate] }, async (req: any) => {
    const year = req.query?.year ? Number(req.query.year) : undefined;
    return nextInvoiceNumber(Number.isFinite(year) ? year : undefined);
  });

  app.get('/invoices/summary', { onRequest: [app.authenticate] }, async (req: any) => {
    const year = Number(req.query?.year) || new Date().getFullYear();
    return quarterlySummary(year);
  });

  app.get('/invoices/from-order/:orderId', { onRequest: [app.authenticate] }, async (req: any, reply) => {
    const draft = await invoiceDraftFromOrder(req.params.orderId);
    if (!draft) return reply.code(404).send({ error: 'order_not_found' });
    return draft;
  });

  app.get('/invoices', { onRequest: [app.authenticate] }, async (req: any) => {
    const invoices = await listInvoices({
      year: req.query?.year ? Number(req.query.year) : undefined,
      clientId: req.query?.clientId,
      take: req.query?.take ? Number(req.query.take) : undefined,
      skip: req.query?.skip ? Number(req.query.skip) : undefined
    });
    return invoices.map(serialize);
  });

  app.get('/invoices/:id', { onRequest: [app.authenticate] }, async (req: any, reply) => {
    const invoice = await getInvoice(req.params.id);
    if (!invoice) return reply.code(404).send({ error: 'not_found' });
    return serialize(invoice);
  });

  app.post('/invoices', { onRequest: [app.authenticate] }, async (req, reply) => {
    const parsed = invoiceInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(parsed.error.flatten());
    try {
      return reply.code(201).send(serialize(await createInvoice(parsed.data)));
    } catch (e) {
      return reply.code(409).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  app.patch('/invoices/:id/status', { onRequest: [app.authenticate] }, async (req: any, reply) => {
    const parsed = z.object({ status: z.enum(['draft', 'issued', 'paid', 'cancelled']) }).safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(parsed.error.flatten());
    const exists = await prisma.invoice.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!exists) return reply.code(404).send({ error: 'not_found' });
    const updated = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status: parsed.data.status },
      include: { lines: { orderBy: { position: 'asc' } } }
    });
    return serialize(updated);
  });

  app.get('/clients', { onRequest: [app.authenticate] }, async (req: any) => {
    const q = typeof req.query?.q === 'string' ? req.query.q.trim() : '';
    return prisma.client.findMany({
      where: { active: true, ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}) },
      orderBy: { name: 'asc' },
      take: 200
    });
  });

  app.post('/clients', { onRequest: [app.authenticate] }, async (req, reply) => {
    const parsed = clientInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(parsed.error.flatten());
    return reply.code(201).send(await prisma.client.create({ data: parsed.data }));
  });
}
