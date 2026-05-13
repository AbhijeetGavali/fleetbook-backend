import { prisma } from "../../shared/utils/prisma";
import { RegisterInput } from "./auth.schema";

export const findUserByEmail = (email: string) =>
  prisma.user.findUnique({ where: { email } });

export const createUser = (data: RegisterInput & { passwordHash: string }) =>
  prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      passwordHash: data.passwordHash,
      assignedVehicle: data.assignedVehicle,
    },
    select: { id: true, name: true, email: true, phone: true, role: true, assignedVehicle: true },
  });
