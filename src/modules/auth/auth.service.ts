import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppError } from "../../shared/middleware/errorHandler";
import { RegisterInput, LoginInput } from "./auth.schema";
import * as authRepo from "./auth.repo";

const signToken = (userId: string, role: string) =>
  jwt.sign({ userId, role }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  } as jwt.SignOptions);

export const register = async (input: RegisterInput) => {
  const existing = await authRepo.findUserByEmail(input.email);
  if (existing) throw new AppError("Email already registered", 409);

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await authRepo.createUser({ ...input, passwordHash });
  const token = signToken(user.id, user.role);
  return { user, token };
};

export const login = async (input: LoginInput) => {
  const user = await authRepo.findUserByEmail(input.email);
  if (!user) throw new AppError("Invalid credentials", 401);

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new AppError("Invalid credentials", 401);

  const token = signToken(user.id, user.role);
  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser, token };
};
