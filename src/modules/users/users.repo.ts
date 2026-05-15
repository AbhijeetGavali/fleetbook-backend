import { prisma } from "../../shared/utils/prisma";
import { UpdateUserInput } from "./users.schema";

const safeSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  assignedVehicle: true,
  isActive: true,
  createdAt: true,
};

export const findAll = (adminId: string) =>
  prisma.user.findMany({
    where: { assignedToAdmin: adminId },
    select: safeSelect,
    orderBy: { name: "asc" },
  });

export const findById = (id: string, adminId: string) =>
  prisma.user.findUnique({
    where: { id, assignedToAdmin: adminId },
    select: safeSelect,
  });

export const findByEmail = (email: string) =>
  prisma.user.findUnique({ where: { email } });

export const create = (data: {
  name: string;
  email: string;
  passwordHash: string;
  phone: string;
  role: "DRIVER";
  assignedVehicle: string;
  assignedToAdmin: string;
}) => prisma.user.create({ data, select: safeSelect });

export const update = (id: string, data: UpdateUserInput) =>
  prisma.user.update({ where: { id }, data, select: safeSelect });

export const remove = (id: string) => prisma.user.delete({ where: { id } });
