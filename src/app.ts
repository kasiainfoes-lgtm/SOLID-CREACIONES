import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { orderRoutes } from './modules/orders/order.routes.js';
import { productRoutes } from './modules/products/product.routes.js';
import { factoryRoutes } from './modules/factory/factory.routes.js';
import { shippingRoutes } from './modules/shipping/shipping.routes.js';
import { woocommerceRoutes } from './modules/woocommerce/woocommerce.routes.js';
import { prisma } from './lib/prisma.js';

export async function buildApp() {
  const app = Fastify({ loggerInstance: logger });

  // Keep the raw request body around so webhook signatures (e.g. WooCommerce's
  // X-WC-Webhook-Signature HMAC) can be verified against the exact bytes sent.
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    const raw = body as string;
    (req as typeof req & { rawBody?: string }).rawBody = raw;
    if (!raw) return done(null, {});
    try {
      done(null, JSON.parse(raw));
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  await app.register(cors, { origin: true });
  await app.register(jwt, { secret: env.JWT_SECRET });
  app.decorate('authenticate', async function (request: any, reply: any) {
    try { await request.jwtVerify(); }
    catch { return reply.code(401).send({ error: 'unauthorized' }); }
  });

  app.get('/health', async () => {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, provider: env.SHIPPING_PROVIDER };
  });

  await app.register(authRoutes);
  await app.register(orderRoutes);
  await app.register(productRoutes);
  await app.register(factoryRoutes);
  await app.register(shippingRoutes);
  await app.register(woocommerceRoutes);
  return app;
}
