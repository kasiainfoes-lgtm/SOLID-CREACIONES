import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ProductionStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { createShipmentAndPickup } from '../shipping/shipping.service.js';

const statusSchema = z.object({ status: z.enum(['pending','in_production','finished','packed','ready_for_pickup','cancelled']), notes: z.string().optional() });

export async function factoryRoutes(app: FastifyInstance) {
  app.patch('/factory/orders/:id/status', { onRequest: [app.authenticate] }, async (req: any, reply) => {
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(parsed.error.flatten());
    const current = await prisma.productionOrder.findUnique({ where: { id: req.params.id } });
    if (!current) return reply.code(404).send({ error: 'not_found' });
    const now = new Date();
    const data: any = { status: parsed.data.status as ProductionStatus, notes: parsed.data.notes };
    if (parsed.data.status === 'in_production' && !current.startedAt) data.startedAt = now;
    if (parsed.data.status === 'finished') data.finishedAt = now;
    if (parsed.data.status === 'packed') data.packedAt = now;
    if (parsed.data.status === 'ready_for_pickup') data.readyForPickupAt = now;
    const updated = await prisma.productionOrder.update({ where: { id: current.id }, data });

    // Only ship when every factory sub-order for the ecommerce order is ready.
    if (parsed.data.status === 'ready_for_pickup') {
      const siblings = await prisma.productionOrder.findMany({ where: { orderId: current.orderId } });
      const allReady = siblings.every(x => x.id === current.id || x.status === 'ready_for_pickup');
      if (allReady) {
        await prisma.order.update({ where: { id: current.orderId }, data: { productionStatus: 'ready_for_pickup' } });
        try { await createShipmentAndPickup(current.orderId); }
        catch (e) { return reply.code(502).send({ productionOrder: updated, shippingError: e instanceof Error ? e.message : String(e) }); }
      }
    } else {
      await prisma.order.update({ where: { id: current.orderId }, data: { productionStatus: parsed.data.status as ProductionStatus } });
    }
    return updated;
  });
}
