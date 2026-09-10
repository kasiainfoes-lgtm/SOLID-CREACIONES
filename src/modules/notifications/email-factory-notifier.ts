import { env } from '../../config/env.js';
import { sendMail } from '../../lib/mailer.js';
import type { FactoryNotifier, FactoryNotificationPayload } from './factory-notifier.js';

export class EmailFactoryNotifier implements FactoryNotifier {
  async notifyNewProductionOrder(payload: FactoryNotificationPayload) {
    const itemLines = payload.items.map(i => `- ${i.quantity} x ${i.name} (SKU ${i.sku})`).join('\n');
    const targetDate = payload.targetFinishAt
      ? payload.targetFinishAt.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'sin definir';

    const text = [
      `Nuevo pedido de fabricación #${payload.externalOrderId}`,
      '',
      `Fábrica: ${payload.factory.name}`,
      `Fecha objetivo de fabricación (2 días hábiles): ${targetDate}`,
      '',
      'Productos:',
      itemLines,
      '',
      `Referencia interna: ${payload.productionOrderId}`
    ].join('\n');

    await sendMail({
      to: env.FACTORY_NOTIFICATION_EMAIL,
      subject: `Nuevo pedido de fabricación #${payload.externalOrderId}`,
      text
    });
  }
}
