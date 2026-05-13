import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth";
import { authorize } from "../../shared/middleware/authorize";
import * as subscriptionController from "./subscription.controller";

const router = Router();

router.get("/checkout", subscriptionController.checkout);
router.use(authenticate);

router.get("/", subscriptionController.getStatus);
router.post("/create", subscriptionController.create);
router.get("/payments", subscriptionController.getPayments);

// Admin-only routes
router.get(
  "/admin/drivers",
  authorize("ADMIN"),
  subscriptionController.getDriverSubscriptions,
);
router.get(
  "/admin/subscription",
  authorize("ADMIN"),
  subscriptionController.getAdminSubscription,
);
router.get(
  "/admin/payments",
  authorize("ADMIN"),
  subscriptionController.getAdminPayments,
);
router.get(
  "/admin/metrics",
  authorize("ADMIN"),
  subscriptionController.getAdminDashboardMetrics,
);

export default router;
