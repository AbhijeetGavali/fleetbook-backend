import { prisma } from "../../shared/utils/prisma";

export const getReportData = async (userId: string, startDate: Date, endDate: Date) => {
  const [incomes, expenses, fuel] = await Promise.all([
    prisma.income.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
      include: { category: true },
      orderBy: { date: "asc" },
    }),
    prisma.expense.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
      include: { type: true, subType: true },
      orderBy: { date: "asc" },
    }),
    prisma.fuelRecord.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
      orderBy: { date: "asc" },
    }),
  ]);
  return { incomes, expenses, fuel };
};

export const getFleetStats = async (adminId: string) => {
  // Get driver IDs under this admin for scoped aggregations
  const adminDrivers = await prisma.user.findMany({
    where: { role: "DRIVER", assignedToAdmin: adminId },
    select: { id: true },
  });
  const driverIds = adminDrivers.map((d) => d.id);

  const [driverCount, vehicleCount, incomeSum, expenseSum, fuelSum] = await Promise.all([
    prisma.user.count({ where: { role: "DRIVER", isActive: true, assignedToAdmin: adminId } }),
    prisma.vehicle.count({ where: { assignedToAdmin: adminId } }),
    prisma.income.aggregate({ where: { userId: { in: driverIds } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { userId: { in: driverIds } }, _sum: { amount: true } }),
    prisma.fuelRecord.aggregate({ where: { userId: { in: driverIds } }, _sum: { costInr: true } }),
  ]);
  const totalIncome = incomeSum._sum.amount ?? 0;
  const totalExpense = (expenseSum._sum.amount ?? 0) + (fuelSum._sum.costInr ?? 0);
  return {
    totalDrivers: driverCount,
    totalVehicles: vehicleCount,
    totalIncome,
    totalExpense,
    netEarnings: totalIncome - totalExpense,
  };
};

/** Fleet report: all drivers, grouped by driver, for a date range */
export const getFleetReport = async (adminId: string, startDate: Date, endDate: Date) => {
  const drivers = await prisma.user.findMany({
    where: { role: "DRIVER", isActive: true, assignedToAdmin: adminId },
    select: { id: true, name: true, assignedVehicle: true },
    orderBy: { name: "asc" },
  });

  const results = await Promise.all(
    drivers.map(async (driver) => {
      const [incomeAgg, expenseAgg, fuelAgg] = await Promise.all([
        prisma.income.aggregate({
          where: { userId: driver.id, date: { gte: startDate, lte: endDate } },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: { userId: driver.id, date: { gte: startDate, lte: endDate } },
          _sum: { amount: true },
        }),
        prisma.fuelRecord.aggregate({
          where: { userId: driver.id, date: { gte: startDate, lte: endDate } },
          _sum: { costInr: true },
        }),
      ]);
      const totalIncome = incomeAgg._sum.amount ?? 0;
      const totalExpense = (expenseAgg._sum.amount ?? 0) + (fuelAgg._sum.costInr ?? 0);
      return {
        driverId: driver.id,
        driverName: driver.name,
        assignedVehicle: driver.assignedVehicle,
        totalIncome,
        totalExpense,
        netEarnings: totalIncome - totalExpense,
      };
    })
  );

  return results;
};

export const getAdminVehicleReport = async (
  adminId: string,
  startDate: Date,
  endDate: Date,
) => {
  const drivers = await prisma.user.findMany({
    where: {
      assignedToAdmin: adminId,
      role: "DRIVER",
    },
    select: {
      id: true,
      name: true,
      assignedVehicle: true,
      vehicle: {
        select: {
          regNo: true,
        },
      },
    },
  });

  const reportRows = await Promise.all(
    drivers.map(async (driver) => {
      const [incomeAgg, expenseAgg, fuelAgg] = await Promise.all([
        prisma.income.aggregate({
          where: { userId: driver.id, date: { gte: startDate, lte: endDate } },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: { userId: driver.id, date: { gte: startDate, lte: endDate } },
          _sum: { amount: true },
        }),
        prisma.fuelRecord.aggregate({
          where: { userId: driver.id, date: { gte: startDate, lte: endDate } },
          _sum: { costInr: true },
        }),
      ]);

      return {
        driverId: driver.id,
        driverName: driver.name,
        vehicleRegNo: driver.vehicle?.regNo ?? driver.assignedVehicle ?? "Unassigned",
        totalIncome: incomeAgg._sum.amount ?? 0,
        totalExpense: expenseAgg._sum.amount ?? 0,
        totalFuel: fuelAgg._sum.costInr ?? 0,
        netEarnings:
          (incomeAgg._sum.amount ?? 0) -
          ((expenseAgg._sum.amount ?? 0) + (fuelAgg._sum.costInr ?? 0)),
      };
    }),
  );

  return reportRows;
};

// ── Monthly report: per-day AND per-driver breakdown ─────────────────────────
export const getMonthlyReport = async (adminId: string, year: number, month: number) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const drivers = await prisma.user.findMany({
    where: { role: "DRIVER", assignedToAdmin: adminId },
    select: { id: true, name: true, assignedVehicle: true, vehicle: { select: { regNo: true } } },
    orderBy: { name: "asc" },
  });

  const driverIds = drivers.map((d) => d.id);

  const [incomes, expenses, fuel] = await Promise.all([
    prisma.income.findMany({
      where: { userId: { in: driverIds }, date: { gte: startDate, lte: endDate } },
      select: { userId: true, date: true, amount: true },
    }),
    prisma.expense.findMany({
      where: { userId: { in: driverIds }, date: { gte: startDate, lte: endDate } },
      select: { userId: true, date: true, amount: true },
    }),
    prisma.fuelRecord.findMany({
      where: { userId: { in: driverIds }, date: { gte: startDate, lte: endDate } },
      select: { userId: true, date: true, costInr: true },
    }),
  ]);

  // Per-day aggregation
  const byDay: Record<string, { income: number; expense: number }> = {};
  for (const r of incomes) {
    const d = r.date.toISOString().slice(0, 10);
    if (!byDay[d]) byDay[d] = { income: 0, expense: 0 };
    byDay[d].income += r.amount;
  }
  for (const r of expenses) {
    const d = r.date.toISOString().slice(0, 10);
    if (!byDay[d]) byDay[d] = { income: 0, expense: 0 };
    byDay[d].expense += r.amount;
  }
  for (const r of fuel) {
    const d = r.date.toISOString().slice(0, 10);
    if (!byDay[d]) byDay[d] = { income: 0, expense: 0 };
    byDay[d].expense += r.costInr ?? 0;
  }

  // Per-driver aggregation
  const byDriver: Record<string, { name: string; vehicleRegNo: string; income: number; expense: number }> = {};
  for (const driver of drivers) {
    byDriver[driver.id] = {
      name: driver.name,
      vehicleRegNo: driver.vehicle?.regNo ?? "—",
      income: 0,
      expense: 0,
    };
  }
  for (const r of incomes) {
    if (byDriver[r.userId]) byDriver[r.userId].income += r.amount;
  }
  for (const r of expenses) {
    if (byDriver[r.userId]) byDriver[r.userId].expense += r.amount;
  }
  for (const r of fuel) {
    if (byDriver[r.userId]) byDriver[r.userId].expense += r.costInr ?? 0;
  }

  const totalIncome = incomes.reduce((s, r) => s + r.amount, 0);
  const totalExpense =
    expenses.reduce((s, r) => s + r.amount, 0) +
    fuel.reduce((s, r) => s + (r.costInr ?? 0), 0);

  return {
    year,
    month,
    totalIncome,
    totalExpense,
    netEarnings: totalIncome - totalExpense,
    totalDrivers: drivers.length,
    byDay: Object.entries(byDay)
      .map(([date, v]) => ({ date, income: v.income, expense: v.expense, net: v.income - v.expense }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    byDriver: Object.entries(byDriver)
      .map(([id, v]) => ({ driverId: id, ...v, net: v.income - v.expense }))
      .sort((a, b) => b.income - a.income),
  };
};
export const getTemplates = (userId: string) =>
  prisma.reportTemplate.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });

export const getDefaultTemplate = (userId: string) =>
  prisma.reportTemplate.findFirst({ where: { userId, isDefault: true } });

export const createTemplate = (
  userId: string,
  name: string,
  template: string,
  engine: string
) => prisma.reportTemplate.create({ data: { userId, name, template, engine } });

export const updateTemplate = (
  adminId: string,
  id: string,
  data: { name?: string; template?: string; engine?: string; isDefault?: boolean }
) => prisma.reportTemplate.update({ where: { id }, data });

export const deleteTemplate = (adminId: string, id: string) =>
  prisma.reportTemplate.delete({ where: { id } });


