import { AutomationStatus } from '@prisma/client';
import { env } from '../../config/env.js';
import { COMPANY } from '../../config/company.js';
import { automationLog } from '../../lib/log.js';
import { prisma } from '../../lib/prisma.js';
import { sendMail } from '../../lib/mailer.js';
import { postWebhook } from '../notifications/webhook.js';

// Schedules the review request REVIEW_DELAY_DAYS (default 2) after the
// shipment's *estimated* delivery date — not after an actual "delivered"
// tracking confirmation, per business requirement.
export async function scheduleReview(orderId: string, estimatedDeliveryDate: Date) {
  const existing = await prisma.reviewRequest.findFirst({ where: { orderId, status: { in: ['scheduled', 'sent'] } } });
  if (existing) return existing;
  const scheduledFor = new Date(estimatedDeliveryDate.getTime() + env.REVIEW_DELAY_DAYS * 86400000);
  return prisma.reviewRequest.create({ data: { orderId, scheduledFor, channel: env.REVIEW_NOTIFIER } });
}

export async function processDueReviews() {
  const due = await prisma.reviewRequest.findMany({ where: { status: 'scheduled', scheduledFor: { lte: new Date() } }, include: { order: true }, take: 50 });
  for (const review of due) {
    try {
      if (env.REVIEW_NOTIFIER === 'webhook') {
        if (!env.REVIEW_NOTIFICATION_WEBHOOK_URL) throw new Error('REVIEW_NOTIFICATION_WEBHOOK_URL is not configured');
        await postWebhook(env.REVIEW_NOTIFICATION_WEBHOOK_URL, {
          event: 'review_request.due',
          reviewRequestId: review.id,
          reviewLink: COMPANY.REVIEW_LINK,
          order: { id: review.order.id, externalOrderId: review.order.externalOrderId, customerName: review.order.customerName, customerEmail: review.order.customerEmail, customerPhone: review.order.customerPhone }
        });
      } else {
        await sendMail({
          to: review.order.customerEmail,
          subject: `¿Qué tal tu pedido de ${COMPANY.NAME}?`,
          text: [
            `Hola ${review.order.customerName},`,
            '',
            `Esperamos que ya hayas recibido tu pedido de ${COMPANY.NAME}.`,
            'Nos ayudaría muchísimo que nos dejaras una reseña:',
            COMPANY.REVIEW_LINK,
            '',
            '¡Gracias!'
          ].join('\n'),
          html: `<p>Hola ${review.order.customerName},</p><p>Esperamos que ya hayas recibido tu pedido de ${COMPANY.NAME}.</p><p>Nos ayudaría muchísimo que nos dejaras una reseña:</p><p><a href="${COMPANY.REVIEW_LINK}">${COMPANY.REVIEW_LINK}</a></p><p>¡Gracias!</p>`
        });
      }
      await prisma.reviewRequest.update({ where: { id: review.id }, data: { status: 'sent', sentAt: new Date(), lastError: null } });
      await automationLog({ orderId: review.orderId, action: 'review_request', status: AutomationStatus.success });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await prisma.reviewRequest.update({ where: { id: review.id }, data: { status: 'failed', lastError: message } });
      await automationLog({ orderId: review.orderId, action: 'review_request', status: AutomationStatus.failed, message });
    }
  }
}
