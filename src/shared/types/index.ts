import { Request } from "express";

export interface AuthPayload {
  userId: string;
  role: "ADMIN" | "DRIVER";
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}
