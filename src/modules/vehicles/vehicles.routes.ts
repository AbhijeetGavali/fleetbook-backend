import { Router } from "express";
import { authenticate, requireAdmin } from "../../shared/middleware/auth";
import * as ctrl from "./vehicles.controller";

const router = Router();
router.use(authenticate);

router.get("/:id", ctrl.getById);
router.get("/", requireAdmin, ctrl.getAll);
router.post("/", requireAdmin, ctrl.create);
router.patch("/:id", requireAdmin, ctrl.update);
router.delete("/:id", requireAdmin, ctrl.remove);

export default router;
