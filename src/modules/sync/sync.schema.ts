import { z } from "zod";

const logEntrySchema = z.object({
  id: z.string(),
  vehicleId: z.string().uuid(),
  date: z.string().datetime(),
  recordType: z.enum(["START", "END"]),
  value: z.number().default(0),
});

const fuelEntrySchema = z.object({
  id: z.string(),
  date: z.string().datetime(),
  kmAtFill: z.number(),
  gasKg: z.number(),
  costInr: z.number(),
  photoUrl: z.string().url().optional(),
});

const incomeEntrySchema = z.object({
  id: z.string(),
  categoryId: z.string().uuid(),
  date: z.string().datetime(),
  amount: z.number().positive(),
  photoUrl: z.string().url().optional(),
});

const expenseEntrySchema = z.object({
  id: z.string(),
  typeId: z.string().uuid(),
  subTypeId: z.string().uuid(),
  date: z.string().datetime(),
  amount: z.number().positive(),
  description: z.string().optional(),
  photoUrl: z.string().url().optional(),
});

export const syncPayloadSchema = z.object({
  logs: z.array(logEntrySchema).default([]),
  fuel: z.array(fuelEntrySchema).default([]),
  incomes: z.array(incomeEntrySchema).default([]),
  expenses: z.array(expenseEntrySchema).default([]),
});

export type SyncPayload = z.infer<typeof syncPayloadSchema>;
