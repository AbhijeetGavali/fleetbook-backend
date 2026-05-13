import { CategoryType } from "@prisma/client";
import { AppError } from "../../shared/middleware/errorHandler";
import { CategoryInput, UpdateCategoryInput } from "./categories.schema";
import * as repo from "./categories.repo";

export const getAll = (type?: CategoryType) => repo.findAll(type);

export const getById = async (id: string) => {
  const c = await repo.findById(id);
  if (!c) throw new AppError("Category not found", 404);
  return c;
};

export const create = (data: CategoryInput, createdBy: string) =>
  repo.create({ ...data, createdBy });

export const update = async (id: string, data: UpdateCategoryInput) => {
  await getById(id);
  return repo.update(id, data);
};

export const remove = async (id: string) => {
  await getById(id);
  return repo.remove(id);
};
