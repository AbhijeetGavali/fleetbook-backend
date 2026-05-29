import { addDays, isAfter } from "date-fns";
import { AppError } from "../../shared/middleware/errorHandler";
import {
  createOrFindCustomer,
  createRazorpaySubscription,
  increaseRazorpaySubscriptionQuantity,
  RAZORPAY_KEY_ID,
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
const PLAN_PRICES = { monthly: 99, annual: 999 } as const;
const CANCELLATION_INFO = "Cancel anytime by contacting contact@ideasprout.in. No charges apply during the free trial period.";

const trialTerms = (plan?: "monthly" | "annual" | null) => ({
  trialDays: TRIAL_DAYS,
  postTrialPrice: plan ? `₹${PLAN_PRICES[plan]}/${plan === "monthly" ? "month" : "year"}` : "₹99/month or ₹999/year",
  cancellationInfo: CANCELLATION_INFO,
});

export const getSubscription = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);
  
  const adminId = user.role === "ADMIN" ? user.id : user.assignedToAdmin;
  if (!adminId) throw new AppError("Admin not found", 404);

  const subscription = await repo.findByAdminId(adminId);

  const admin = user.role === "ADMIN" ? user : await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin) throw new AppError("Admin record not found", 404);

  const trialEndFromSignup = addDays(admin.createdAt, TRIAL_DAYS);
  if (!subscription) {
    if (isAfter(trialEndFromSignup, new Date())) {
      return {
        plan: null,
        status: "trial" as const,
        trialEndsAt: trialEndFromSignup,
        nextBillingAt: trialEndFromSignup,
        ...trialTerms(null),
      };
    }
    return { plan: null, status: "none" as const };
  }

  const now = new Date();
  if (subscription.status === "cancelled") {
    return { ...subscription, status: "cancelled" as const };
  }

  // If status is trial and trial is not yet over
  if (
    subscription.status === "trial" &&
    subscription.nextBillingAt &&
    isAfter(subscription.nextBillingAt, now)
  ) {
    return {
      plan: subscription.plan as "monthly" | "annual",
      status: "trial" as const,
      nextBillingAt: subscription.nextBillingAt,
      razorpaySubscriptionId: subscription.razorpaySubscriptionId,
      activatedAt: subscription.activatedAt,
      ...trialTerms(subscription.plan as "monthly" | "annual"),
    };
  }

  if (subscription.status === "active") {
    return {
      plan: subscription.plan as "monthly" | "annual",
      status: "active" as const,
      nextBillingAt: subscription.nextBillingAt,
      razorpaySubscriptionId: subscription.razorpaySubscriptionId,
      activatedAt: subscription.activatedAt,
    };
  }

  return {
    plan: subscription.plan as "monthly" | "annual",
    status: "expired" as const,
    nextBillingAt: subscription.nextBillingAt,
    razorpaySubscriptionId: subscription.razorpaySubscriptionId,
    activatedAt: subscription.activatedAt,
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
  if (user.role === "DRIVER") {
    throw new AppError(
      "Drivers cannot create subscriptions. Contact your admin.",
      403,
    );
  }

  const existing = await repo.findByAdminId(userId);
  // Gap: If already active and same plan, just return it.
  if (existing && existing.status === "active" && existing.plan === plan) {
    return {
      subscriptionId: existing.razorpaySubscriptionId,
      checkoutId: existing.razorpaySubscriptionId,
      api_key: RAZORPAY_KEY_ID,
      plan,
      status: existing.status,
    };
  }

  const customerId = await createOrFindCustomer(
    user.name,
    user.email,
    user.phone,
  );

  const driverCount = await prisma.user.count({
    where: { assignedToAdmin: userId, role: "DRIVER" }
  });

  const razorpaySubscription = await createRazorpaySubscription(
    customerId,
    plan,
    driverCount || 1,
  );

  const trialEndsAt = new Date(razorpaySubscription.start_at * 1000);

  const nextBillingAt = razorpaySubscription.current_end
    ? new Date(razorpaySubscription.current_end * 1000)
    : new Date(
        trialEndsAt.getTime() +
          (plan === "monthly" ? 30 : 365) * 24 * 60 * 60 * 1000,
      );

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
    api_key: RAZORPAY_KEY_ID,
    customerId,
    plan,
    totalAmount:
      razorpaySubscription.quantity * (plan === "monthly" ? 99 : 999),
    nextBillingAt,
    trialEndsAt,
    ...trialTerms(plan),
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

export const canAddUser = async (userId: string) => {
  const sub = await getSubscription(userId);
  if (sub.status === "active") return true;
  throw new AppError("Active subscription required to add new users", 402);
};
