import { AutomationStatus, ShippingStatus, Prisma, type Order } from '@prisma/client';
import { env } from '../../config/env.js';
import { COMPANY_DEFAULT_SENDER } from '../../config/company.js';
import { addBusinessDays } from '../../lib/date.js';
import { automationLog } from '../../lib/log.js';
import { prisma } from '../../lib/prisma.js';
import { calculatePackage } from './package.service.js';
import { getShippingProvider } from './provider.js';
import { scheduleReview } from '../reviews/review.service.js';
import type { Address } from './types.js';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

function resolveSenderAddress(order: Order): Address {
  if (order.senderName && order.senderAddressLine1 && order.senderCity && order.senderPostalCode) {
    return {
      name: order.senderName,
      addressLine1: order.senderAddressLine1,
      addressLine2: order.senderAddressLine2 ?? undefined,
      city: order.senderCity,
      postalCode: order.senderPostalCode,
      province: order.senderProvince ?? undefined,
      country: order.senderCountry ?? COMPANY_DEFAULT_SENDER.country,
      phone: order.senderPhone ?? undefined,
      email: order.senderEmail ?? undefined
    };
  }
  return COMPANY_DEFAULT_SENDER;
}

function senderSnapshotFields(sender: Address) {
  return {
    senderName: sender.name,
    senderAddressLine1: sender.addressLine1,
    senderAddressLine2: sender.addressLine2 ?? null,
    senderCity: sender.city,
    senderPostalCode: sender.postalCode,
    senderProvince: sender.province ?? null,
    senderCountry: sender.country,
    senderPhone: sender.phone ?? null,
    senderEmail: sender.email ?? null
  };
}

export async function createShipmentAndPickup(orderId: string) {
  const existing = await prisma.shipment.findUnique({ where: { orderId } });
  if (existing) return { shipment: existing, duplicate: true };

  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: { include: { product: true } } } });

  let parcel;
  try {
    parcel = await calculatePackage(order.items.map(i => ({ product: i.product, quantity: i.quantity })));
  } catch (e) {
    await prisma.order.update({ where: { id: orderId }, data: { productionStatus: 'requires_manual_review', shippingStatus: 'exception' } });
    await automationLog({ orderId, action: 'calculate_package', status: AutomationStatus.failed, message: e instanceof Error ? e.message : String(e) });
    throw e;
  }

  const provider = getShippingProvider();
  const sender = resolveSenderAddress(order);
  const recipient: Address = {
    name: order.customerName, addressLine1: order.addressLine1, addressLine2: order.addressLine2 ?? undefined,
    city: order.city, postalCode: order.postalCode, province: order.province ?? undefined, country: order.country,
    phone: order.customerPhone ?? undefined, email: order.customerEmail
  };

  try {
    const created = await provider.createShipment({
      reference: order.externalOrderId,
      recipient,
      sender,
      parcel: { weightGrams: parcel.totalWeightGrams, lengthCm: parcel.lengthCm, widthCm: parcel.widthCm, heightCm: parcel.heightCm }
    });

    const estimatedDeliveryDate = created.estimatedDeliveryDate ?? addBusinessDays(new Date(), env.DHL_DEFAULT_TRANSIT_DAYS);

    let shipment;
    try {
      shipment = await prisma.shipment.create({
        data: {
          orderId,
          carrier: env.SHIPPING_PROVIDER,
          carrierShipmentId: created.carrierShipmentId,
          trackingNumber: created.trackingNumber,
          labelUrl: created.labelUrl,
          totalWeightGrams: parcel.totalWeightGrams,
          lengthCm: parcel.lengthCm,
          widthCm: parcel.widthCm,
          heightCm: parcel.heightCm,
          estimatedDeliveryDate,
          status: ShippingStatus.label_created,
          providerPayload: created.raw as Prisma.InputJsonValue | undefined,
          ...senderSnapshotFields(sender)
        }
      });
    } catch (e) {
      // A concurrent request already created the shipment for this order.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === UNIQUE_CONSTRAINT_VIOLATION) {
        const raced = await prisma.shipment.findUnique({ where: { orderId } });
        if (raced) return { shipment: raced, duplicate: true };
      }
      throw e;
    }

    // Some DHL contracts don't support/require an API pickup request (a
    // courier route may already be scheduled). Mock always simulates it so
    // the full flow can be exercised in tests/staging.
    const shouldRequestPickup = env.SHIPPING_PROVIDER !== 'dhl' || env.DHL_PICKUP_ENABLED;
    let finalStatus: ShippingStatus = ShippingStatus.label_created;

    if (shouldRequestPickup) {
      const pickup = await provider.requestPickup({
        reference: order.externalOrderId,
        shipmentIds: [created.carrierShipmentId],
        pickupAddress: sender,
        packageCount: 1,
        totalWeightGrams: parcel.totalWeightGrams
      });
      shipment = await prisma.shipment.update({ where: { id: shipment.id }, data: { pickupRequestId: pickup.pickupRequestId, status: ShippingStatus.pickup_requested } });
      finalStatus = ShippingStatus.pickup_requested;
    } else {
      await automationLog({ orderId, action: 'shipping_pickup', status: AutomationStatus.skipped, message: 'DHL pickup request is disabled for this contract (DHL_PICKUP_ENABLED=false); arrange pickup manually or via the contracted courier route.' });
    }

    await prisma.order.update({ where: { id: orderId }, data: { shippingStatus: finalStatus } });
    await scheduleReview(orderId, estimatedDeliveryDate);
    await automationLog({ orderId, action: 'shipping_create_and_pickup', status: AutomationStatus.success, payload: { trackingNumber: created.trackingNumber, packageType: parcel.packageType, estimatedDeliveryDate } });

    return { shipment, duplicate: false };
  } catch (e) {
    await prisma.order.update({ where: { id: orderId }, data: { shippingStatus: ShippingStatus.exception } });
    await automationLog({ orderId, action: 'shipping_create_and_pickup', status: AutomationStatus.failed, message: e instanceof Error ? e.message : String(e) });
    throw e;
  }
}
