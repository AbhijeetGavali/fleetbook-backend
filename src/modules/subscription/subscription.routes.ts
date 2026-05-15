import { Router } from "express";
import { authenticate, requireAdmin } from "../../shared/middleware/auth";
import * as subscriptionController from "./subscription.controller";

const router = Router();

router.use(authenticate);

router.get("/", subscriptionController.getStatus);
router.post("/create", subscriptionController.create);

router.get(
  "/admin/payments",
  requireAdmin,
  subscriptionController.getAdminPayments,
);

router.get(
  "/admin/metrics",
  requireAdmin,
  subscriptionController.getAdminDashboardMetrics,
);

export default router;
