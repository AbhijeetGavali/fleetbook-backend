import { AppError } from "../../shared/middleware/errorHandler";
import { logger } from "../../shared/utils/logger";
import Razorpay from "razorpay";
import dotenv from "dotenv";

dotenv.config();

export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_PLAN_MONTHLY_ID = process.env.RAZORPAY_PLAN_MONTHLY_ID;
const RAZORPAY_PLAN_ANNUAL_ID = process.env.RAZORPAY_PLAN_ANNUAL_ID;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  logger.warn(
    "Razorpay credentials are not configured. Subscription endpoints will fail.",
  );
}

export const getPlanId = (plan: "monthly" | "annual") => {
  if (plan === "monthly") return RAZORPAY_PLAN_MONTHLY_ID;
  return RAZORPAY_PLAN_ANNUAL_ID;
};

export const createOrFindCustomer = async (
  name: string,
  email: string,
  contact: string,
) => {
  if (!email && !contact) {
    throw new AppError("Customer email or contact is required", 400);
  }

  const rzp = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });

  const rzpCus = await (rzp.customers as any).create({
    name,
    email,
    contact,
    fail_existing: 0,
    notes: {
      type: "customer",
      app: "FleetBook",
      plan: "monthly",
      vendorId: "Abhijeet Gavali <FleetBook>",
    },
  });

  return rzpCus.id as string;
};

export const createRazorpaySubscription = async (
  customerId: string,
  plan: "monthly" | "annual",
  driverCount: number = 1,
) => {
  const rzp = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });

  const planId = getPlanId(plan);
  if (!planId) {
    throw new AppError(`Missing Razorpay plan configured for ${plan}`, 500);
  }

  if (driverCount < 1) {
    throw new AppError("Driver count must be at least 1", 400);
  }

  const rzpSub = await (rzp.subscriptions as any).create({
    plan_id: planId,
    customer_notify: 1,
    quantity: driverCount,
    total_count: 9999,
    start_at: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // Start after 30 days (trial period)
    notes: {
      app: "FleetBook",
      driverCount: driverCount.toString(),
      plan: plan,
      planId: planId,
      customerId: customerId,
      vendorId: "Abhijeet Gavali <FleetBook>",
    },
  });

  return rzpSub;
};

export const increaseRazorpaySubscriptionQuantity = async (
  razorpaySubscriptionId: string,
) => {
  const rzp = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });

  const rzpSub = await (rzp.subscriptions as any).fetch(razorpaySubscriptionId);
  if (!rzpSub) {
    throw new AppError("Razorpay subscription not found", 404);
  }

  await (rzp.subscriptions as any).update(razorpaySubscriptionId, {
    quantity: rzpSub.quantity + 1,
  });
};

export const verifyRazorpayWebhook = (
  rawBody: Buffer,
  signature: string | undefined,
) => {
  if (!RAZORPAY_WEBHOOK_SECRET) {
    throw new AppError("Razorpay webhook secret is not configured", 500);
  }
  if (!signature) {
    throw new AppError("Missing Razorpay webhook signature", 400);
  }
  const crypto = require("crypto");
  const expected = crypto
    .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  if (signature !== expected) {
    throw new AppError("Invalid Razorpay webhook signature", 400);
  }
};

export const parseRazorpayWebhook = (rawBody: Buffer) => {
  try {
    return JSON.parse(rawBody.toString("utf8"));
  } catch {
    throw new AppError("Unable to parse Razorpay webhook payload", 400);
  }
};
