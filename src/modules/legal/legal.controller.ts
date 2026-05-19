import { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { verifyAndDeleteAccount } from "./legal.service";

const CONTACT = "contact.fleetbook@ideasprout.in";

const page = (title: string, body: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} – FleetBook</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
           background: #f5f5f5; color: #1a1a1a; min-height: 100vh;
           display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { background: #fff; border-radius: 12px; padding: 40px 36px;
            max-width: 440px; width: 100%; box-shadow: 0 2px 16px rgba(0,0,0,.08); }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
    .sub { font-size: 14px; color: #666; margin-bottom: 24px; line-height: 1.5; }
    .warning { background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px;
               padding: 14px 16px; font-size: 13px; color: #856404; margin-bottom: 24px; line-height: 1.5; }
    .warning strong { display: block; margin-bottom: 4px; }
    label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #333; }
    input { width: 100%; padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px;
            font-size: 15px; margin-bottom: 16px; outline: none; transition: border .2s; }
    input:focus { border-color: #e53935; }
    .confirm-row { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 24px; }
    .confirm-row input[type=checkbox] { width: auto; margin: 3px 0 0; flex-shrink: 0; }
    .confirm-row span { font-size: 13px; color: #555; line-height: 1.5; }
    button { width: 100%; padding: 12px; background: #e53935; color: #fff;
             border: none; border-radius: 8px; font-size: 15px; font-weight: 600;
             cursor: pointer; transition: background .2s; }
    button:hover { background: #c62828; }
    .contact { margin-top: 20px; font-size: 13px; color: #888; text-align: center; }
    .contact a { color: #e53935; text-decoration: none; }
    .icon { font-size: 40px; margin-bottom: 16px; }
    .success { color: #2e7d32; }
    .error-msg { background: #fdecea; border: 1px solid #f44336; border-radius: 8px;
                 padding: 12px 16px; font-size: 13px; color: #c62828; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="card">${body}</div>
</body>
</html>`;

const formHtml = (error?: string) => page(
  "Delete Account",
  `
  <div class="icon">⚠️</div>
  <h1>Delete Your Account</h1>
  <p class="sub">This page is provided in compliance with Google Play's data deletion policy.</p>

  <div class="warning">
    <strong>This action is permanent and cannot be undone.</strong>
    All your data — including logs, fuel records, income, expenses, vehicles, and subscription history — will be permanently deleted.
    If you have any questions before proceeding, please contact us at
    <a href="mailto:${CONTACT}" style="color:#856404">${CONTACT}</a>.
  </div>

  ${error ? `<div class="error-msg">${error}</div>` : ""}

  <form method="POST" action="/api/legal/delete-account">
    <label for="email">Email address</label>
    <input type="email" id="email" name="email" required placeholder="you@example.com" />

    <label for="password">Password</label>
    <input type="password" id="password" name="password" required placeholder="Your password" />

    <div class="confirm-row">
      <input type="checkbox" id="confirm" name="confirm" required />
      <span>I understand that all my data will be permanently deleted and this cannot be reversed.</span>
    </div>

    <button type="submit">Permanently Delete My Account</button>
  </form>

  <p class="contact">
    Changed your mind? Just close this page.<br/>
    Need help? <a href="mailto:${CONTACT}">${CONTACT}</a>
  </p>
`,
);

const successHtml = () => page(
  "Account Deleted",
  `
  <div class="icon">✅</div>
  <h1 class="success">Account Deleted</h1>
  <p class="sub">Your account and all associated data have been permanently deleted from FleetBook.</p>
  <p class="contact">
    If you have any questions, contact us at<br/>
    <a href="mailto:${CONTACT}">${CONTACT}</a>
  </p>
`,
);

export const showDeleteForm = (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/html");
  res.send(formHtml());
};

export const handleDeleteAccount = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.setHeader("Content-Type", "text/html");
      return res.status(400).send(formHtml("Email and password are required."));
    }

    try {
      await verifyAndDeleteAccount(email.trim().toLowerCase(), password);
      res.setHeader("Content-Type", "text/html");
      res.send(successHtml());
    } catch (err: any) {
      res.setHeader("Content-Type", "text/html");
      res.status(400).send(formHtml(err.message ?? "Something went wrong. Please try again."));
    }
  },
);
