import { prisma } from "../../shared/utils/prisma";
import { CategoryInput, UpdateCategoryInput } from "./categories.schema";
import { CategoryType } from "@prisma/client";

export const findAll = (type?: CategoryType, adminId?: string) =>
  prisma.category.findMany({
    where: {
      type,
      createdBy: { equals: adminId },
    },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

export const findById = (id: string, adminId?: string) =>
  prisma.category.findUnique({ where: { id, createdBy: { equals: adminId } } });

export const create = (data: CategoryInput & { createdBy: string }) =>
  prisma.category.create({ data });

export const update = (id: string, data: UpdateCategoryInput) =>
  prisma.category.update({ where: { id }, data });

export const remove = (id: string, adminId?: string) => prisma.category.delete({ where: { id, createdBy: { equals: adminId } } });
  