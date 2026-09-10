import { addBusinessDays } from '../../lib/date.js';
import type { ShippingProvider, CreateShipmentInput, PickupInput, TrackingResult } from './types.js';

export class MockShippingProvider implements ShippingProvider {
  async createShipment(input: CreateShipmentInput) {
    const suffix = input.reference.replace(/[^A-Za-z0-9]/g, '').slice(-10) || Date.now().toString();
    return {
      carrierShipmentId: `MOCK-${suffix}`,
      trackingNumber: `MOCK${suffix.toUpperCase()}`,
      labelUrl: `https://example.invalid/labels/${suffix}.pdf`,
      estimatedDeliveryDate: addBusinessDays(new Date(), 2),
      raw: { provider: 'mock', input }
    };
  }

  async requestPickup(input: PickupInput) {
    return {
      pickupRequestId: `PICKUP-${Date.now()}`,
      raw: { provider: 'mock', input }
    };
  }

  async getTracking(trackingNumber: string): Promise<TrackingResult> {
    return {
      status: 'in_transit',
      events: [{ status: 'in_transit', description: `Mock tracking for ${trackingNumber}`, eventDate: new Date() }],
      raw: { provider: 'mock' }
    };
  }
}
