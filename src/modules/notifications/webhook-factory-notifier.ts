import { env } from '../../config/env.js';
import { postWebhook } from './webhook.js';
import type { FactoryNotifier, FactoryNotificationPayload } from './factory-notifier.js';

export class WebhookFactoryNotifier implements FactoryNotifier {
  async notifyNewProductionOrder(payload: FactoryNotificationPayload) {
    if (!env.FACTORY_NOTIFICATION_WEBHOOK_URL) {
      throw new Error('FACTORY_NOTIFICATION_WEBHOOK_URL is not configured');
    }
    await postWebhook(env.FACTORY_NOTIFICATION_WEBHOOK_URL, {
      ...payload,
      targetFinishAt: payload.targetFinishAt?.toISOString()
    });
  }
}
