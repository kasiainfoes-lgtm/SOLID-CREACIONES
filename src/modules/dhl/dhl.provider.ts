import { env } from '../../config/env.js';
import { withRetry } from '../../lib/retry.js';
import type { ShippingProvider, CreateShipmentInput, PickupInput, TrackingResult } from '../shipping/types.js';

/**
 * DHL shipping provider.
 *
 * IMPORTANT: DHL offers several distinct API products (DHL Express "MyDHL API",
 * DHL Parcel ES, DHL eCommerce, ...) each with its own auth flow, endpoint
 * paths and request/response schema. Without confirmed documentation for the
 * specific contract in use, this adapter does NOT hardcode a production
 * endpoint or payload shape: `DHL_API_URL` and the *_PATH env vars must be
 * filled in from the contracted product's docs, and `mapToDhlCreateShipmentPayload`
 * / the response mapping below must be adapted accordingly.
 *
 * Auth here assumes HTTP Basic auth with API key/secret (the common pattern
 * for DHL Express MyDHL API) — confirm and adjust for the actual contract.
 */
export class DhlProvider implements ShippingProvider {
  private assertConfigured(path: string, action: string) {
    if (!env.DHL_API_URL || !env.DHL_API_KEY || !env.DHL_API_SECRET || !path) {
      throw new Error(`DHL ${action} is not configured. Fill DHL_API_URL, DHL_API_KEY, DHL_API_SECRET and the confirmed endpoint path from your DHL contract/documentation.`);
    }
  }

  private authHeader() {
    const basic = Buffer.from(`${env.DHL_API_KEY}:${env.DHL_API_SECRET}`).toString('base64');
    return `Basic ${basic}`;
  }

  private async request(method: 'GET' | 'POST', path: string, payload?: unknown) {
    const url = new URL(path, env.DHL_API_URL).toString();
    return withRetry(async () => {
      const response = await fetch(url, {
        method,
        headers: { Authorization: this.authHeader(), 'Content-Type': 'application/json' },
        body: payload !== undefined ? JSON.stringify(payload) : undefined
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`DHL API ${response.status}: ${text}`);
      return text ? JSON.parse(text) : {};
    }, { attempts: 3, baseDelayMs: 500 });
  }

  async createShipment(input: CreateShipmentInput) {
    this.assertConfigured(env.DHL_CREATE_SHIPMENT_PATH, 'createShipment');
    // IMPORTANT: mapToDhlCreateShipmentPayload must be adapted to the exact
    // schema of the DHL API product enabled in your contract.
    const raw = await this.request('POST', env.DHL_CREATE_SHIPMENT_PATH, this.mapToDhlCreateShipmentPayload(input));
    const r = raw as Record<string, any>;
    const carrierShipmentId = String(r.shipmentId ?? r.id ?? r.shipmentTrackingNumber ?? '');
    const trackingNumber = String(r.trackingNumber ?? r.shipmentTrackingNumber ?? r.tracking ?? '');
    if (!carrierShipmentId || !trackingNumber) {
      throw new Error('DHL response mapping is incomplete. Configure response fields according to your DHL API product documentation.');
    }
    const estimatedRaw = r.estimatedDeliveryDate ?? r.estimatedDelivery ?? r.deliveryDate;
    return {
      carrierShipmentId,
      trackingNumber,
      labelUrl: r.labelUrl ?? r.label?.url,
      estimatedDeliveryDate: estimatedRaw ? new Date(estimatedRaw) : undefined,
      raw
    };
  }

  async requestPickup(input: PickupInput) {
    this.assertConfigured(env.DHL_PICKUP_PATH, 'requestPickup');
    const raw = await this.request('POST', env.DHL_PICKUP_PATH, this.mapToDhlPickupPayload(input));
    const r = raw as Record<string, any>;
    const pickupRequestId = String(r.pickupRequestId ?? r.confirmationNumber ?? r.id ?? '');
    if (!pickupRequestId) throw new Error('DHL pickup response mapping is incomplete.');
    return { pickupRequestId, raw };
  }

  async getTracking(trackingNumber: string): Promise<TrackingResult> {
    this.assertConfigured(env.DHL_TRACKING_PATH, 'getTracking');
    // Adapt method/query shape to your enabled DHL Tracking API docs
    // (DHL's public tracking API typically uses GET with a query string).
    const path = `${env.DHL_TRACKING_PATH}${env.DHL_TRACKING_PATH.includes('?') ? '&' : '?'}trackingNumber=${encodeURIComponent(trackingNumber)}`;
    const raw = await this.request('GET', path);
    const r = raw as Record<string, any>;
    const events = Array.isArray(r.events) ? r.events : Array.isArray(r.shipments?.[0]?.events) ? r.shipments[0].events : [];
    const normalized = events.map((e: any) => ({
      status: String(e.status ?? e.statusCode ?? 'unknown'),
      description: e.description,
      location: e.location?.address?.addressLocality ?? e.location,
      eventDate: new Date(e.timestamp ?? e.eventDate ?? e.date ?? Date.now()),
      raw: e
    }));
    const statusText = String(r.status ?? r.shipments?.[0]?.status?.statusCode ?? '').toLowerCase();
    const status: TrackingResult['status'] = statusText.includes('deliver')
      ? 'delivered'
      : statusText.includes('exception') || statusText.includes('failure')
        ? 'exception'
        : statusText.includes('transit')
          ? 'in_transit'
          : 'pending';
    return { status, events: normalized, raw };
  }

  private mapToDhlCreateShipmentPayload(input: CreateShipmentInput) {
    return { accountNumber: env.DHL_ACCOUNT_NUMBER, ...input };
  }

  private mapToDhlPickupPayload(input: PickupInput) {
    return { accountNumber: env.DHL_ACCOUNT_NUMBER, ...input };
  }
}
