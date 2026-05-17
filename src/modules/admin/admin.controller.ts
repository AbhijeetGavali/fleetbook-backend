import { Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { sendSuccess } from "../../shared/utils/response";
import { AuthRequest } from "../../shared/types";
import { updateProfileSchema } from "../users/users.schema";
import * as usersRepo from "../users/users.repo";
import { AppError } from "../../shared/middleware/errorHandler";
import bcrypt from "bcryptjs";
import { prisma } from "../../shared/utils/prisma";

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const admin = await usersRepo.findById(req.user!.userId, req.user!.userId);
  if (!admin) throw new AppError("Admin not found", 404);
  sendSuccess(res, admin);
});

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = updateProfileSchema.parse(req.body);
  const updateData: any = { ...data };
  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, 12);
    delete updateData.password;
  }
  const updated = await usersRepo.update(req.user!.userId, updateData);
  sendSuccess(res, updated);
});

export const getDriverLogs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { driverId } = req.params;
  // Verify driver belongs to this admin
  const driver = await prisma.user.findUnique({
    where: { id: driverId, assignedToAdmin: req.user!.userId },
    select: { id: true },
  });
  if (!driver) throw new AppError("Driver not found", 404);

  const limit = Number(req.query.limit) || 100;
  const offset = Number(req.query.offset) || 0;

  const [logs, fuel, incomes, expenses] = await Promise.all([
    prisma.log.findMany({ where: { userId: driverId }, orderBy: { date: "desc" }, take: limit, skip: offset }),
    prisma.fuelRecord.findMany({ where: { userId: driverId }, orderBy: { date: "desc" }, take: limit, skip: offset }),
    prisma.income.findMany({ where: { userId: driverId }, include: { category: true }, orderBy: { date: "desc" }, take: limit, skip: offset }),
    prisma.expense.findMany({ where: { userId: driverId }, include: { type: true, subType: true }, orderBy: { date: "desc" }, take: limit, skip: offset }),
  ]);

  // Normalise to a flat list matching the mobile Log shape
  const result = [
    ...logs.map((l) => ({ id: l.id, type: "log", date: l.date.toISOString(), user_id: l.userId, vehicle_id: l.vehicleId, record_type: l.recordType.toLowerCase(), value: l.value, synced: 1 })),
    ...fuel.map((f) => ({ id: f.id, type: "fuel", date: f.date.toISOString(), user_id: f.userId, km_at_fill: f.kmAtFill, gas_kg: f.gasKg, cost_inr: f.costInr, synced: 1 })),
    ...incomes.map((i) => ({ id: i.id, type: "income", date: i.date.toISOString(), user_id: i.userId, source: i.category.name, income_amount: i.amount, synced: 1 })),
    ...expenses.map((e) => ({ id: e.id, type: "expense", date: e.date.toISOString(), user_id: e.userId, expense_type: e.type.name, expense_sub_type: e.subType.name, description: e.description, expense_amount: e.amount, synced: 1 })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  sendSuccess(res, result);
});
