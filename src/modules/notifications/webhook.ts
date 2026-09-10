import { withRetry } from '../../lib/retry.js';

export async function postWebhook(url: string, payload: unknown) {
  if (!url) return { skipped: true };
  await withRetry(async () => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Webhook failed: ${res.status} ${await res.text()}`);
  }, { attempts: 3, baseDelayMs: 500 });
  return { skipped: false };
}
