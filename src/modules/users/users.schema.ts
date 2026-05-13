import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  role: z.enum(["ADMIN", "DRIVER"]).default("DRIVER"),
  assignedVehicle: z.string().uuid().nullable().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  assignedVehicle: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
  role: z.enum(["ADMIN", "DRIVER"]).optional(),
});

export const updateProfileSchema = updateUserSchema.pick({
  name: true,
  phone: true,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
