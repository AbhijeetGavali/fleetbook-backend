import { Router, Request, Response } from "express";
import { logger } from "../../shared/utils/logger";

const router = Router();

// Meta webhook verification (GET)
router.get("/", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.WA_WEBHOOK_VERIFY_TOKEN) {
    logger.info("WhatsApp webhook verified");
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

// Incoming messages (POST) — extend here to handle replies
router.post("/", (req: Request, res: Response) => {
  logger.info("WhatsApp webhook event", { body: req.body });
  res.sendStatus(200);
});

export default router;
