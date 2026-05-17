import { Router } from "express";
import { authenticate, requireAdmin } from "../../shared/middleware/auth";
import * as adminController from "./admin.controller";

const router = Router();
router.use(authenticate, requireAdmin);

router.get("/profile", adminController.getProfile);
router.patch("/profile", adminController.updateProfile);
router.get("/drivers/:driverId/logs", adminController.getDriverLogs);

export default router;
