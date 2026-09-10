import type { FastifyInstance } from 'fastify';
import { prisma } from '../../lib/prisma.js';
import { createShipmentAndPickup } from './shipping.service.js';
import { getShippingProvider } from './provider.js';
import { AutomationStatus, ShippingStatus, Prisma } from '@prisma/client';
import { automationLog } from '../../lib/log.js';
import { scheduleReview } from '../reviews/review.service.js';

export async function shippingRoutes(app: FastifyInstance) {
  app.post('/shipping/orders/:orderId/create', { onRequest: [app.authenticate] }, async (req: any, reply) => {
    try { return await createShipmentAndPickup(req.params.orderId); }
    catch (e) { return reply.code(502).send({ error: e instanceof Error ? e.message : String(e) }); }
  });

  app.post('/shipping/:id/refresh-tracking', { onRequest: [app.authenticate] }, async (req: any, reply) => {
    const shipment = await prisma.shipment.findUnique({ where: { id: req.params.id } });
    if (!shipment?.trackingNumber) return reply.code(404).send({ error: 'shipment_or_tracking_not_found' });
    try {
      const result = await getShippingProvider().getTracking(shipment.trackingNumber);
      for (const e of result.events) {
        const exists = await prisma.trackingEvent.findFirst({ where: { shipmentId: shipment.id, status: e.status, eventDate: e.eventDate } });
        if (!exists) await prisma.trackingEvent.create({ data: { shipmentId: shipment.id, status: e.status, description: e.description, location: e.location, eventDate: e.eventDate, rawPayload: e.raw as Prisma.InputJsonValue | undefined } });
      }
      const mapped = result.status === 'delivered' ? ShippingStatus.delivered : result.status === 'exception' ? ShippingStatus.exception : result.status === 'in_transit' ? ShippingStatus.in_transit : ShippingStatus.pending;
      await prisma.shipment.update({ where: { id: shipment.id }, data: { status: mapped } });
      await prisma.order.update({ where: { id: shipment.orderId }, data: { shippingStatus: mapped } });
      // The review email is normally scheduled right after shipment creation
      // using the estimated delivery date. This is only a safety net for
      // shipments created before an estimate was available.
      await scheduleReview(shipment.orderId, shipment.estimatedDeliveryDate ?? new Date());
      return result;
    } catch (e) {
      await automationLog({ orderId: shipment.orderId, action: 'tracking_refresh', status: AutomationStatus.failed, message: e instanceof Error ? e.message : String(e) });
      return reply.code(502).send({ error: e instanceof Error ? e.message : String(e) });
    }
  });
}
