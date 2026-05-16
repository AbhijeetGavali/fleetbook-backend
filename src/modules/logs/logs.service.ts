import { LogInput, FuelInput, IncomeInput, ExpenseInput } from "./logs.schema";
import * as repo from "./logs.repo";

export const createLog = (userId: string, data: LogInput) => repo.createLog(userId, data);
export const getLogs = (userId: string, limit?: number, offset?: number) =>
  repo.getLogsByUser(userId, limit, offset);
export const deleteLog = (id: string) => repo.deleteLog(id);
export const updateLog = (id: string, data: { value?: number }) => repo.updateLog(id, data);

export const createFuel = (userId: string, data: FuelInput) => repo.createFuel(userId, data);
export const getFuel = (userId: string, limit?: number, offset?: number) =>
  repo.getFuelByUser(userId, limit, offset);
export const deleteFuel = (id: string) => repo.deleteFuel(id);
export const updateFuel = (id: string, data: { kmAtFill?: number; gasKg?: number; costInr?: number }) => repo.updateFuel(id, data);

export const createIncome = (userId: string, data: IncomeInput) => repo.createIncome(userId, data);
export const getIncome = (userId: string, limit?: number, offset?: number) =>
  repo.getIncomeByUser(userId, limit, offset);
export const deleteIncome = (id: string) => repo.deleteIncome(id);
export const updateIncome = (id: string, data: { amount?: number; categoryId?: string }) => repo.updateIncome(id, data);

export const createExpense = (userId: string, data: ExpenseInput) => repo.createExpense(userId, data);
export const getExpense = (userId: string, limit?: number, offset?: number) =>
  repo.getExpenseByUser(userId, limit, offset);
export const deleteExpense = (id: string) => repo.deleteExpense(id);
export const updateExpense = (id: string, data: { amount?: number; description?: string; typeId?: string; subTypeId?: string }) => repo.updateExpense(id, data);

export const getStatsByDate = (userId: string, date: string) => repo.getStatsByDate(userId, date);
