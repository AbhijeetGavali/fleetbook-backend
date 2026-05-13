import bcrypt from "bcryptjs";
import { AppError } from "../../shared/middleware/errorHandler";
import { CreateUserInput, UpdateUserInput } from "./users.schema";
import * as usersRepo from "./users.repo";

export const getAll = () => usersRepo.findAll();

export const getById = async (id: string) => {
  const user = await usersRepo.findById(id);
  if (!user) throw new AppError("User not found", 404);
  return user;
};

export const create = async (input: CreateUserInput) => {
  const existing = await usersRepo.findByEmail(input.email);
  if (existing) throw new AppError("Email already registered", 409);
  const passwordHash = await bcrypt.hash(input.password, 12);
  return usersRepo.create({
    name: input.name,
    email: input.email,
    passwordHash,
    phone: input.phone,
    role: input.role,
    assignedVehicle: input.assignedVehicle ?? null,
  });
};

export const update = async (id: string, data: UpdateUserInput) => {
  await getById(id);
  return usersRepo.update(id, data);
};

export const remove = async (id: string) => {
  await getById(id);
  return usersRepo.remove(id);
};
