import { Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { sendSuccess } from "../../shared/utils/response";
import { vehicleSchema, updateVehicleSchema } from "./vehicles.schema";
import * as service from "./vehicles.service";
import { AuthRequest } from "../../shared/types";

export const getAll = asyncHandler(async (req: AuthRequest, res: Response) => {
  sendSuccess(res, await service.getAll(req.user!.userId));
});
export const getById = asyncHandler(async (req: AuthRequest, res: Response) => {
  sendSuccess(res, await service.getById(req.params.id, req.user!.userId));
});
export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  sendSuccess(res, await service.create(vehicleSchema.parse(req.body), req.user!.userId), 201);
});
export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  sendSuccess(res, await service.update(req.params.id, updateVehicleSchema.parse(req.body), req.user!.userId));
});
export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
  await service.remove(req.params.id, req.user!.userId);
  sendSuccess(res, { message: "Vehicle deleted" });
});
