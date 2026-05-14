import { prisma } from "../../shared/utils/prisma";
import { SyncPayload } from "./sync.schema";

interface SyncMetadata {
  batchId: string;
  chunkNumber: number;
  totalChunks: number;
}

// Legacy: Keep for backward compatibility
export const syncRecords = async (userId: string, payload: SyncPayload) => {
  const results = { logs: 0, fuel: 0, incomes: 0, expenses: 0 };

  await prisma.$transaction(async (tx) => {
    // ── Logs ────────────────────────────────────────────────────────────────
    for (const l of payload.logs) {
      await tx.log.upsert({
        where: { id: l.id },
        create: {
          id: l.id,
          userId,
          vehicleId: l.vehicleId,
          date: new Date(l.date),
          recordType: l.recordType,
          value: l.value,
          synced: true,
        },
        update: { synced: true },
      });
      results.logs++;
    }

    // ── Fuel ─────────────────────────────────────────────────────────────────
    for (const f of payload.fuel) {
      await tx.fuelRecord.upsert({
        where: { id: f.id },
        create: {
          id: f.id,
          userId,
          date: new Date(f.date),
          kmAtFill: f.kmAtFill,
          gasKg: f.gasKg,
          costInr: f.costInr,
          photoUrl: f.photoUrl,
          synced: true,
        },
        update: { synced: true },
      });
      results.fuel++;
    }

    // ── Incomes ───────────────────────────────────────────────────────────────
    for (const i of payload.incomes) {
      await tx.income.upsert({
        where: { id: i.id },
        create: {
          id: i.id,
          userId,
          categoryId: i.categoryId,
          date: new Date(i.date),
          amount: i.amount,
          photoUrl: i.photoUrl,
          synced: true,
        },
        update: { synced: true },
      });
      results.incomes++;
    }

    // ── Expenses ──────────────────────────────────────────────────────────────
    for (const e of payload.expenses) {
      await tx.expense.upsert({
        where: { id: e.id },
        create: {
          id: e.id,
          userId,
          typeId: e.typeId,
          subTypeId: e.subTypeId,
          date: new Date(e.date),
          amount: e.amount,
          description: e.description,
          photoUrl: e.photoUrl,
          synced: true,
        },
        update: { synced: true },
      });
      results.expenses++;
    }
  });

  return results;
};

// NEW: Chunked sync with bulk insert for better performance
export const syncRecordsChunked = async (
  userId: string,
  payload: SyncPayload,
  metadata: SyncMetadata,
) => {
  const results = { logs: 0, fuel: 0, incomes: 0, expenses: 0 };

  // Idempotency check: Don't process if batch already completed
  const existingBatch = await prisma.syncBatch.findUnique({
    where: { batchId: metadata.batchId },
  });

  if (existingBatch?.status === "completed") {
    // Return previous counts to maintain idempotency
    return {
      logs: existingBatch.syncedRecords > 0 ? 1 : 0,
      fuel: 0,
      incomes: 0,
      expenses: 0,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // ── Bulk insert instead of loop (much faster!)
      if (payload.logs.length > 0) {
        await tx.log.createMany({
          data: payload.logs.map((l) => ({
            id: l.id,
            userId,
            vehicleId: l.vehicleId,
            date: new Date(l.date),
            recordType: l.recordType,
            value: l.value,
            synced: true,
          })),
          skipDuplicates: true,
        });
        results.logs = payload.logs.length;
      }

      if (payload.fuel.length > 0) {
        await tx.fuelRecord.createMany({
          data: payload.fuel.map((f) => ({
            id: f.id,
            userId,
            date: new Date(f.date),
            kmAtFill: f.kmAtFill,
            gasKg: f.gasKg,
            costInr: f.costInr,
            photoUrl: f.photoUrl,
            synced: true,
          })),
          skipDuplicates: true,
        });
        results.fuel = payload.fuel.length;
      }

      if (payload.incomes.length > 0) {
        await tx.income.createMany({
          data: payload.incomes.map((i) => ({
            id: i.id,
            userId,
            categoryId: i.categoryId,
            date: new Date(i.date),
            amount: i.amount,
            photoUrl: i.photoUrl,
            synced: true,
          })),
          skipDuplicates: true,
        });
        results.incomes = payload.incomes.length;
      }

      if (payload.expenses.length > 0) {
        await tx.expense.createMany({
          data: payload.expenses.map((e) => ({
            id: e.id,
            userId,
            typeId: e.typeId,
            subTypeId: e.subTypeId,
            date: new Date(e.date),
            amount: e.amount,
            description: e.description,
            photoUrl: e.photoUrl,
            synced: true,
          })),
          skipDuplicates: true,
        });
        results.expenses = payload.expenses.length;
      }

      // Create or update batch metadata
      const isFirstChunk = metadata.chunkNumber === 1;
      const isLastChunk = metadata.chunkNumber === metadata.totalChunks;

      if (isFirstChunk) {
        await tx.syncBatch.create({
          data: {
            batchId: metadata.batchId,
            userId,
            totalRecords: metadata.totalChunks * 500,
            status: "in_progress",
          },
        });
      }

      // Update progress
      const chunkSyncCount =
        results.logs + results.fuel + results.incomes + results.expenses;

      await tx.syncBatch.update({
        where: { batchId: metadata.batchId },
        data: {
          syncedRecords: {
            increment: chunkSyncCount,
          },
          status: isLastChunk ? "completed" : "in_progress",
          completedAt: isLastChunk ? new Date() : null,
        },
      });
    });

    console.log(
      `Synced chunk ${metadata.chunkNumber}/${metadata.totalChunks}:`,
      results,
    );
  } catch (error: any) {
    console.error("Sync chunk failed:", error);
    await prisma.syncBatch
      .update({
        where: { batchId: metadata.batchId },
        data: {
          status: "failed",
          failedRecords: {
            increment: 1,
          },
        },
      })
      .catch(() => {});
    throw error;
  }

  return results;
};

export const getSyncBatchStatus = async (userId: string, batchId: string) => {
  const batch = await prisma.syncBatch.findUnique({
    where: { batchId },
  });

  if (!batch || batch.userId !== userId) {
    throw new Error("Batch not found or unauthorized");
  }

  return {
    batchId: batch.batchId,
    status: batch.status,
    totalRecords: batch.totalRecords,
    syncedRecords: batch.syncedRecords,
    failedRecords: batch.failedRecords,
    completedAt: batch.completedAt,
  };
};
