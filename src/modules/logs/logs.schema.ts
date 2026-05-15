import { z } from "zod";

export const logSchema = z.object({
  vehicleId: z.string().uuid(),
  date: z.string().datetime(),
  recordType: z.enum(["START", "END"]),
  value: z.number().min(0).default(0),
});

export const fuelSchema = z.object({
  date: z.string().datetime(),
  kmAtFill: z.number().min(0),
  gasKg: z.number().min(0),
  costInr: z.number().min(0),
  photoUrl: z.string().url().optional(),
});

export const incomeSchema = z.object({
  categoryId: z.string().uuid(),
  date: z.string().datetime(),
  amount: z.number().positive(),
  photoUrl: z.string().url().optional(),
});

export const expenseSchema = z.object({
  typeId: z.string().uuid(),
  subTypeId: z.string().uuid(),
  date: z.string().datetime(),
  amount: z.number().positive(),
  description: z.string().optional(),
  photoUrl: z.string().url().optional(),
});

export type LogInput = z.infer<typeof logSchema>;
export type FuelInput = z.infer<typeof fuelSchema>;
export type IncomeInput = z.infer<typeof incomeSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
