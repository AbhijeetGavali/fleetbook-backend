import { AppError } from "../../shared/middleware/errorHandler";
import { VehicleInput, UpdateVehicleInput } from "./vehicles.schema";
import * as repo from "./vehicles.repo";

export const getAll = () => repo.findAll();

export const getById = async (id: string) => {
  const v = await repo.findById(id);
  if (!v) throw new AppError("Vehicle not found", 404);
  return v;
};

export const create = (data: VehicleInput) => repo.create(data);

export const update = async (id: string, data: UpdateVehicleInput) => {
  await getById(id);
  return repo.update(id, data);
};

export const remove = async (id: string) => {
  await getById(id);
  return repo.remove(id);
};
