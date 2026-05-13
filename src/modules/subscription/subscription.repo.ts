import { prisma } from "../../shared/utils/prisma";

export const findByAdminId = (adminId: string) =>
  prisma.subscription.findUnique({ where: { adminId } });

export const findByUserId = (userId: string) =>
  prisma.subscription.findUnique({ where: { userId } });

export const findByRazorpayId = (razorpaySubscriptionId: string) =>
  prisma.subscription.findUnique({ where: { razorpaySubscriptionId } });

export const create = (data: {
  adminId?: string;
  userId?: string;
  plan: string;
  razorpaySubscriptionId: string;
  razorpayCustomerId?: string;
  status: string;
  trialEndsAt?: Date;
  nextBillingAt?: Date;
  activatedAt?: Date;
}) => prisma.subscription.create({ data });

export const update = (id: string, data: any) =>
  prisma.subscription.update({ where: { id }, data });

export const createPayment = (data: {
  subscriptionId: string;
  adminId?: string;
  userId?: string;
  razorpayPaymentId: string;
  amount: number;
  currency: string;
  status: string;
  paidAt: Date;
}) => prisma.subscriptionPayment.create({ data });

export const getPaymentsByAdmin = (adminId: string) =>
  prisma.subscriptionPayment.findMany({
    where: { adminId },
    orderBy: { paidAt: "desc" },
  });

export const getPaymentsByUser = (userId: string) =>
  prisma.subscriptionPayment.findMany({
    where: { userId },
    orderBy: { paidAt: "desc" },
  });
