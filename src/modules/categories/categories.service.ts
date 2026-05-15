import { CategoryType } from "@prisma/client";
import { AppError } from "../../shared/middleware/errorHandler";
import { CategoryInput, UpdateCategoryInput } from "./categories.schema";
import * as repo from "./categories.repo";

export const getAll = (type?: CategoryType, adminId?: string) => repo.findAll(type, adminId);

export const getById = async (id: string, adminId?: string) => {
  const c = await repo.findById(id, adminId);
  if (!c) throw new AppError("Category not found", 404);
  return c;
};

export const create = (data: CategoryInput, createdBy: string) =>
  repo.create({ ...data, createdBy });

export const update = async (id: string, data: UpdateCategoryInput, adminId?: string) => {
  await getById(id, adminId);
  return repo.update(id, data);
};

export const remove = async (id: string, adminId?: string) => {
  await getById(id, adminId);
  return repo.remove(id);
};
