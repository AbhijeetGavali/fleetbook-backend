import { Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { sendSuccess } from "../../shared/utils/response";
import { logSchema, fuelSchema, incomeSchema, expenseSchema } from "./logs.schema";
import { AuthRequest } from "../../shared/types";
import * as service from "./logs.service";

const userId = (req: AuthRequest) => req.user!.userId;
const pagination = (req: AuthRequest) => ({
  limit: Number(req.query.limit) || 50,
  offset: Number(req.query.offset) || 0,
});

// ── Logs ──────────────────────────────────────────────────────────────────────
export const createLog = asyncHandler(async (req: AuthRequest, res: Response) => {
  sendSuccess(res, await service.createLog(userId(req), logSchema.parse(req.body)), 201);
});
export const getLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { limit, offset } = pagination(req);
  sendSuccess(res, await service.getLogs(userId(req), limit, offset));
});
export const deleteLog = asyncHandler(async (req: AuthRequest, res: Response) => {
  await service.deleteLog(req.params.id, userId(req));
  sendSuccess(res, { message: "Deleted" });
});

// ── Fuel ──────────────────────────────────────────────────────────────────────
export const createFuel = asyncHandler(async (req: AuthRequest, res: Response) => {
  sendSuccess(res, await service.createFuel(userId(req), fuelSchema.parse(req.body)), 201);
});
export const getFuel = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { limit, offset } = pagination(req);
  sendSuccess(res, await service.getFuel(userId(req), limit, offset));
});
export const deleteFuel = asyncHandler(async (req: AuthRequest, res: Response) => {
  await service.deleteFuel(req.params.id, userId(req));
  sendSuccess(res, { message: "Deleted" });
});

// ── Income ────────────────────────────────────────────────────────────────────
export const createIncome = asyncHandler(async (req: AuthRequest, res: Response) => {
  sendSuccess(res, await service.createIncome(userId(req), incomeSchema.parse(req.body)), 201);
});
export const getIncome = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { limit, offset } = pagination(req);
  sendSuccess(res, await service.getIncome(userId(req), limit, offset));
});
export const deleteIncome = asyncHandler(async (req: AuthRequest, res: Response) => {
  await service.deleteIncome(req.params.id, userId(req));
  sendSuccess(res, { message: "Deleted" });
});

// ── Expense ───────────────────────────────────────────────────────────────────
export const createExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  sendSuccess(res, await service.createExpense(userId(req), expenseSchema.parse(req.body)), 201);
});
export const getExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { limit, offset } = pagination(req);
  sendSuccess(res, await service.getExpense(userId(req), limit, offset));
});
export const deleteExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  await service.deleteExpense(req.params.id, userId(req));
  sendSuccess(res, { message: "Deleted" });
});

// ── Stats ─────────────────────────────────────────────────────────────────────
export const getStatsByDate = asyncHandler(async (req: AuthRequest, res: Response) => {
  const date = req.query.date as string ?? new Date().toISOString().split("T")[0];
  sendSuccess(res, await service.getStatsByDate(userId(req), date));
});

// ── Updates ───────────────────────────────────────────────────────────────────
export const updateLog = asyncHandler(async (req: AuthRequest, res: Response) => {
  sendSuccess(res, await service.updateLog(req.params.id, req.body));
});
export const updateFuel = asyncHandler(async (req: AuthRequest, res: Response) => {
  sendSuccess(res, await service.updateFuel(req.params.id, req.body));
});
export const updateIncome = asyncHandler(async (req: AuthRequest, res: Response) => {
  sendSuccess(res, await service.updateIncome(req.params.id, req.body));
});
export const updateExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  sendSuccess(res, await service.updateExpense(req.params.id, req.body));
});
