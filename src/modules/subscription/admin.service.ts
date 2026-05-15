import { prisma } from "../../shared/utils/prisma";
import { AppError } from "../../shared/middleware/errorHandler";

/**
 * Get all payments made by admin
 */
export const getAdminPayments = async (adminId: string) => {
  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin) throw new AppError("Admin not found", 404);
  if (admin.role !== "ADMIN") throw new AppError("Unauthorized", 403);

  return prisma.subscriptionPayment.findMany({
    where: { adminId },
    orderBy: { paidAt: "desc" },
    select: {
      id: true,
      amount: true,
      currency: true,
      status: true,
      paidAt: true,
      subscription: {
        select: {
          plan: true,
          status: true,
        },
      },
    },
  });
};

/**
 * Count total drivers under admin and their subscription status summary
 */
export const getAdminDashboardMetrics = async (adminId: string) => {
  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin) throw new AppError("Admin not found", 404);
  if (admin.role !== "ADMIN") throw new AppError("Unauthorized", 403);

  const totalDrivers = await prisma.user.count({
    where: { assignedToAdmin: adminId },
  });

  const assignedVehicleRows = await prisma.user.findMany({
    where: {
      assignedToAdmin: adminId,
    },
    select: { assignedVehicle: true },
  });

  const totalVehicles = new Set(
    assignedVehicleRows
      .filter((driver) => driver.assignedVehicle)
      .map((driver) => driver.assignedVehicle as string),
  ).size;

  return {
    totalDrivers,
    totalVehicles,
  };
};
