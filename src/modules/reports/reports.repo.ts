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

export const getFleetStats = async () => {
  const [driverCount, vehicleCount, incomeSum, expenseSum, fuelSum] = await Promise.all([
    prisma.user.count({ where: { role: "DRIVER", isActive: true } }),
    prisma.vehicle.count(),
    prisma.income.aggregate({ _sum: { amount: true } }),
    prisma.expense.aggregate({ _sum: { amount: true } }),
    prisma.fuelRecord.aggregate({ _sum: { costInr: true } }),
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
export const getFleetReport = async (startDate: Date, endDate: Date) => {
  const drivers = await prisma.user.findMany({
    where: { role: "DRIVER", isActive: true },
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

// ── Report templates ──────────────────────────────────────────────────────────
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
  id: string,
  data: { name?: string; template?: string; engine?: string; isDefault?: boolean }
) => prisma.reportTemplate.update({ where: { id }, data });

export const deleteTemplate = (id: string) =>
  prisma.reportTemplate.delete({ where: { id } });


