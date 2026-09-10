export type FactoryNotificationPayload = {
  event: 'production_order.created';
  productionOrderId: string;
  orderId: string;
  externalOrderId: string;
  factory: { id: string; name: string; email?: string | null; phone?: string | null };
  items: Array<{ sku: string; name: string; quantity: number }>;
  targetFinishAt?: Date | null;
};

// The factory's WhatsApp number has no official Business Platform access yet,
// so no WhatsApp automation is implemented. This interface stays decoupled so
// a WhatsApp Business Platform implementation can be dropped in later without
// touching the order pipeline.
export interface FactoryNotifier {
  notifyNewProductionOrder(payload: FactoryNotificationPayload): Promise<void>;
}
