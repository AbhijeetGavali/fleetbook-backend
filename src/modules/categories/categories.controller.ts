import { Request, Response } from "express";
import { CategoryType } from "@prisma/client";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { sendSuccess } from "../../shared/utils/response";
import { categorySchema, updateCategorySchema } from "./categories.schema";
import { AuthRequest } from "../../shared/types";
import * as service from "./categories.service";

export const getAll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const type = req.query.type as CategoryType;
  sendSuccess(res, await service.getAll(type, req.user!.userId));
});

export const getById = asyncHandler(async (req: AuthRequest, res: Response) => {
  sendSuccess(res, await service.getById(req.params.id, req.user!.userId));
});

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = categorySchema.parse(req.body);
  sendSuccess(res, await service.create(data, req.user!.userId), 201);
});

export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  sendSuccess(res, await service.update(req.params.id, updateCategorySchema.parse(req.body), req.user!.userId));
});

export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
  await service.remove(req.params.id, req.user!.userId);
  sendSuccess(res, { message: "Category deleted" });
});
