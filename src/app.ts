import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";

import authRoutes from "./modules/auth/auth.routes";
import usersRoutes from "./modules/users/users.routes";
import vehiclesRoutes from "./modules/vehicles/vehicles.routes";
import categoriesRoutes from "./modules/categories/categories.routes";
import logsRoutes from "./modules/logs/logs.routes";
import reportsRoutes from "./modules/reports/reports.routes";
import syncRoutes from "./modules/sync/sync.routes";
import subscriptionRoutes from "./modules/subscription/subscription.routes";
import adminRoutes from "./modules/admin/admin.routes";
import { webhook as razorpayWebhook } from "./modules/subscription/subscription.controller";
import waWebhook from "./services/whatsapp/whatsapp.webhook";
import { errorHandler } from "./shared/middleware/errorHandler";

const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",")
      : ["https://api-fleetbook.ideasprout.in", "http://localhost:3000"],
    credentials: true,
  }),
);
app.use(compression());

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
  max: Number(process.env.RATE_LIMIT_MAX) || 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "Too many auth attempts, please try again later.",
  },
});

app.set("trust proxy", 1);
app.use(limiter);

// ── Webhook raw body for Razorpay verification ───────────────────────────────
app.post(
  "/api/webhook/razorpay",
  express.raw({ type: "application/json", limit: "10mb" }),
  (req, res, next) => {
    // placeholder route is handled by subscription webhook registration below
    next();
  },
);
// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() }),
);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/vehicles", vehiclesRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/logs", logsRoutes);

app.use("/api/subscription", subscriptionRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/admin", adminRoutes);

app.use("/api/webhook/razorpay", razorpayWebhook);
app.use("/api/webhook/whatsapp", waWebhook);

app.use("/api/sync", syncRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) =>
  res.status(404).json({ success: false, message: "Route not found" }),
);

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

export default app;
