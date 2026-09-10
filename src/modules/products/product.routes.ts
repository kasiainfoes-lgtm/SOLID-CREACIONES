import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';

const productInput = z.object({
  sku: z.string().min(1), name: z.string().min(1), weightGrams: z.number().int().positive(),
  lengthCm: z.number().positive(), widthCm: z.number().positive(), heightCm: z.number().positive(),
  packagingType: z.string().optional(), packagingWeightGrams: z.number().int().nonnegative().optional(),
  productionTimeHours: z.number().int().nonnegative().optional(), factoryId: z.string().optional(), active: z.boolean().default(true)
});

export async function productRoutes(app: FastifyInstance) {
  app.get('/products/:sku', { onRequest: [app.authenticate] }, async (req: any, reply) => {
    const p = await prisma.product.findUnique({ where: { sku: req.params.sku }, include: { factory: true } });
    if (!p) return reply.code(404).send({ error: 'not_found' });
    return p;
  });
  app.post('/products', { onRequest: [app.authenticate] }, async (req, reply) => {
    const parsed = productInput.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(parsed.error.flatten());
    return reply.code(201).send(await prisma.product.create({ data: parsed.data }));
  });
}
