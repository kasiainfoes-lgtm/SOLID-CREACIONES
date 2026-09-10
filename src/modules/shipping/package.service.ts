import type { Product, PackageType } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export type PackageItem = { product: Product; quantity: number };

export async function calculatePackage(items: PackageItem[]) {
  for (const { product } of items) {
    if (product.weightGrams == null || product.lengthCm == null || product.widthCm == null || product.heightCm == null) {
      throw new Error(`Missing logistics data for SKU ${product.sku}`);
    }
  }

  const productWeight = items.reduce((sum, x) => sum + (x.product.weightGrams ?? 0) * x.quantity, 0);
  const maxLength = Math.max(...items.map(x => x.product.lengthCm ?? 0));
  const maxWidth = Math.max(...items.map(x => x.product.widthCm ?? 0));
  const stackedHeight = items.reduce((sum, x) => sum + (x.product.heightCm ?? 0) * x.quantity, 0);

  const boxes = await prisma.packageType.findMany({ where: { active: true }, orderBy: { externalLengthCm: 'asc' } });
  const box = boxes.find((b: PackageType) =>
    productWeight + b.packagingWeightGrams <= b.maxWeightGrams &&
    maxLength <= b.internalLengthCm && maxWidth <= b.internalWidthCm && stackedHeight <= b.internalHeightCm
  );

  if (box) {
    return {
      totalWeightGrams: productWeight + box.packagingWeightGrams,
      lengthCm: box.externalLengthCm,
      widthCm: box.externalWidthCm,
      heightCm: box.externalHeightCm,
      packageType: box.code
    };
  }

  // Fallback only when every SKU defines its own packaging data. This is safe for simple/single-item orders.
  if (items.length === 1 && items[0].quantity === 1) {
    const p = items[0].product;
    return {
      totalWeightGrams: productWeight + (p.packagingWeightGrams ?? 0),
      lengthCm: p.lengthCm!, widthCm: p.widthCm!, heightCm: p.heightCm!, packageType: p.packagingType ?? 'SKU_DEFAULT'
    };
  }

  throw new Error('No package type fits this order; manual review required');
}
