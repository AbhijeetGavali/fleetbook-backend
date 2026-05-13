import { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { sendSuccess } from "../../shared/utils/response";
import {
  createUserSchema,
  updateUserSchema,
  updateProfileSchema,
} from "./users.schema";
import * as usersService from "./users.service";
import { AuthRequest } from "../../shared/types";

export const getAll = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await usersService.getAll());
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await usersService.getById(req.params.id));
});

export const getCurrent = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    sendSuccess(res, await usersService.getById(req.user!.userId));
  },
);

export const create = asyncHandler(async (req: Request, res: Response) => {
  const data = createUserSchema.parse(req.body);
  sendSuccess(res, await usersService.create(data), 201);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const data = updateUserSchema.parse(req.body);
  sendSuccess(res, await usersService.update(req.params.id, data));
});

export const updateCurrent = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const data = updateProfileSchema.parse(req.body);
    sendSuccess(res, await usersService.update(req.user!.userId, data));
  },
);

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await usersService.remove(req.params.id);
  sendSuccess(res, { message: "User deleted" });
});
