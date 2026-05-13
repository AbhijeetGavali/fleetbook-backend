import { addDays, isAfter } from "date-fns";
import { AppError } from "../../shared/middleware/errorHandler";
import {
  createOrFindCustomer,
  createRazorpaySubscription,
} from "../../services/razorpay/razorpay.service";
import { prisma } from "../../shared/utils/prisma";
import * as repo from "./subscription.repo";

export type SubscriptionState =
  | "none"
  | "trial"
  | "active"
  | "expired"
  | "cancelled";

export interface SubscriptionStatus {
  plan: "monthly" | "annual" | null;
  status: SubscriptionState;
  trialEndsAt?: Date | null;
  nextBillingAt?: Date | null;
  razorpaySubscriptionId?: string;
  activatedAt?: Date | null;
  expiresAt?: Date | null;
}

const TRIAL_DAYS = 30;

export const getSubscription = async (userId: string) => {
  const [user, subscription] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    repo.findByUserId(userId),
  ]);

  if (!user) throw new AppError("User not found", 404);

  let effectiveSubscription = subscription;

  // If user is a driver under an admin, check admin's subscription
  if (user.role === "DRIVER" && user.assignedToAdmin && !subscription) {
    const adminSub = await repo.findByAdminId(user.assignedToAdmin);
    effectiveSubscription = adminSub;
  }

  const trialEndFromSignup = addDays(user.createdAt, TRIAL_DAYS);
  if (!effectiveSubscription) {
    if (isAfter(trialEndFromSignup, new Date())) {
      return {
        plan: null,
        status: "trial" as const,
        trialEndsAt: trialEndFromSignup,
        nextBillingAt: trialEndFromSignup,
      };
    }
    return { plan: null, status: "none" as const };
  }

  const now = new Date();
  if (effectiveSubscription.status === "cancelled") {
    return { ...effectiveSubscription, status: "cancelled" as const };
  }

  if (
    effectiveSubscription.trialEndsAt &&
    isAfter(effectiveSubscription.trialEndsAt, now)
  ) {
    return {
      plan: effectiveSubscription.plan as "monthly" | "annual",
      status: "trial" as const,
      trialEndsAt: effectiveSubscription.trialEndsAt,
      nextBillingAt: effectiveSubscription.nextBillingAt,
      razorpaySubscriptionId: effectiveSubscription.razorpaySubscriptionId,
      activatedAt: effectiveSubscription.activatedAt,
    };
  }

  if (effectiveSubscription.status === "active") {
    return {
      plan: effectiveSubscription.plan as "monthly" | "annual",
      status: "active" as const,
      trialEndsAt: effectiveSubscription.trialEndsAt,
      nextBillingAt: effectiveSubscription.nextBillingAt,
      razorpaySubscriptionId: effectiveSubscription.razorpaySubscriptionId,
      activatedAt: effectiveSubscription.activatedAt,
    };
  }

  return {
    plan: effectiveSubscription.plan as "monthly" | "annual",
    status: "expired" as const,
    trialEndsAt: effectiveSubscription.trialEndsAt,
    nextBillingAt: effectiveSubscription.nextBillingAt,
    razorpaySubscriptionId: effectiveSubscription.razorpaySubscriptionId,
    activatedAt: effectiveSubscription.activatedAt,
  };
};

