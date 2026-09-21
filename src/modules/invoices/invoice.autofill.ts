import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod/v4';
import { env } from '../../config/env.js';

/**
 * "Rellenar con IA": the boss pastes whatever text he already has (a
 * WhatsApp message, a copy-pasted WooCommerce order summary, a scribbled
 * note) and this extracts it into the same shape the invoice form uses.
 *
 * Deliberately extraction-only. The model never computes a total, a subtotal
 * or a tax amount — those come out of invoice.totals.ts, the same tested
 * calculator every other invoice uses. Trusting an LLM's arithmetic here
 * would be exactly the kind of silent, hard-to-notice mistake this whole
 * tool was built to avoid.
 */

const AutofillLine = z.object({
  code: z.string().nullable().describe('Article/SKU code if one is given, otherwise null.'),
  description: z.string().describe('What the line item is, in the same words the source text uses.'),
  quantity: z
    .number()
    .positive()
    .describe(
      'How many units. IMPORTANT: a marker like "x4" or "(4)" written right after a product name is almost ' +
        'always the QUANTITY, not part of the description — split it out here and drop it from the ' +
        'description. If the text gives a line total and a unit price but not a quantity, or vice versa, ' +
        'compute the missing one so quantity × unitPrice reproduces the line total exactly. Default to 1 only ' +
        'when nothing in the text implies more than one unit.'
    ),
  unitPrice: z.number().nonnegative().describe('Price per unit, in euros, with no currency symbol.')
});

const AutofillDiscount = z
  .object({
    label: z.string().nullable().describe('The coupon code if one is named (e.g. "BIENVENIDA10"), otherwise null.'),
    type: z.enum(['percentage', 'fixed']).describe('"percentage" for a % off, "fixed" for a flat euro amount off.'),
    value: z.number().positive().describe('The number itself: 10 for "10%", or 59 for "-59€".')
  })
  .nullable()
  .describe('A coupon or discount applied to the order. null if there is none.');

const AutofillSchema = z.object({
  client: z.object({
    name: z.string().describe('Client/company name.'),
    taxId: z.string().nullable().describe('CIF/NIF if given, otherwise null.'),
    addressLine1: z.string().nullable(),
    postalCode: z.string().nullable(),
    city: z.string().nullable(),
    province: z.string().nullable().describe('Province, only if it is stated separately from the city.'),
    email: z.string().nullable(),
    phone: z.string().nullable()
  }),
  reference: z
    .string()
    .nullable()
    .describe('An order number or reference to print on the invoice (e.g. "Pedido nº S00016"), otherwise null.'),
  lines: z.array(AutofillLine).min(1),
  discount: AutofillDiscount,
  vatRate: z
    .number()
    .min(0)
    .max(100)
    .describe('The VAT/IVA percentage. Use 21 (Spain\'s general rate) unless the text names a different one.'),
  vatMode: z
    .enum(['included', 'excluded'])
    .describe(
      '"included": the prices/total in the text are what a customer actually paid or a shop already charges ' +
        '(a web order, a retail sale) — VAT is baked into those figures already. "excluded": a B2B quote or ' +
        'invoice where the amounts are pre-tax and VAT still needs to be added on top. Default to "included" ' +
        'unless the text clearly reads as a pre-tax B2B price list.'
    ),
  paymentMethod: z.string().nullable().describe('Payment method, only if the text actually states one.')
});

export type AutofillResult = z.infer<typeof AutofillSchema>;

export class AutofillNotConfiguredError extends Error {
  constructor() {
    super('ANTHROPIC_API_KEY is not set on the server');
    this.name = 'AutofillNotConfiguredError';
  }
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) throw new AutofillNotConfiguredError();
  if (!client) client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  return client;
}

const SYSTEM_PROMPT = `Extraes los datos de una factura a partir de un texto en español que te pega el dueño de un
taller de superficies sólidas (encimeras, lavabos, duchas). El texto puede ser un pedido de tienda online, un
mensaje de WhatsApp, un email o una nota escrita a mano. Extrae solo lo que el texto realmente dice — nunca
inventes un cliente, una línea o un descuento que no esté presente. Si un dato no aparece, su campo debe quedar
en null. No calcules totales, IVA ni bases imponibles: eso lo hace la aplicación aparte a partir de los datos
que extraigas.`;

export async function autofillInvoiceFromText(text: string): Promise<AutofillResult> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('No hay texto que analizar');

  const response = await getClient().messages.parse({
    model: 'claude-opus-5',
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: trimmed }],
    output_config: { format: zodOutputFormat(AutofillSchema) }
  });

  if (!response.parsed_output) {
    throw new Error('No se pudo interpretar el texto pegado. Prueba a pegarlo de nuevo o rellena la factura a mano.');
  }
  return response.parsed_output;
}
