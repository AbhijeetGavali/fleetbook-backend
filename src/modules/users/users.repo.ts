import { prisma } from "../../shared/utils/prisma";
import { UpdateUserInput } from "./users.schema";

const safeSelect = {
  id: true, name: true, email: true, phone: true,
  role: true, assignedVehicle: true, isActive: true, createdAt: true,
};

export const findAll = () => prisma.user.findMany({ select: safeSelect, orderBy: { name: "asc" } });

export const findById = (id: string) => prisma.user.findUnique({ where: { id }, select: safeSelect });

export const findByEmail = (email: string) => prisma.user.findUnique({ where: { email } });

export const create = (data: {
  name: string; email: string; passwordHash: string;
  phone?: string; role: "ADMIN" | "DRIVER"; assignedVehicle?: string | null;
}) => prisma.user.create({ data, select: safeSelect });

export const update = (id: string, data: UpdateUserInput) =>
  prisma.user.update({ where: { id }, data, select: safeSelect });

export const remove = (id: string) => prisma.user.delete({ where: { id } });