export const createSubscription = async (
  userId: string,
  plan: "monthly" | "annual",
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);
  if (user.role !== "ADMIN" && user.assignedToAdmin) {
    throw new AppError(
      "Drivers cannot create subscriptions. Contact your admin.",
      403,
    );
  }

  // Calculate vehicle count for admin subscriptions
  let vehicleCount = 1;
  if (user.role === "ADMIN") {
    const assignedDrivers = await prisma.user.findMany({
      where: {
        assignedToAdmin: userId,
        role: "DRIVER",
        assignedVehicle: { not: null },
      },
      select: { assignedVehicle: true },
    });
    const vehicles = new Set(
      assignedDrivers
        .filter((driver) => driver.assignedVehicle)
        .map((driver) => driver.assignedVehicle as string),
    ).size;
    vehicleCount = Math.max(1, vehicles);
  }

  const customerId = await createOrFindCustomer(
    user.name,
    user.email,
    user.phone ?? undefined,
  );
  const razorpaySubscription = await createRazorpaySubscription(
    customerId,
    plan,
    vehicleCount,
  );

  const trialEndsAt = razorpaySubscription.trial_end
    ? new Date(razorpaySubscription.trial_end * 1000)
    : addDays(new Date(), TRIAL_DAYS);
  const nextBillingAt = razorpaySubscription.current_end
    ? new Date(razorpaySubscription.current_end * 1000)
    : undefined;

  const existing =
    user.role === "ADMIN"
      ? await repo.findByAdminId(userId)
      : await repo.findByUserId(userId);

  if (existing) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        plan,
        razorpaySubscriptionId: razorpaySubscription.id,
        razorpayCustomerId: customerId,
        status: "trial",
        trialEndsAt,
        nextBillingAt,
      },
    });
  } else {
    await repo.create({
      adminId: user.role === "ADMIN" ? userId : undefined,
      userId: user.role === "DRIVER" ? userId : undefined,
      plan,
      razorpaySubscriptionId: razorpaySubscription.id,
      razorpayCustomerId: customerId,
      status: "trial",
      trialEndsAt,
      nextBillingAt,
    });
  }

  return {
    subscriptionId: razorpaySubscription.id,
    checkoutId: razorpaySubscription.id,
    customerId,
    plan,
    vehicleCount,
    totalAmount:
      razorpaySubscription.quantity * (plan === "monthly" ? 99 : 999),
    trialEndsAt,
    nextBillingAt,
  };
};

export const recordPayment = async (
  userId: string,
  subscriptionId: string,
  payment: {
    paymentId: string;
    amount: number;
    currency: string;
    status: string;
    paidAt: Date;
  },
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);

  const subscription =
    user.role === "ADMIN"
      ? await repo.findByAdminId(userId)
      : await repo.findByUserId(userId);

  if (!subscription) {
    throw new AppError("Subscription record not found for payment", 404);
  }

  await repo.createPayment({
    subscriptionId: subscription.id,
    adminId: user.role === "ADMIN" ? userId : undefined,
    userId: user.role === "DRIVER" ? userId : undefined,
    razorpayPaymentId: payment.paymentId,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    paidAt: payment.paidAt,
  });

  const updateData: any = { status: "active", activatedAt: payment.paidAt };
  if (subscription.trialEndsAt && payment.paidAt > subscription.trialEndsAt) {
    updateData.trialEndsAt = subscription.trialEndsAt;
  }
  if (subscription.nextBillingAt) {
    updateData.nextBillingAt = subscription.nextBillingAt;
  }
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: updateData,
  });
};

export const updateSubscriptionStatus = async (
  razorpaySubscriptionId: string,
  status: string,
  nextBillingAt?: Date,
) => {
  const subscription = await prisma.subscription.findUnique({
    where: { razorpaySubscriptionId },
  });
  if (!subscription) return null;

  return prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status,
      nextBillingAt,
    },
  });
};

export const getPayments = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);

  return user.role === "ADMIN"
    ? repo.getPaymentsByAdmin(userId)
    : repo.getPaymentsByUser(userId);
};

export const getSubscriptionByRazorpayId = async (
  razorpaySubscriptionId: string,
) => repo.findByRazorpayId(razorpaySubscriptionId);

export const ensureCloudSyncAllowed = async (userId: string) => {
  const sub = await getSubscription(userId);
  if (sub.status === "active" || sub.status === "trial") return;
  throw new AppError("Active subscription required for cloud sync", 402);
};

export const canSendWhatsApp = async (userId: string) => {
  const sub = await getSubscription(userId);
  return sub.status === "active" || sub.status === "trial";
};
