import type { WooCommerceOrderPayload } from './woocommerce.types.js';
import type { SenderInput } from '../orders/order.schema.js';

const PAID_STATUSES = new Set(['processing', 'completed']);
const FAILED_STATUSES = new Set(['failed', 'cancelled']);

export type MappedWooCommerceOrder = {
  externalOrderId: string;
  wooOrderKey?: string;
  wooStatus: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  totalAmount?: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode: string;
  province?: string;
  country: string;
  items: Array<{ sku: string; quantity: number; unitPrice?: number }>;
  dynamicSender?: SenderInput;
};

export function mapWooCommercePaymentStatus(status: string): MappedWooCommerceOrder['paymentStatus'] {
  if (PAID_STATUSES.has(status)) return 'paid';
  if (status === 'refunded') return 'refunded';
  if (FAILED_STATUSES.has(status)) return 'failed';
  return 'pending';
}

export function mapWooCommerceOrder(payload: WooCommerceOrderPayload): MappedWooCommerceOrder {
  const billing = payload.billing ?? {};
  const shipping = payload.shipping?.address_1 ? payload.shipping : billing;
  const senderMeta = payload.meta_data?.find(m => m.key === '_solid_shipment_sender')?.value;

  return {
    externalOrderId: String(payload.id),
    wooOrderKey: payload.order_key,
    wooStatus: payload.status,
    paymentStatus: mapWooCommercePaymentStatus(payload.status),
    totalAmount: payload.total != null && payload.total !== '' ? Number(payload.total) : undefined,
    currency: payload.currency ?? 'EUR',
    customerName: [billing.first_name, billing.last_name].filter(Boolean).join(' ').trim() || 'Cliente WooCommerce',
    customerEmail: billing.email ?? '',
    customerPhone: billing.phone || shipping.phone || undefined,
    addressLine1: shipping.address_1 ?? billing.address_1 ?? '',
    addressLine2: shipping.address_2 ?? billing.address_2 ?? undefined,
    city: shipping.city ?? billing.city ?? '',
    postalCode: shipping.postcode ?? billing.postcode ?? '',
    province: shipping.state ?? billing.state ?? undefined,
    country: (shipping.country ?? billing.country ?? 'ES').toUpperCase(),
    items: (payload.line_items ?? [])
      .map(li => ({
        sku: li.sku ?? '',
        quantity: li.quantity,
        unitPrice: li.price != null && li.price !== '' ? Number(li.price) : undefined
      }))
      .filter(i => i.sku),
    dynamicSender: normalizeDynamicSender(senderMeta)
  };
}

function normalizeDynamicSender(raw: unknown): SenderInput | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const s = raw as Record<string, unknown>;
  if (!s.name || !s.addressLine1 || !s.city || !s.postalCode) return undefined;
  return {
    name: String(s.name),
    addressLine1: String(s.addressLine1),
    addressLine2: s.addressLine2 ? String(s.addressLine2) : undefined,
    city: String(s.city),
    postalCode: String(s.postalCode),
    province: s.province ? String(s.province) : undefined,
    country: s.country ? String(s.country).toUpperCase() : 'ES',
    phone: s.phone ? String(s.phone) : undefined,
    email: s.email ? String(s.email) : undefined
  };
}
