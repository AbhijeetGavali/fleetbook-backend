import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth";
import { sync } from "./sync.controller";

const router = Router();
router.post("/", authenticate, sync);
export default router;
