import { Router } from "express";
import { authenticate } from "../../shared/middleware/auth";
import * as ctrl from "./logs.controller";

const router = Router();
router.use(authenticate);

router.get("/stats", ctrl.getStatsByDate);

router.get("/", ctrl.getLogs);
router.post("/", ctrl.createLog);
router.delete("/:id", ctrl.deleteLog);

router.get("/fuel", ctrl.getFuel);
router.post("/fuel", ctrl.createFuel);
router.delete("/fuel/:id", ctrl.deleteFuel);

router.get("/income", ctrl.getIncome);
router.post("/income", ctrl.createIncome);
router.delete("/income/:id", ctrl.deleteIncome);

router.get("/expense", ctrl.getExpense);
router.post("/expense", ctrl.createExpense);
router.delete("/expense/:id", ctrl.deleteExpense);

export default router;
