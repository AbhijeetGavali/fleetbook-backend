import { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { sendSuccess } from "../../shared/utils/response";
import { AuthRequest } from "../../shared/types";
import { AppError } from "../../shared/middleware/errorHandler";
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
  const host = `${req.protocol}://${req.get("host")}`;
  const checkoutUrl = `${host}/api/subscription/checkout?subscriptionId=${encodeURIComponent(result.subscriptionId)}`;
  sendSuccess(res, { ...result, checkoutUrl }, 201);
});

export const checkout = asyncHandler(async (req: Request, res: Response) => {
  const subscriptionId = String(req.query.subscriptionId || "");
  if (!subscriptionId) throw new AppError("Missing subscriptionId", 400);
  const razorpayKey = process.env.RAZORPAY_API_KEY_ID;
  if (!razorpayKey) throw new AppError("Razorpay key is not configured", 500);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>FleetBook Subscription</title>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<style>body{font-family:system-ui, sans-serif; padding:24px; background:#f6f7fb; color:#111;} .card{max-width:480px;margin:auto;padding:24px;background:#fff;border-radius:16px;box-shadow:0 18px 40px rgba(0,0,0,.08);} button{background:#1c7ed6;color:#fff;border:none;padding:14px 20px;border-radius:10px;font-size:16px;cursor:pointer;}</style>
</head>
<body>
<div class="card">
<h1>FleetBook Payment</h1>
<p>Your subscription checkout will open in a moment.</p>
<button id="rzp-button">Open Payment</button>
<p>If the checkout does not open automatically, tap the button above.</p>
</div>
<script>
const options = {
  key: "${razorpayKey}",
  subscription_id: "${subscriptionId}",
  handler: function(response){
    document.body.innerHTML = '<div class="card"><h1>Payment complete</h1><p>Thank you. You may close this window.</p></div>';
  },
  modal: {
    ondismiss: function(){ document.body.innerHTML = '<div class="card"><h1>Payment cancelled</h1><p>You can try again later.</p></div>'; }
  },
  theme: { color: "#1c7ed6" }
};
const rzp = new Razorpay(options);
const openCheckout = () => rzp.open();
document.getElementById("rzp-button").addEventListener("click", openCheckout);
setTimeout(openCheckout, 500);
</script>
</body>
</html>`;
  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

export const getPayments = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const payments = await subscriptionService.getPayments(req.user!.userId);
    sendSuccess(res, payments);
  },
);

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
      const payeeId = userSubscription.userId || userSubscription.adminId;
      if (payeeId) {
        await subscriptionService.recordPayment(payeeId, subscriptionId, {
          paymentId: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          paidAt: new Date(payment.created_at * 1000),
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
        : undefined,
    );
  }

  res.json({ success: true });
});

// ── Admin Controllers ─────────────────────────────────────────────────────────

export const getDriverSubscriptions = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const drivers = await adminService.getDriverSubscriptions(req.user!.userId);
    sendSuccess(res, drivers);
  },
);

export const getAdminSubscription = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    const subscription = await adminService.getAdminSubscription(
      req.user!.userId,
    );
    sendSuccess(res, subscription);
  },
);

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
