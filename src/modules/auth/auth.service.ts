import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppError } from "../../shared/middleware/errorHandler";
import { RegisterInput, LoginInput } from "./auth.schema";
import * as authRepo from "./auth.repo";
import * as vehicleService from "../vehicles/vehicles.service";
import * as subscriptionService from "../subscription/subscription.service";

const signToken = (userId: string, role: string) =>
  jwt.sign({ userId, role }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  } as jwt.SignOptions);

export const register = async (input: RegisterInput) => {
  const existing = await authRepo.findUserByEmail(input.email);
  if (existing) throw new AppError("Email already registered", 409);

  const passwordHash = await bcrypt.hash(input.password, 12);
  const vehicle = await vehicleService.create(input.vehicle, "");
  const user = await authRepo.createUser({
    ...input,
    passwordHash,
    assignedVehicle: vehicle.id,
  });
  await vehicleService.updateAdmin(vehicle.id, user.id);
  await authRepo.updateUserAdminIdToSelf(user.id);
  const subscription = await subscriptionService.createSubscription(
    user.id,
    input.plan,
  );
  const token = signToken(user.id, user.role);
  return { user, token, subscription };
};

export const login = async (input: LoginInput) => {
  const user = await authRepo.findUserByEmail(input.email);
  if (!user) throw new AppError("Invalid credentials", 401);

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new AppError("Invalid credentials", 401);

  subscriptionService.isSubscriptionActive(user.assignedToAdmin);

  const token = signToken(user.id, user.role);
  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser, token };
};
