import { env } from '../../config/env.js';
import { withRetry } from '../../lib/retry.js';

function assertConfigured() {
  if (!env.WOOCOMMERCE_STORE_URL || !env.WOOCOMMERCE_CONSUMER_KEY || !env.WOOCOMMERCE_CONSUMER_SECRET) {
    throw new Error('WooCommerce REST API is not configured (WOOCOMMERCE_STORE_URL / WOOCOMMERCE_CONSUMER_KEY / WOOCOMMERCE_CONSUMER_SECRET)');
  }
}

function authHeader() {
  const basic = Buffer.from(`${env.WOOCOMMERCE_CONSUMER_KEY}:${env.WOOCOMMERCE_CONSUMER_SECRET}`).toString('base64');
  return `Basic ${basic}`;
}

export async function fetchWooCommerceOrder(orderId: string | number): Promise<unknown> {
  assertConfigured();
  const url = new URL(`/wp-json/wc/v3/orders/${orderId}`, env.WOOCOMMERCE_STORE_URL).toString();
  return withRetry(async () => {
    const res = await fetch(url, { headers: { Authorization: authHeader() } });
    if (!res.ok) throw new Error(`WooCommerce API ${res.status}: ${await res.text()}`);
    return res.json();
  }, { attempts: 3, baseDelayMs: 500 });
}

export async function addWooCommerceOrderNote(orderId: string | number, note: string): Promise<void> {
  assertConfigured();
  const url = new URL(`/wp-json/wc/v3/orders/${orderId}/notes`, env.WOOCOMMERCE_STORE_URL).toString();
  await withRetry(async () => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ note, customer_note: false })
    });
    if (!res.ok) throw new Error(`WooCommerce API ${res.status}: ${await res.text()}`);
  }, { attempts: 3, baseDelayMs: 500 });
}
