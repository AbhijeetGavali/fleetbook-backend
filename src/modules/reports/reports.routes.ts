import { Router } from "express";
import { authenticate, requireAdmin } from "../../shared/middleware/auth";
import * as ctrl from "./reports.controller";

const router = Router();
router.use(authenticate);

// Fleet-wide stats (admin only)
router.get("/stats", requireAdmin, ctrl.getFleetStats);
// Fleet report grouped by driver (admin only)
router.get("/fleet", requireAdmin, ctrl.getFleetReport);
// Admin consolidated report by vehicle/driver (admin only)
router.get("/fleet/consolidated", requireAdmin, ctrl.generateAdminConsolidatedReport);

// Generate report for current user or specific user (admin)
router.get("/generate", ctrl.generateReport);
router.get("/generate/:userId", requireAdmin, ctrl.generateReport);

// Report templates (per-user customization)
router.get("/templates", ctrl.getTemplates);
router.post("/templates", ctrl.createTemplate);
router.patch("/templates/:id", ctrl.updateTemplate);
router.delete("/templates/:id", ctrl.deleteTemplate);

export default router;
