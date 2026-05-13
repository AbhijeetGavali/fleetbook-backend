import { prisma } from "../../shared/utils/prisma";
import { AppError } from "../../shared/middleware/errorHandler";

/**
 * Get subscription status for all drivers under an admin
 * Only shows drivers that are assigned to the admin (registered drivers)
 */
export const getDriverSubscriptions = async (adminId: string) => {
  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin) throw new AppError("Admin not found", 404);
  if (admin.role !== "ADMIN") throw new AppError("Unauthorized", 403);

  const drivers = await prisma.user.findMany({
    where: { assignedToAdmin: adminId, role: "DRIVER" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      assignedVehicle: true,
      createdAt: true,
      userSubscription: {
        select: {
          plan: true,
          status: true,
          trialEndsAt: true,
          nextBillingAt: true,
          activatedAt: true,
        },
      },
    },
  });

  // Map to show subscription status
  return drivers.map((driver) => ({
    id: driver.id,
    name: driver.name,
    email: driver.email,
    phone: driver.phone,
    assignedVehicle: driver.assignedVehicle,
    createdAt: driver.createdAt,
    subscription: driver.userSubscription || {
      plan: null,
      status: "none",
      trialEndsAt: null,
      nextBillingAt: null,
      activatedAt: null,
    },
  }));
};

/**
 * Get admin's subscription status
 */
export const getAdminSubscription = async (adminId: string) => {
  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin) throw new AppError("Admin not found", 404);
  if (admin.role !== "ADMIN") throw new AppError("Unauthorized", 403);

  const subscription = await prisma.subscription.findUnique({
    where: { adminId },
  });

  return (
    subscription || {
      plan: null,
      status: "none",
      trialEndsAt: null,
      nextBillingAt: null,
      activatedAt: null,
    }
  );
};

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

  const [totalDrivers, activeSubscriptions, trialSubscriptions] =
    await Promise.all([
      prisma.user.count({
        where: { assignedToAdmin: adminId, role: "DRIVER" },
      }),
      prisma.user.count({
        where: {
          assignedToAdmin: adminId,
          role: "DRIVER",
          userSubscription: { status: "active" },
        },
      }),
      prisma.user.count({
        where: {
          assignedToAdmin: adminId,
          role: "DRIVER",
          userSubscription: { status: "trial" },
        },
      }),
    ]);

  const assignedVehicleRows = await prisma.user.findMany({
    where: {
      assignedToAdmin: adminId,
      role: "DRIVER",
      assignedVehicle: { not: null },
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
    activeSubscriptions,
    trialSubscriptions,
    expiredSubscriptions:
      totalDrivers - activeSubscriptions - trialSubscriptions,
  };
};
