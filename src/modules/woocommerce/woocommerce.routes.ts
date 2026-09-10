import type { FastifyInstance, FastifyRequest } from 'fastify';
import { Prisma } from '@prisma/client';
import { verifyWooCommerceSignature } from './woocommerce.webhook.js';
import { mapWooCommerceOrder } from './woocommerce.mapper.js';
import type { WooCommerceOrderPayload } from './woocommerce.types.js';
import { fetchWooCommerceOrder } from './woocommerce.client.js';
import { ingestWooCommerceOrder } from '../orders/order.service.js';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';

export async function woocommerceRoutes(app: FastifyInstance) {
  // Configure this URL as a WooCommerce webhook (Settings > Advanced > Webhooks)
  // for topics "Order created" and "Order updated", with the shared secret set
  // in WOOCOMMERCE_WEBHOOK_SECRET.
  app.post('/webhooks/woocommerce/orders', { preHandler: verifyWooCommerceSignature }, async (req, reply) => {
    const topic = String(req.headers['x-wc-webhook-topic'] ?? '');
    const deliveryId = String(req.headers['x-wc-webhook-delivery-id'] ?? '');
    const body = req.body as WooCommerceOrderPayload;

    // WooCommerce sends a "ping" payload (no order id) when a webhook is first created/tested.
    if (!body?.id) return reply.code(200).send({ ok: true, ignored: true });

    if (deliveryId) {
      const already = await prisma.webhookDelivery.findUnique({
        where: { source_deliveryId: { source: 'woocommerce', deliveryId } }
      });
      if (already) return reply.code(200).send({ ok: true, duplicate: true });
    }

    try {
      const mapped = mapWooCommerceOrder(body);
      const result = await ingestWooCommerceOrder(mapped, body as unknown as Prisma.InputJsonValue);

      if (deliveryId) {
        await prisma.webhookDelivery
          .create({ data: { source: 'woocommerce', deliveryId, topic, orderId: String(body.id) } })
          .catch(() => undefined);
      }

      return reply.code(200).send(result);
    } catch (e) {
      logger.error({ err: e, orderId: body.id }, 'woocommerce_webhook_processing_failed');
      // 5xx so WooCommerce retries the delivery; the delivery id was not
      // recorded above, so a retry safely reprocesses this order.
      return reply.code(502).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });

  // Manual reconciliation: pull an order straight from the WooCommerce REST
  // API and ingest it, for cases where a webhook was missed.
  app.post('/woocommerce/sync/:wcOrderId', { onRequest: [app.authenticate] }, async (req: FastifyRequest<{ Params: { wcOrderId: string } }>, reply) => {
    try {
      const raw = (await fetchWooCommerceOrder(req.params.wcOrderId)) as WooCommerceOrderPayload;
      const mapped = mapWooCommerceOrder(raw);
      const result = await ingestWooCommerceOrder(mapped, raw as unknown as Prisma.InputJsonValue);
      return reply.send(result);
    } catch (e) {
      return reply.code(502).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });
}
