import { AutomationStatus, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

export async function automationLog(input: {
  orderId?: string;
  action: string;
  status: AutomationStatus;
  message?: string;
  payload?: unknown;
}) {
  return prisma.automationLog.create({
    data: {
      orderId: input.orderId,
      action: input.action,
      status: input.status,
      message: input.message,
      payload: input.payload as Prisma.InputJsonValue | undefined
    }
  });
}
