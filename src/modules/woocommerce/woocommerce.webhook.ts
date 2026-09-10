import type { FastifyRequest, FastifyReply } from 'fastify';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../../config/env.js';

export async function verifyWooCommerceSignature(req: FastifyRequest, reply: FastifyReply) {
  if (!env.WOOCOMMERCE_WEBHOOK_SECRET) {
    return reply.code(500).send({ error: 'woocommerce_webhook_not_configured' });
  }

  const signature = req.headers['x-wc-webhook-signature'];
  const raw = (req as FastifyRequest & { rawBody?: string }).rawBody;
  if (!signature || typeof signature !== 'string' || !raw) {
    return reply.code(401).send({ error: 'missing_signature' });
  }

  const expected = createHmac('sha256', env.WOOCOMMERCE_WEBHOOK_SECRET).update(raw, 'utf8').digest('base64');
  const provided = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (provided.length !== expectedBuf.length || !timingSafeEqual(provided, expectedBuf)) {
    return reply.code(401).send({ error: 'invalid_signature' });
  }
}
