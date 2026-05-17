import { LogInput, FuelInput, IncomeInput, ExpenseInput } from "./logs.schema";
import * as repo from "./logs.repo";
import { AppError } from "../../shared/middleware/errorHandler";
import { prisma } from "../../shared/utils/prisma";

export const createLog = (userId: string, data: LogInput) => repo.createLog(userId, data);
export const getLogs = (userId: string, limit?: number, offset?: number) =>
  repo.getLogsByUser(userId, limit, offset);
export const deleteLog = async (id: string, userId: string) => {
  const record = await prisma.log.findUnique({ where: { id }, select: { userId: true } });
  if (!record) throw new AppError("Not found", 404);
  if (record.userId !== userId) throw new AppError("Forbidden", 403);
  return repo.deleteLog(id);
};
export const updateLog = (id: string, data: { value?: number }) => repo.updateLog(id, data);

export const createFuel = (userId: string, data: FuelInput) => repo.createFuel(userId, data);
export const getFuel = (userId: string, limit?: number, offset?: number) =>
  repo.getFuelByUser(userId, limit, offset);
export const deleteFuel = async (id: string, userId: string) => {
  const record = await prisma.fuelRecord.findUnique({ where: { id }, select: { userId: true } });
  if (!record) throw new AppError("Not found", 404);
  if (record.userId !== userId) throw new AppError("Forbidden", 403);
  return repo.deleteFuel(id);
};
export const updateFuel = (id: string, data: { kmAtFill?: number; gasKg?: number; costInr?: number }) => repo.updateFuel(id, data);

export const createIncome = (userId: string, data: IncomeInput) => repo.createIncome(userId, data);
export const getIncome = (userId: string, limit?: number, offset?: number) =>
  repo.getIncomeByUser(userId, limit, offset);
export const deleteIncome = async (id: string, userId: string) => {
  const record = await prisma.income.findUnique({ where: { id }, select: { userId: true } });
  if (!record) throw new AppError("Not found", 404);
  if (record.userId !== userId) throw new AppError("Forbidden", 403);
  return repo.deleteIncome(id);
};
export const updateIncome = (id: string, data: { amount?: number; categoryId?: string }) => repo.updateIncome(id, data);

export const createExpense = (userId: string, data: ExpenseInput) => repo.createExpense(userId, data);
export const getExpense = (userId: string, limit?: number, offset?: number) =>
  repo.getExpenseByUser(userId, limit, offset);
export const deleteExpense = async (id: string, userId: string) => {
  const record = await prisma.expense.findUnique({ where: { id }, select: { userId: true } });
  if (!record) throw new AppError("Not found", 404);
  if (record.userId !== userId) throw new AppError("Forbidden", 403);
  return repo.deleteExpense(id);
};
export const updateExpense = (id: string, data: { amount?: number; description?: string; typeId?: string; subTypeId?: string }) => repo.updateExpense(id, data);

export const getStatsByDate = (userId: string, date: string) => repo.getStatsByDate(userId, date);
