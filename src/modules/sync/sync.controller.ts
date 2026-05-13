import { Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { sendSuccess } from "../../shared/utils/response";
import { AuthRequest } from "../../shared/types";
import { syncPayloadSchema } from "./sync.schema";
import { syncRecords } from "./sync.service";
import { ensureCloudSyncAllowed } from "../subscription/subscription.service";

export const sync = asyncHandler(async (req: AuthRequest, res: Response) => {
  await ensureCloudSyncAllowed(req.user!.userId);
  const payload = syncPayloadSchema.parse(req.body);
  const results = await syncRecords(req.user!.userId, payload);
  sendSuccess(res, { synced: results });
});
