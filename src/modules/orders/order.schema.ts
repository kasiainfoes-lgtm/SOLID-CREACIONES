import { z } from 'zod';

export const senderSchema = z.object({
  name: z.string().min(1),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  postalCode: z.string().min(1),
  province: z.string().optional(),
  country: z.string().length(2).default('ES'),
  phone: z.string().optional(),
  email: z.string().email().optional()
});

export type SenderInput = z.infer<typeof senderSchema>;
