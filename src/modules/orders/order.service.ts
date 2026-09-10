import { AutomationStatus, PaymentStatus, Prisma, ProductionStatus } from '@prisma/client';
import { COMPANY } from '../../config/company.js';
import { addBusinessDays } from '../../lib/date.js';
import { automationLog } from '../../lib/log.js';
import { prisma } from '../../lib/prisma.js';
import { getFactoryNotifier } from '../notifications/factory-notifier.factory.js';
import type { MappedWooCommerceOrder } from '../woocommerce/woocommerce.mapper.js';
import { senderFieldsFromInput } from './sender.js';

export async function ingestWooCommerceOrder(input: MappedWooCommerceOrder, rawPayload: unknown) {
  const existing = await prisma.order.findUnique({ where: { externalOrderId: input.externalOrderId } });

  const order = existing
    ? await updateExistingOrder(existing.id, input, rawPayload)
    : await createNewOrder(input, rawPayload);

  if (order.productionStatus === ProductionStatus.requires_manual_review) {
    return { order, duplicate: Boolean(existing), requiresManualReview: true };
  }

  if (order.paymentStatus !== PaymentStatus.paid) {
    if (!existing) await automationLog({ orderId: order.id, action: 'production_create', status: AutomationStatus.skipped, message: 'Payment is not paid yet' });
    return { order, duplicate: Boolean(existing), waitingForPayment: true };
  }

  const productionOrdersCount = await prisma.productionOrder.count({ where: { orderId: order.id } });
  if (productionOrdersCount > 0) {
    return { order, duplicate: true, alreadyActivated: true };
  }

  return activateProduction(order.id);
}

async function createNewOrder(input: MappedWooCommerceOrder, rawPayload: unknown) {
  const skus = [...new Set(input.items.map(i => i.sku))];
  const products = skus.length ? await prisma.product.findMany({ where: { sku: { in: skus }, active: true } }) : [];
  const productBySku = new Map(products.map(p => [p.sku, p]));
  const missing = skus.filter(sku => !productBySku.has(sku));
  const incomplete = products.filter(p => p.weightGrams == null || p.lengthCm == null || p.widthCm == null || p.heightCm == null || !p.factoryId);
  const requiresReview = skus.length === 0 || missing.length > 0 || incomplete.length > 0;
  const senderData = input.dynamicSender ? senderFieldsFromInput(input.dynamicSender) : {};

  const order = await prisma.$transaction(async tx => {
    const created = await tx.order.create({
      data: {
        externalOrderId: input.externalOrderId,
        wooOrderKey: input.wooOrderKey,
        wooStatus: input.wooStatus,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2,
        city: input.city,
        postalCode: input.postalCode,
        province: input.province,
        country: input.country,
        paymentStatus: input.paymentStatus as PaymentStatus,
        productionStatus: requiresReview ? ProductionStatus.requires_manual_review : ProductionStatus.pending,
        totalAmount: input.totalAmount != null ? new Prisma.Decimal(input.totalAmount) : undefined,
        currency: input.currency,
        rawPayload: rawPayload as Prisma.InputJsonValue,
        ...senderData
      }
    });

    for (const item of input.items) {
      const p = productBySku.get(item.sku);
      if (!p) continue;
      await tx.orderItem.create({
        data: {
          orderId: created.id,
          productId: p.id,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice != null ? new Prisma.Decimal(item.unitPrice) : undefined
        }
      });
    }
    return created;
  });

  if (requiresReview) {
    await automationLog({
      orderId: order.id,
      action: 'order_ingest',
      status: AutomationStatus.failed,
      message: 'Order requires manual review: unknown SKU or incomplete logistics/factory data',
      payload: { missingSkus: missing, incompleteSkus: incomplete.map(p => p.sku) }
    });
  }

  return order;
}

async function updateExistingOrder(id: string, input: MappedWooCommerceOrder, rawPayload: unknown) {
  const senderData = input.dynamicSender ? senderFieldsFromInput(input.dynamicSender) : {};
  return prisma.order.update({
    where: { id },
    data: {
      wooOrderKey: input.wooOrderKey,
      wooStatus: input.wooStatus,
      paymentStatus: input.paymentStatus as PaymentStatus,
      customerName: input.customerName,
      customerEmail: input.customerEmail || undefined,
      customerPhone: input.customerPhone,
      addressLine1: input.addressLine1 || undefined,
      addressLine2: input.addressLine2,
      city: input.city || undefined,
      postalCode: input.postalCode || undefined,
      province: input.province,
      country: input.country || undefined,
      totalAmount: input.totalAmount != null ? new Prisma.Decimal(input.totalAmount) : undefined,
      rawPayload: rawPayload as Prisma.InputJsonValue,
      ...senderData
    }
  });
}

async function activateProduction(orderId: string) {
  const full = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: { include: { product: true } } }
  });

  const factoryIds = [...new Set(full.items.map(i => i.product.factoryId).filter((v): v is string => Boolean(v)))];
  if (factoryIds.length === 0) {
    await prisma.order.update({ where: { id: orderId }, data: { productionStatus: ProductionStatus.requires_manual_review } });
    await automationLog({ orderId, action: 'production_create', status: AutomationStatus.failed, message: 'No factory assigned to any order item' });
    return { order: full, duplicate: false, requiresManualReview: true };
  }

  const targetFinishAt = addBusinessDays(new Date(), COMPANY.PRODUCTION_TARGET_BUSINESS_DAYS);
  const productionOrders = await prisma.$transaction(
    factoryIds.map(factoryId => prisma.productionOrder.create({ data: { orderId, factoryId, targetFinishAt } }))
  );

  const factories = await prisma.factory.findMany({ where: { id: { in: factoryIds } } });
  const factoryById = new Map(factories.map(f => [f.id, f]));
  const notifier = getFactoryNotifier();

  for (const po of productionOrders) {
    const factory = factoryById.get(po.factoryId)!;
    const factoryItems = full.items.filter(i => i.product.factoryId === po.factoryId);
    try {
      await notifier.notifyNewProductionOrder({
        event: 'production_order.created',
        productionOrderId: po.id,
        orderId: full.id,
        externalOrderId: full.externalOrderId,
        factory: { id: factory.id, name: factory.name, email: factory.email, phone: factory.phone },
        items: factoryItems.map(i => ({ sku: i.sku, name: i.product.name, quantity: i.quantity })),
        targetFinishAt
      });
      await automationLog({ orderId, action: 'factory_notify', status: AutomationStatus.success, payload: { factoryId: po.factoryId } });
    } catch (e) {
      await automationLog({ orderId, action: 'factory_notify', status: AutomationStatus.failed, message: e instanceof Error ? e.message : String(e) });
    }
  }

  const updated = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: { include: { product: true } }, productionOrders: { include: { factory: true } } }
  });
  return { order: updated, duplicate: false };
}
