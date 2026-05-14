import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth";
import { sync, syncStatus } from "./sync.controller";

const router = Router();
router.post("/", authenticate, sync);
router.get("/batch/:batchId", authenticate, syncStatus);

export default router;
