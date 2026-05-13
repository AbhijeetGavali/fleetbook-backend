import { z } from "zod";

export const createSubscriptionSchema = z.object({
  plan: z.enum(["monthly", "annual"]),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
