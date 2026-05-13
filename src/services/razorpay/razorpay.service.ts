import { AppError } from "../../shared/middleware/errorHandler";
import { logger } from "../../shared/utils/logger";

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";
const RAZORPAY_KEY_ID = process.env.RAZORPAY_API_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_API_KEY_SECRET;
const RAZORPAY_PLAN_MONTHLY_ID = process.env.RAZORPAY_PLAN_MONTHLY_ID;
const RAZORPAY_PLAN_ANNUAL_ID = process.env.RAZORPAY_PLAN_ANNUAL_ID;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  logger.warn(
    "Razorpay credentials are not configured. Subscription endpoints will fail.",
  );
}

const getAuthHeader = () => {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new AppError("Razorpay configuration missing", 500);
  }
  return `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64")}`;
};

const razorpayFetch = async <T>(path: string, options: RequestInit = {}) => {
  const res = await fetch(`${RAZORPAY_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const body = await res.text();
  let json: any;
  try {
    json = body ? JSON.parse(body) : {};
  } catch {
    throw new AppError("Invalid response from Razorpay", 502);
  }

  if (!res.ok) {
    const message =
      json?.error?.description ||
      json?.error?.reason ||
      json?.message ||
      "Razorpay request failed";
    throw new AppError(message, 502);
  }

  return json as T;
};

export const getPlanId = (plan: "monthly" | "annual") => {
  if (plan === "monthly") return RAZORPAY_PLAN_MONTHLY_ID;
  return RAZORPAY_PLAN_ANNUAL_ID;
};

export const createOrFindCustomer = async (
  name: string,
  email?: string,
  contact?: string,
) => {
  if (!email && !contact) {
    throw new AppError("Customer email or contact is required", 400);
  }

  const response = await razorpayFetch<any>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name,
      email,
      contact,
      fail_existing: 1,
      type: "customer",
      notes: { app: "FleetBook" },
    }),
  });

  return response.id as string;
};

export const createRazorpaySubscription = async (
  customerId: string,
  plan: "monthly" | "annual",
  driverCount: number = 1,
) => {
  const planId = getPlanId(plan);
  if (!planId) {
    throw new AppError(`Missing Razorpay plan configured for ${plan}`, 500);
  }

  if (driverCount < 1) {
    throw new AppError("Driver count must be at least 1", 400);
  }

  const response = await razorpayFetch<any>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: planId,
      customer_notify: 1,
      total_count: 9999,
      quantity: driverCount,
      trial_days: 30,
      notes: { app: "FleetBook", driverCount: driverCount.toString() },
    }),
  });

  return response as any;
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
