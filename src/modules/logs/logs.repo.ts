import { prisma } from "../../shared/utils/prisma";
import { LogInput, FuelInput, IncomeInput, ExpenseInput } from "./logs.schema";

// ── Logs ──────────────────────────────────────────────────────────────────────
export const createLog = (userId: string, data: LogInput) =>
  prisma.log.create({ data: { userId, ...data, date: new Date(data.date) } });

export const getLogsByUser = (userId: string, limit = 50, offset = 0) =>
  prisma.log.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: limit,
    skip: offset,
  });

export const deleteLog = (id: string) => prisma.log.delete({ where: { id } });

// ── Fuel ──────────────────────────────────────────────────────────────────────
export const createFuel = (userId: string, data: FuelInput) =>
  prisma.fuelRecord.create({ data: { userId, ...data, date: new Date(data.date) } });

export const getFuelByUser = (userId: string, limit = 50, offset = 0) =>
  prisma.fuelRecord.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: limit,
    skip: offset,
  });

export const deleteFuel = (id: string) => prisma.fuelRecord.delete({ where: { id } });

// ── Income ────────────────────────────────────────────────────────────────────
export const createIncome = (userId: string, data: IncomeInput) =>
  prisma.income.create({
    data: { userId, ...data, date: new Date(data.date) },
    include: { category: true },
  });

export const getIncomeByUser = (userId: string, limit = 50, offset = 0) =>
  prisma.income.findMany({
    where: { userId },
    include: { category: true },
    orderBy: { date: "desc" },
    take: limit,
    skip: offset,
  });

export const deleteIncome = (id: string) => prisma.income.delete({ where: { id } });

// ── Expense ───────────────────────────────────────────────────────────────────
export const createExpense = (userId: string, data: ExpenseInput) =>
  prisma.expense.create({
    data: { userId, ...data, date: new Date(data.date) },
    include: { type: true, subType: true },
  });

export const getExpenseByUser = (userId: string, limit = 50, offset = 0) =>
  prisma.expense.findMany({
    where: { userId },
    include: { type: true, subType: true },
    orderBy: { date: "desc" },
    take: limit,
    skip: offset,
  });

export const deleteExpense = (id: string) => prisma.expense.delete({ where: { id } });

// ── Updates ───────────────────────────────────────────────────────────────────
export const updateLog = (id: string, data: { value?: number }) =>
  prisma.log.update({ where: { id }, data });

export const updateFuel = (id: string, data: { kmAtFill?: number; gasKg?: number; costInr?: number }) =>
  prisma.fuelRecord.update({ where: { id }, data });

export const updateIncome = (id: string, data: { amount?: number; categoryId?: string }) =>
  prisma.income.update({ where: { id }, data, include: { category: true } });

export const updateExpense = (id: string, data: { amount?: number; description?: string; typeId?: string; subTypeId?: string }) =>
  prisma.expense.update({ where: { id }, data, include: { type: true, subType: true } });

// ── Stats for a date ──────────────────────────────────────────────────────────
export const getStatsByDate = async (userId: string, date: string) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const [logs, fuel, incomes, expenses] = await Promise.all([
    prisma.log.findMany({ where: { userId, date: { gte: start, lte: end } } }),
    prisma.fuelRecord.findMany({ where: { userId, date: { gte: start, lte: end } } }),
    prisma.income.findMany({ where: { userId, date: { gte: start, lte: end } }, include: { category: true } }),
    prisma.expense.findMany({ where: { userId, date: { gte: start, lte: end } }, include: { type: true, subType: true } }),
  ]);
  return { logs, fuel, incomes, expenses };
};
