import { Router } from "express";
import { showDeleteForm, handleDeleteAccount } from "./legal.controller";

const router = Router();

router.get("/delete-account", showDeleteForm);
router.post("/delete-account", handleDeleteAccount);

export default router;
