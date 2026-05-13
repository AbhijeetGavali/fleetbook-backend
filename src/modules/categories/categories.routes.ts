import { Router } from "express";
import { authenticate, requireAdmin } from "../../shared/middleware/auth";
import * as ctrl from "./categories.controller";

const router = Router();
router.use(authenticate);

router.get("/", ctrl.getAll);
router.get("/:id", ctrl.getById);
router.post("/", requireAdmin, ctrl.create);
router.patch("/:id", requireAdmin, ctrl.update);
router.delete("/:id", requireAdmin, ctrl.remove);

export default router;
