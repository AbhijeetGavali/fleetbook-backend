import { AppError } from "../../shared/middleware/errorHandler";
import { VehicleInput, UpdateVehicleInput } from "./vehicles.schema";
import * as repo from "./vehicles.repo";
import * as userRepo from "../users/users.repo";

export const getAll = (adminId: string) => repo.findAll(adminId);

export const getById = async (id: string, adminId: string) => {
  const u = await userRepo.findByuserId(adminId);
  if (!u) throw new AppError("User user not found", 404);
  const v = await repo.findById(id, u.assignedToAdmin || adminId);
  if (!v) throw new AppError("Vehicle not found", 404);
  return v;
};

export const create = (data: VehicleInput, adminId?: string) => repo.create(data, adminId);

export const update = async (id: string, data: UpdateVehicleInput, adminId: string) => {
  await getById(id, adminId);
  return repo.update(id, data, adminId);
};

export const updateAdmin = async (id: string, adminId: string) => {
  return repo.updateAdmin(id, adminId);
};

export const remove = async (id: string, adminId: string) => {
  await getById(id, adminId);
  return repo.remove(id, adminId);
};
