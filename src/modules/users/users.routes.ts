import { Router } from "express";
import { authenticate, requireAdmin } from "../../shared/middleware/auth";
import * as usersController from "./users.controller";

const router = Router();
router.get("/me", authenticate, usersController.getCurrent);
router.patch("/me", authenticate, usersController.updateCurrent);

router.use(authenticate, requireAdmin);
router.get("/", usersController.getAll);
router.get("/:id", usersController.getById);
router.post("/", usersController.create);
router.patch("/:id", usersController.update);
router.delete("/:id", usersController.remove);

export default router;
