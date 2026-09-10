import type { FastifyInstance } from 'fastify';
import { senderSchema } from './order.schema.js';
import { senderFieldsFromInput } from './sender.js';
import { prisma } from '../../lib/prisma.js';

export async function orderRoutes(app: FastifyInstance) {
  app.get('/orders/:id', { onRequest: [app.authenticate] }, async (req: any, reply) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: { include: { product: true } },
        productionOrders: { include: { factory: true } },
        shipments: { include: { trackingEvents: true } },
        reviewRequests: true,
        automationLogs: { orderBy: { createdAt: 'desc' } }
      }
    });
    if (!order) return reply.code(404).send({ error: 'not_found' });
    return order;
  });

  // Set/override the dynamic sender ("remitente") for this order before the
  // shipment is created. Useful when the sender varies per order and was not
  // supplied through the WooCommerce webhook meta_data.
  app.patch('/orders/:id/sender', { onRequest: [app.authenticate] }, async (req: any, reply) => {
    const parsed = senderSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_payload', details: parsed.error.flatten() });
    const order = await prisma.order.update({ where: { id: req.params.id }, data: senderFieldsFromInput(parsed.data) });
    return order;
  });
}
