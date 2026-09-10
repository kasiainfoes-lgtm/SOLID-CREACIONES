import { env } from '../../config/env.js';
import type { FactoryNotifier } from './factory-notifier.js';
import { WebhookFactoryNotifier } from './webhook-factory-notifier.js';
import { EmailFactoryNotifier } from './email-factory-notifier.js';

let notifier: FactoryNotifier | undefined;

export function getFactoryNotifier(): FactoryNotifier {
  if (!notifier) {
    notifier = env.FACTORY_NOTIFIER === 'webhook' ? new WebhookFactoryNotifier() : new EmailFactoryNotifier();
  }
  return notifier;
}
