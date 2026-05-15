import bcrypt from "bcryptjs";
import { AppError } from "../../shared/middleware/errorHandler";
import { CreateUserInput, UpdateUserInput } from "./users.schema";
import * as usersRepo from "./users.repo";

export const getAll = (adminId: string) => usersRepo.findAll(adminId);

export const getById = async (id: string, adminId: string) => {
  const user = await usersRepo.findById(id, adminId);
  if (!user) throw new AppError("User not found", 404);
  return user;
};

export const create = async (input: CreateUserInput, adminId: string) => {
  const existing = await usersRepo.findByEmail(input.email);
  if (existing) throw new AppError("Email already registered", 409);
  const passwordHash = await bcrypt.hash(input.password, 12);
  return usersRepo.create({
    name: input.name,
    email: input.email,
    passwordHash,
    phone: input.phone,
    role: "DRIVER",
    assignedVehicle: input.assignedVehicle!,
    assignedToAdmin: adminId,
  });
};

export const update = async (id: string, data: UpdateUserInput, adminId: string) => {
  await getById(id, adminId);
  return usersRepo.update(id, data);
};

export const remove = async (id: string, adminId: string) => {
  await getById(id, adminId);
  return usersRepo.remove(id);
};
