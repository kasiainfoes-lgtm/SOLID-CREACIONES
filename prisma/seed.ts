import { PrismaClient } from '@prisma/client';
import { scryptSync } from 'node:crypto';
import { PACKAGE_TYPES, PRODUCTS } from './data/solid-creaciones-catalog.js';

const prisma = new PrismaClient();

function seedHash(password: string) {
  const salt = 'change-this-seed-salt';
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

async function main() {
  const factory = await prisma.factory.upsert({
    where: { id: 'factory-solid-creaciones' }, update: {},
    create: { id: 'factory-solid-creaciones', name: 'Solid Creaciones', email: 'info@solidcreaciones.es' }
  });

  for (const box of PACKAGE_TYPES) {
    await prisma.packageType.upsert({ where: { code: box.code }, update: box, create: box });
  }

  for (const product of PRODUCTS) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: { ...product, factoryId: factory.id },
      create: { ...product, factoryId: factory.id }
    });
  }

  await prisma.user.upsert({
    where: { email: 'admin@example.com' }, update: {},
    create: { email: 'admin@example.com', passwordHash: seedHash('ChangeMe123!'), role: 'admin' }
  });

  console.log(`Seed complete: ${PACKAGE_TYPES.length} package types, ${PRODUCTS.length} products (catálogo Solid Creaciones).`);
  console.log('Demo login: admin@example.com / ChangeMe123! (change immediately)');
}
main().finally(() => prisma.$disconnect());
