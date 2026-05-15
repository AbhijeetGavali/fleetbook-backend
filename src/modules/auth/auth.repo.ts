import { prisma } from "../../shared/utils/prisma";
import { RegisterInput } from "./auth.schema";

export const findUserByEmail = (email: string) =>
  prisma.user.findUnique({ where: { email } });

export const createUser = (
  data: RegisterInput & { passwordHash: string; assignedVehicle: string },
) =>
  prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: "ADMIN",
      passwordHash: data.passwordHash,
      assignedVehicle: data.assignedVehicle,
      assignedToAdmin: "",
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      vehicle: true,
    },
  });

export const updateUserAdminIdToSelf = (userId: string) =>
  prisma.user.update({
    where: { id: userId },
    data: {
      assignedToAdmin: userId,
    },
  });
