import nodemailer from "nodemailer";
import { logger } from "../../shared/utils/logger";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
}

export const sendEmail = async (opts: EmailOptions): Promise<void> => {
  await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME ?? "FleetBook"}" <${process.env.GMAIL_USER}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    attachments: opts.attachments,
  });
  logger.info(`Email sent to ${opts.to}`);
};

export const buildReportEmailHtml = (params: {
  userName: string;
  fromDate: string;
  toDate: string;
  totalRevenue: number;
  totalProfit: number;
}) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: Arial, sans-serif; color: #333; }
  .container { max-width: 600px; margin: 0 auto; padding: 24px; }
  .header { background: #1a73e8; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
  .body { background: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px; }
  .stat { background: white; border-radius: 8px; padding: 16px; margin: 12px 0; }
  .stat-label { color: #666; font-size: 13px; }
  .stat-value { font-size: 22px; font-weight: bold; color: #1a73e8; }
  .footer { text-align: center; color: #999; font-size: 12px; margin-top: 24px; }
</style></head>
<body>
<div class="container">
  <div class="header">
    <h2 style="margin:0">📊 Monthly Profit Report</h2>
    <p style="margin:4px 0 0">FleetBook</p>
  </div>
  <div class="body">
    <p>Hello <strong>${params.userName}</strong>,</p>
    <p>Your monthly profit report for the period <strong>${params.fromDate}</strong> to <strong>${params.toDate}</strong> is ready.</p>
    <div class="stat">
      <div class="stat-label">Total Revenue</div>
      <div class="stat-value">₹${params.totalRevenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Total Profit</div>
      <div class="stat-value">₹${params.totalProfit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
    </div>
    <p>Please find the detailed report attached.</p>
  </div>
  <div class="footer">FleetBook &bull; Automated Report</div>
</div>
</body>
</html>
`;
