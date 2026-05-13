import { z } from "zod";

export const categorySchema = z.object({
  type: z.enum(["INCOME", "EXPENSE", "EXPENSE_TYPE"]),
  name: z.string().min(1).max(100),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = categorySchema.partial();

export type CategoryInput = z.infer<typeof categorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
