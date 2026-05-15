import { z } from "zod";
import { vehicleSchema } from "../vehicles/vehicles.schema";

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(10).max(10),
  password: z.string().min(6).max(100),
  vehicle: vehicleSchema,
  plan: z.enum(["monthly", "annual"]),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
