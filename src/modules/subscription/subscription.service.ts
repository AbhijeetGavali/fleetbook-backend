import { addDays, isAfter } from "date-fns";
import { AppError } from "../../shared/middleware/errorHandler";
import {
  createOrFindCustomer,
  createRazorpaySubscription,
  increaseRazorpaySubscriptionQuantity,
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
  const driver = await prisma.user.findUnique({ where: { id: userId } });
  if (!driver) throw new AppError("User not found", 404);

  const subscription = await repo.findByAdminId(driver?.assignedToAdmin);

  let effectiveSubscription = subscription;

  const trialEndFromSignup = addDays(driver.createdAt, TRIAL_DAYS);
  if (!effectiveSubscription) {
    if (isAfter(trialEndFromSignup, new Date())) {
      return {
        plan: null,
        status: "trial" as const,
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
    effectiveSubscription.nextBillingAt &&
    isAfter(effectiveSubscription.nextBillingAt, now)
  ) {
    return {
      plan: effectiveSubscription.plan as "monthly" | "annual",
      status: "trial" as const,
      nextBillingAt: effectiveSubscription.nextBillingAt,
      razorpaySubscriptionId: effectiveSubscription.razorpaySubscriptionId,
      activatedAt: effectiveSubscription.activatedAt,
    };
  }

  if (effectiveSubscription.status === "active") {
    return {
      plan: effectiveSubscription.plan as "monthly" | "annual",
      status: "active" as const,
      nextBillingAt: effectiveSubscription.nextBillingAt,
      razorpaySubscriptionId: effectiveSubscription.razorpaySubscriptionId,
      activatedAt: effectiveSubscription.activatedAt,
    };
  }

  return {
    plan: effectiveSubscription.plan as "monthly" | "annual",
    status: "expired" as const,
    nextBillingAt: effectiveSubscription.nextBillingAt,
    razorpaySubscriptionId: effectiveSubscription.razorpaySubscriptionId,
    activatedAt: effectiveSubscription.activatedAt,
  };
};

export const getSubscriptionByRazorpayId = async (
  razorpaySubscriptionId: string,
) => repo.findByRazorpayId(razorpaySubscriptionId);

export const createSubscription = async (
  userId: string,
  plan: "monthly" | "annual",
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);
  if (user.role !== "ADMIN" && user.assignedToAdmin !== user.id) {
    throw new AppError(
      "Drivers cannot create subscriptions. Contact your admin.",
      403,
    );
  }

  const customerId = await createOrFindCustomer(
    user.name,
    user.email,
    user.phone,
  );

  const razorpaySubscription = await createRazorpaySubscription(
    customerId,
    plan,
  );

  const trialEndsAt = razorpaySubscription.start_at;
  const nextBillingAt = razorpaySubscription.current_end
    ? new Date(razorpaySubscription.current_end * 1000)
    : new Date(
        trialEndsAt.getTime() +
          (plan === "monthly" ? 30 : 365) * 24 * 60 * 60 * 1000,
      );

  const existing = await repo.findByAdminId(userId);

  if (existing) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data: {
        plan,
        razorpaySubscriptionId: razorpaySubscription.id,
        razorpayCustomerId: customerId,
        status: "trial",
        nextBillingAt,
        activatedAt: new Date(),
      },
    });
  } else {
    await repo.create({
      adminId: userId,
      plan,
      razorpaySubscriptionId: razorpaySubscription.id,
      razorpayCustomerId: customerId,
      status: "trial",
      nextBillingAt,
      activatedAt: new Date(),
    });
  }

  return {
    subscriptionId: razorpaySubscription.id,
    checkoutId: razorpaySubscription.id,
    customerId,
    plan,
    totalAmount:
      razorpaySubscription.quantity * (plan === "monthly" ? 99 : 999),
    nextBillingAt,
    trialEndsAt,
  };
};

export const updateSubscriptionAddQuantity = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);
  if (user.role !== "ADMIN" && user.assignedToAdmin !== user.id) {
    throw new AppError(
      "Drivers cannot update subscriptions. Contact your admin.",
      403,
    );
  }

  const existing = await repo.findByAdminId(userId);
  if (!existing)
    throw new AppError("Subscription record not found for user", 404);

  await increaseRazorpaySubscriptionQuantity(existing.razorpaySubscriptionId);
};

export const updateSubscriptionStatus = async (
  razorpaySubscriptionId: string,
  status: string,
  nextBillingAt: Date,
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

export const recordPayment = async (
  userId: string,
  payment: {
    paymentId: string;
    amount: number;
    currency: string;
    status: string;
    paidAt: Date;
    quantity: number;
  },
) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);

  const subscription = await repo.findByAdminId(userId);

  if (!subscription) {
    throw new AppError("Subscription record not found for payment", 404);
  }

  await repo.createPayment({
    subscriptionId: subscription.id,
    adminId: userId,
    razorpayPaymentId: payment.paymentId,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    paidAt: payment.paidAt,
    userCount: payment.quantity || 1,
  });

  const updateData: any = { status: "active", activatedAt: payment.paidAt };

  if (subscription.nextBillingAt) {
    updateData.nextBillingAt = subscription.nextBillingAt;
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: updateData,
  });
};

export const isSubscriptionActive = async (userId: string) => {
  const sub = await getSubscription(userId);
  if (sub.status === "active" || sub.status === "trial") return true;
  throw new AppError("Active subscription required", 402);
};
