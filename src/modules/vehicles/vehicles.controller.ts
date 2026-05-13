import { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { sendSuccess } from "../../shared/utils/response";
import { vehicleSchema, updateVehicleSchema } from "./vehicles.schema";
import * as service from "./vehicles.service";

export const getAll = asyncHandler(async (_req, res: Response) => {
  sendSuccess(res, await service.getAll());
});
export const getById = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await service.getById(req.params.id));
});
export const create = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await service.create(vehicleSchema.parse(req.body)), 201);
});
export const update = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await service.update(req.params.id, updateVehicleSchema.parse(req.body)));
});
export const remove = asyncHandler(async (req: Request, res: Response) => {
  await service.remove(req.params.id);
  sendSuccess(res, { message: "Vehicle deleted" });
});
