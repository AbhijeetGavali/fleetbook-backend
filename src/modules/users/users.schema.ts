import { z } from "zod";
import { vehicleSchema } from "../vehicles/vehicles.schema";

export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().min(10).max(10),
  assignedVehicle: z.string().uuid().optional(),
  vehicle: vehicleSchema.optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().min(10).max(10).optional(),
  password: z.string().min(6).optional(),
  assignedVehicle: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
});

export const updateProfileSchema = updateUserSchema.pick({
  name: true,
  phone: true,
  password: true,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
