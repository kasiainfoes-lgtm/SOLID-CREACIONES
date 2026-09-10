import { describe, expect, it } from 'vitest';
import { mapWooCommerceOrder, mapWooCommercePaymentStatus } from './woocommerce.mapper.js';
import type { WooCommerceOrderPayload } from './woocommerce.types.js';

describe('mapWooCommercePaymentStatus', () => {
  it('treats processing and completed as paid', () => {
    expect(mapWooCommercePaymentStatus('processing')).toBe('paid');
    expect(mapWooCommercePaymentStatus('completed')).toBe('paid');
  });

  it('treats cancelled/failed as failed and refunded as refunded', () => {
    expect(mapWooCommercePaymentStatus('cancelled')).toBe('failed');
    expect(mapWooCommercePaymentStatus('failed')).toBe('failed');
    expect(mapWooCommercePaymentStatus('refunded')).toBe('refunded');
  });

  it('defaults unknown/pending statuses to pending', () => {
    expect(mapWooCommercePaymentStatus('pending')).toBe('pending');
    expect(mapWooCommercePaymentStatus('on-hold')).toBe('pending');
  });
});

describe('mapWooCommerceOrder', () => {
  const basePayload: WooCommerceOrderPayload = {
    id: 1058,
    status: 'processing',
    currency: 'EUR',
    total: '39.99',
    order_key: 'wc_order_abc123',
    billing: {
      first_name: 'Laura',
      last_name: 'Gomez',
      email: 'laura@example.com',
      phone: '+34600000000',
      address_1: 'Calle Mayor 10',
      city: 'Madrid',
      postcode: '28001',
      state: 'Madrid',
      country: 'ES'
    },
    line_items: [{ sku: 'FRAME-30X40-BLACK', quantity: 1, price: '39.99' }]
  };

  it('maps a standard WooCommerce order to the internal shape', () => {
    const mapped = mapWooCommerceOrder(basePayload);
    expect(mapped.externalOrderId).toBe('1058');
    expect(mapped.paymentStatus).toBe('paid');
    expect(mapped.customerName).toBe('Laura Gomez');
    expect(mapped.customerEmail).toBe('laura@example.com');
    expect(mapped.customerPhone).toBe('+34600000000');
    expect(mapped.addressLine1).toBe('Calle Mayor 10');
    expect(mapped.items).toEqual([{ sku: 'FRAME-30X40-BLACK', quantity: 1, unitPrice: 39.99 }]);
    expect(mapped.dynamicSender).toBeUndefined();
  });

  it('falls back to billing address when shipping is empty', () => {
    const mapped = mapWooCommerceOrder({ ...basePayload, shipping: {} });
    expect(mapped.addressLine1).toBe('Calle Mayor 10');
    expect(mapped.city).toBe('Madrid');
  });

  it('drops line items without a SKU', () => {
    const mapped = mapWooCommerceOrder({
      ...basePayload,
      line_items: [{ sku: '', quantity: 1 }, { sku: 'FRAME-30X40-BLACK', quantity: 2 }]
    });
    expect(mapped.items).toEqual([{ sku: 'FRAME-30X40-BLACK', quantity: 2, unitPrice: undefined }]);
  });

  it('extracts a dynamic sender from meta_data when fully specified', () => {
    const mapped = mapWooCommerceOrder({
      ...basePayload,
      meta_data: [{
        key: '_solid_shipment_sender',
        value: { name: 'Taller Norte', addressLine1: 'Calle Norte 5', city: 'Bilbao', postalCode: '48001' }
      }]
    });
    expect(mapped.dynamicSender).toEqual({
      name: 'Taller Norte',
      addressLine1: 'Calle Norte 5',
      addressLine2: undefined,
      city: 'Bilbao',
      postalCode: '48001',
      province: undefined,
      country: 'ES',
      phone: undefined,
      email: undefined
    });
  });

  it('ignores an incomplete dynamic sender', () => {
    const mapped = mapWooCommerceOrder({
      ...basePayload,
      meta_data: [{ key: '_solid_shipment_sender', value: { name: 'Taller Norte' } }]
    });
    expect(mapped.dynamicSender).toBeUndefined();
  });
});
