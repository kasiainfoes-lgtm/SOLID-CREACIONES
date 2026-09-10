import { PrismaClient } from '@prisma/client';
import { scryptSync } from 'node:crypto';
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
  await prisma.packageType.upsert({
    where: { code: 'BOX_M' }, update: {},
    create: { code: 'BOX_M', maxWeightGrams: 5000, internalLengthCm: 46, internalWidthCm: 36, internalHeightCm: 10, externalLengthCm: 48, externalWidthCm: 38, externalHeightCm: 12, packagingWeightGrams: 250 }
  });
  await prisma.product.upsert({
    where: { sku: 'FRAME-30X40-BLACK' }, update: {},
    create: { sku: 'FRAME-30X40-BLACK', name: 'Marco 30x40 negro', weightGrams: 1080, lengthCm: 40, widthCm: 30, heightCm: 3, packagingType: 'BOX_M', packagingWeightGrams: 250, productionTimeHours: 24, factoryId: factory.id }
  });
  await prisma.user.upsert({
    where: { email: 'admin@example.com' }, update: {},
    create: { email: 'admin@example.com', passwordHash: seedHash('ChangeMe123!'), role: 'admin' }
  });
  console.log('Seed complete. Demo login: admin@example.com / ChangeMe123! (change immediately)');
}
main().finally(() => prisma.$disconnect());
