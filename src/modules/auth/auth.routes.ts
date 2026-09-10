import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';

const credentials = z.object({ email: z.string().email(), password: z.string().min(8) });

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', async (req, reply) => {
    const parsed = credentials.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_credentials_payload' });
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) return reply.code(401).send({ error: 'invalid_credentials' });
    return { token: app.jwt.sign({ sub: user.id, email: user.email, role: user.role }, { expiresIn: '12h' }) };
  });
}
