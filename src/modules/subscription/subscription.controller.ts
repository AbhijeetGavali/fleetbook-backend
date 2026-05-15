import { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { sendSuccess } from "../../shared/utils/response";
import { AuthRequest } from "../../shared/types";
import { createSubscriptionSchema } from "./subscription.schema";
import * as subscriptionService from "./subscription.service";
import * as adminService from "./admin.service";
import {
  verifyRazorpayWebhook,
  parseRazorpayWebhook,
} from "../../services/razorpay/razorpay.service";

export const getStatus = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const status = await subscriptionService.getSubscription(req.user!.userId);
    sendSuccess(res, status);
  },
);

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const input = createSubscriptionSchema.parse(req.body);
  const result = await subscriptionService.createSubscription(
    req.user!.userId,
    input.plan,
  );
  sendSuccess(res, { ...result }, 201);
});

export const webhook = asyncHandler(async (req: Request, res: Response) => {
  const rawBody = req.body as Buffer;
  const signature = req.headers["x-razorpay-signature"] as string | undefined;
  verifyRazorpayWebhook(rawBody, signature);
  const event = parseRazorpayWebhook(rawBody);
  const eventName = event.event;
  const payload = event.payload;

  if (eventName === "payment.captured" && payload?.payment?.entity) {
    const payment = payload.payment.entity;
    const subscriptionId = payment.subscription_id;
    const userSubscription =
      await subscriptionService.getSubscriptionByRazorpayId(subscriptionId);
    if (userSubscription) {
      const payeeId = userSubscription.adminId;
      if (payeeId) {
        await subscriptionService.recordPayment(payeeId, {
          paymentId: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          paidAt: new Date(payment.created_at * 1000),
          quantity: payment.quantity,
        });
      }
    }
  }

  if (eventName === "subscription.charged" && payload?.subscription?.entity) {
    const subscription = payload.subscription.entity;
    await subscriptionService.updateSubscriptionStatus(
      subscription.id,
      subscription.status,
      subscription.current_end
        ? new Date(subscription.current_end * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // fallback to 30 days if current_end is not provided
    );
  }

  res.json({ success: true });
});

// ── Admin Controllers ─────────────────────────────────────────────────────────

export const getAdminPayments = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const payments = await adminService.getAdminPayments(req.user!.userId);
    sendSuccess(res, payments);
  },
);

export const getAdminDashboardMetrics = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const metrics = await adminService.getAdminDashboardMetrics(
      req.user!.userId,
    );
    sendSuccess(res, metrics);
  },
);
