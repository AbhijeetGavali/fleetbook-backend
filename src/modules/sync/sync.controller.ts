import { Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { sendSuccess } from "../../shared/utils/response";
import { AuthRequest } from "../../shared/types";
import { syncPayloadSchema } from "./sync.schema";
import { syncRecordsChunked, getSyncBatchStatus } from "./sync.service";
import { isSubscriptionActive } from "../subscription/subscription.service";
import { AppError } from "../../shared/middleware/errorHandler";

// Combined endpoint: handles both legacy and chunked sync
export const sync = asyncHandler(async (req: AuthRequest, res: Response) => {
  await isSubscriptionActive(req.user!.userId);

  // Check if this is a chunked sync or legacy
  if (!req.body.metadata)
    throw new AppError(
      "Metadata field is required for chunked sync. Please Update your client.",
    );

  // Route to chunked sync
  const payload = syncPayloadSchema.parse(req.body);
  const metadata = req.body.metadata;

  if (!metadata?.batchId || !metadata?.chunkNumber || !metadata?.totalChunks) {
    return sendSuccess(res, {
      error: "Missing metadata fields: batchId, chunkNumber, totalChunks",
    });
  }

  // Process the chunk
  const results = await syncRecordsChunked(req.user!.userId, payload, metadata);

  sendSuccess(res, {
    synced: results,
    batchId: metadata.batchId,
    chunkNumber: metadata.chunkNumber,
    message: `Synced chunk ${metadata.chunkNumber}/${metadata.totalChunks}`,
  });
});

// NEW: Check batch status
export const syncStatus = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const batchId = req.params.batchId;
    const status = await getSyncBatchStatus(req.user!.userId, batchId);
    sendSuccess(res, status);
  },
);
