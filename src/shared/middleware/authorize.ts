import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../types";
import { AppError } from "./errorHandler";

export const authorize = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest;
    if (!authReq.user) {
      throw new AppError("Unauthorized", 401);
    }

    if (!allowedRoles.includes(authReq.user.role)) {
      throw new AppError("Forbidden", 403);
    }

    next();
  };
};
