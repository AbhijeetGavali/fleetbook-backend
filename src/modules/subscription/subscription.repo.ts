import { prisma } from "../../shared/utils/prisma";

export const findByAdminId = (adminId: string) =>
  prisma.subscription.findUnique({ where: { adminId } });

export const findByRazorpayId = (razorpaySubscriptionId: string) =>
  prisma.subscription.findUnique({ where: { razorpaySubscriptionId } });

export const create = (data: {
  adminId: string;
  plan: string;
  razorpaySubscriptionId: string;
  razorpayCustomerId: string;
  status: string;
  nextBillingAt: Date;
  activatedAt: Date;
}) => prisma.subscription.create({ data });

export const update = (
  id: string,
  data: {
    status: string;
    nextBillingAt: Date;
  },
) => prisma.subscription.update({ where: { id }, data });

export const createPayment = (data: {
  subscriptionId: string;
  adminId: string;
  razorpayPaymentId: string;
  userCount: number;
  amount: number;
  currency: string;
  status: string;
  paidAt: Date;
}) => prisma.subscriptionPayment.create({ data });
