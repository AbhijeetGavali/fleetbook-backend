import { z } from "zod";

export const vehicleSchema = z.object({
  regNo: z.string().min(1).max(20),
  model: z.string().optional(),
  fuelType: z.string().optional(),
  lastKm: z.number().int().min(0).optional(),
});

export const updateVehicleSchema = vehicleSchema.partial();

export type VehicleInput = z.infer<typeof vehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
