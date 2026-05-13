import { prisma } from "../../shared/utils/prisma";
import { SyncPayload } from "./sync.schema";

export const syncRecords = async (userId: string, payload: SyncPayload) => {
  const results = { logs: 0, fuel: 0, incomes: 0, expenses: 0 };

  await prisma.$transaction(async (tx) => {
    // ── Logs ────────────────────────────────────────────────────────────────
    for (const l of payload.logs) {
      await tx.log.upsert({
        where: { id: l.id },
        create: { id: l.id, userId, vehicleId: l.vehicleId, date: new Date(l.date), recordType: l.recordType, value: l.value, synced: true },
        update: { synced: true },
      });
      results.logs++;
    }

    // ── Fuel ─────────────────────────────────────────────────────────────────
    for (const f of payload.fuel) {
      await tx.fuelRecord.upsert({
        where: { id: f.id },
        create: { id: f.id, userId, date: new Date(f.date), kmAtFill: f.kmAtFill, gasKg: f.gasKg, costInr: f.costInr, photoUrl: f.photoUrl, synced: true },
        update: { synced: true },
      });
      results.fuel++;
    }

    // ── Incomes ───────────────────────────────────────────────────────────────
    for (const i of payload.incomes) {
      await tx.income.upsert({
        where: { id: i.id },
        create: { id: i.id, userId, categoryId: i.categoryId, date: new Date(i.date), amount: i.amount, photoUrl: i.photoUrl, synced: true },
        update: { synced: true },
      });
      results.incomes++;
    }

    // ── Expenses ──────────────────────────────────────────────────────────────
    for (const e of payload.expenses) {
      await tx.expense.upsert({
        where: { id: e.id },
        create: { id: e.id, userId, typeId: e.typeId, subTypeId: e.subTypeId, date: new Date(e.date), amount: e.amount, description: e.description, photoUrl: e.photoUrl, synced: true },
        update: { synced: true },
      });
      results.expenses++;
    }
  });

  return results;
};
