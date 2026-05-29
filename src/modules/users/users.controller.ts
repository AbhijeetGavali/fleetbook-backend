import { Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { sendSuccess } from "../../shared/utils/response";
import {
  createUserSchema,
  updateUserSchema,
  updateProfileSchema,
} from "./users.schema";
import * as usersService from "./users.service";
import { AuthRequest } from "../../shared/types";
import * as vehicleService from "../vehicles/vehicles.service";
import { AppError } from "../../shared/middleware/errorHandler";
import {
  canAddUser,
  isSubscriptionActive,
  updateSubscriptionAddQuantity,
} from "../subscription/subscription.service";

export const getAll = asyncHandler(async (req: AuthRequest, res: Response) => {
  sendSuccess(res, await usersService.getAll(req.user!.userId));
});

export const getById = asyncHandler(async (req: AuthRequest, res: Response) => {
  sendSuccess(res, await usersService.getById(req.params.id, req.user!.userId));
});

export const getCurrent = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    sendSuccess(
      res,
      await usersService.getById(req.user!.userId, req.user!.userId),
    );
  },
);

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  await canAddUser(req.user!.userId);
  const data = createUserSchema.parse(req.body);
  if (!data.vehicle && !data.assignedVehicle) {
    throw new AppError(
      "Either vehicle details or assignedVehicle ID must be provided",
    );
  }
  if (!data.assignedVehicle && data.vehicle) {
    const vehicle = await vehicleService.create(data.vehicle, req.user!.userId);
    data.assignedVehicle = vehicle.id;
  }
  const driver = await usersService.create(data, req.user!.userId);
  await updateSubscriptionAddQuantity(req.user!.userId);
  sendSuccess(res, driver, 201);
});

export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  await isSubscriptionActive(req.user!.userId);
  const data = updateUserSchema.parse(req.body);
  sendSuccess(
    res,
    await usersService.update(req.params.id, data, req.user!.userId),
  );
});

export const updateCurrent = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const data = updateProfileSchema.parse(req.body);
    sendSuccess(
      res,
      await usersService.update(req.user!.userId, data, req.user!.userId),
    );
  },
);

export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
  await usersService.remove(req.params.id, req.user!.userId);
  sendSuccess(res, { message: "User deleted" });
});
