// Crea o actualiza un usuario para entrar en /facturas.
// Uso dentro del contenedor:
//   docker compose exec api node scripts/create-user.mjs correo@ejemplo.com "MiContraseña123"
import { PrismaClient } from '@prisma/client';
import { randomBytes, scryptSync } from 'node:crypto';

const [, , email, password, role] = process.argv;

if (!email || !password) {
  console.error('Uso: node scripts/create-user.mjs correo@ejemplo.com "contraseña" [admin|factory]');
  process.exit(1);
}
if (password.length < 8) {
  console.error('La contraseña debe tener al menos 8 caracteres.');
  process.exit(1);
}

function hashPassword(plain) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plain, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

const prisma = new PrismaClient();

const user = await prisma.user.upsert({
  where: { email },
  update: { passwordHash: hashPassword(password) },
  create: { email, passwordHash: hashPassword(password), role: role || 'admin' }
});

console.log(`Listo: usuario "${user.email}" guardado (rol: ${user.role}). Ya puede entrar en /facturas.`);
await prisma.$disconnect();
