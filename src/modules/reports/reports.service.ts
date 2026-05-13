import { format } from "date-fns";
import { generateReportPdf, ReportData } from "../../services/pdf/pdf.service";
import {
  sendEmail,
  buildReportEmailHtml,
} from "../../services/email/email.service";
import { sendWhatsAppReport } from "../../services/whatsapp/whatsapp.service";
import {
  renderTemplate,
  DEFAULT_WA_TEMPLATE,
  TemplateEngine,
} from "../../services/template/template.engine";
import { prisma } from "../../shared/utils/prisma";
import * as repo from "./reports.repo";
import { logger } from "../../shared/utils/logger";
import { canSendWhatsApp } from "../subscription/subscription.service";

export const getFleetStats = () => repo.getFleetStats();

export const generateAndSendReport = async (
  userId: string,
  startDate: Date,
  endDate: Date,
) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const { incomes, expenses, fuel } = await repo.getReportData(
    userId,
    startDate,
    endDate,
  );

  const totalRevenue = incomes.reduce((s, i) => s + i.amount, 0);
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const totalFuel = fuel.reduce((s, f) => s + (f.costInr ?? 0), 0);
  const totalProfit = totalRevenue - totalExpense - totalFuel;

  const fromDate = format(startDate, "dd MMM yyyy");
  const toDate = format(endDate, "dd MMM yyyy");

  const reportData: ReportData = {
    userName: user.name,
    fromDate,
    toDate,
    totalRevenue,
    totalExpense,
    totalFuel,
    totalProfit,
    incomeRows: incomes.map((i) => ({
      date: format(i.date, "dd MMM yyyy"),
      category: i.category.name,
      amount: i.amount,
    })),
    expenseRows: expenses.map((e) => ({
      date: format(e.date, "dd MMM yyyy"),
      type: e.type.name,
      subType: e.subType.name,
      amount: e.amount,
    })),
    fuelRows: fuel.map((f) => ({
      date: format(f.date, "dd MMM yyyy"),
      costInr: f.costInr ?? 0,
      kmAtFill: f.kmAtFill ?? undefined,
    })),
  };

  const pdfBuffer = await generateReportPdf(reportData);
  const pdfFilename = `fleetbook-report-${format(startDate, "yyyy-MM")}.pdf`;

  // ── Template vars (shared by Handlebars/Mustache and WA) ──────────────────
  const templateVars = {
    user_name: user.name,
    from_date: fromDate,
    to_date: toDate,
    total_revenue: totalRevenue.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
    }),
    total_price: totalProfit.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
    }),
    total_expense: totalExpense.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
    }),
    total_fuel: totalFuel.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
  };

  // Load user's custom template if set, else use default
  const userTemplate = await repo.getDefaultTemplate(userId);
  const renderedBody = renderTemplate(
    userTemplate?.template ?? DEFAULT_WA_TEMPLATE,
    templateVars,
    (userTemplate?.engine ?? "handlebars") as TemplateEngine,
  );

  // ── Email ─────────────────────────────────────────────────────────────────
  if (user.email) {
    await sendEmail({
      to: user.email,
      subject: `FleetBook Monthly Report — ${fromDate} to ${toDate}`,
      html: buildReportEmailHtml({
        userName: user.name,
        fromDate,
        toDate,
        totalRevenue,
        totalProfit,
      }),
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });
  }

  // ── WhatsApp (template message with PDF header) ───────────────────────────
  const allowWhatsApp = await canSendWhatsApp(user.id);
  if (user.phone && allowWhatsApp) {
    try {
      await sendWhatsAppReport({
        toPhone: user.phone,
        userName: user.name,
        fromDate,
        toDate,
        totalRevenue,
        totalProfit,
        pdfBuffer,
        pdfFilename,
      });
    } catch (err) {
      logger.warn(`[WA] send failed for ${user.phone}: ${err}`);
    }
  } else if (user.phone) {
    logger.info(
      `Skipping WhatsApp report for user ${user.id} because subscription is not active or trialing.`,
    );
  }

  logger.info(
    `Report generated for user ${userId} | revenue=${totalRevenue} profit=${totalProfit}`,
  );
  logger.debug(`Rendered template:\n${renderedBody}`);

  return { totalRevenue, totalExpense, totalFuel, totalProfit, pdfBuffer };
};

const sendReportToUser = async (
  user: { id: string; name: string; email?: string | null; phone?: string | null },
  reportData: {
    totalRevenue: number;
    totalExpense: number;
    totalFuel: number;
    totalProfit: number;
    pdfBuffer: Buffer;
    pdfFilename: string;
    startDate: Date;
    endDate: Date;
  },
) => {
  const {
    totalRevenue,
    totalExpense,
    totalFuel,
    totalProfit,
    pdfBuffer,
    pdfFilename,
    startDate,
    endDate,
  } = reportData;

  const fromDate = format(startDate, "dd MMM yyyy");
  const toDate = format(endDate, "dd MMM yyyy");

  const templateVars = {
    user_name: user.name,
    from_date: fromDate,
    to_date: toDate,
    total_revenue: totalRevenue.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
    }),
    total_price: totalProfit.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
    }),
    total_expense: totalExpense.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
    }),
    total_fuel: totalFuel.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
  };

  const userTemplate = await repo.getDefaultTemplate(user.id);
  renderTemplate(
    userTemplate?.template ?? DEFAULT_WA_TEMPLATE,
    templateVars,
    (userTemplate?.engine ?? "handlebars") as TemplateEngine,
  );

  if (user.email) {
    await sendEmail({
      to: user.email,
      subject: `FleetBook Monthly Report — ${fromDate} to ${toDate}`,
      html: buildReportEmailHtml({
        userName: user.name,
        fromDate,
        toDate,
        totalRevenue,
        totalProfit,
      }),
      attachments: [
        {
          filename: pdfFilename,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });
  }

  const allowWhatsApp = await canSendWhatsApp(user.id);
  if (user.phone && allowWhatsApp) {
    try {
      await sendWhatsAppReport({
        toPhone: user.phone,
        userName: user.name,
        fromDate,
        toDate,
        totalRevenue,
        totalProfit,
        pdfBuffer,
        pdfFilename,
      });
    } catch (err) {
      logger.warn(`[WA] send failed for ${user.phone}: ${err}`);
    }
  }
};

export const getAdminVehicleReport = (
  adminId: string,
  startDate: Date,
  endDate: Date,
) => repo.getAdminVehicleReport(adminId, startDate, endDate);

export const generateAndSendAdminConsolidatedReport = async (
  adminId: string,
  startDate: Date,
  endDate: Date,
) => {
  const admin = await prisma.user.findUniqueOrThrow({ where: { id: adminId } });
  const subscription = await prisma.subscription.findUnique({ where: { adminId } });
  if (!subscription || !["active", "trial"].includes(subscription.status)) {
    throw new Error("Admin subscription must be active or on trial to send consolidated reports.");
  }

  const rows = await getAdminVehicleReport(adminId, startDate, endDate);
  const totalRevenue = rows.reduce((sum, row) => sum + row.totalIncome, 0);
  const totalExpense = rows.reduce((sum, row) => sum + row.totalExpense, 0);
  const totalFuel = rows.reduce((sum, row) => sum + row.totalFuel, 0);
  const totalProfit = rows.reduce((sum, row) => sum + row.netEarnings, 0);

  const reportData: ReportData = {
    userName: admin.name,
    fromDate: format(startDate, "dd MMM yyyy"),
    toDate: format(endDate, "dd MMM yyyy"),
    totalRevenue,
    totalExpense,
    totalFuel,
    totalProfit,
    incomeRows: rows.map((r) => ({
      date: r.vehicleRegNo,
      category: r.driverName,
      amount: r.totalIncome,
    })),
    expenseRows: rows.map((r) => ({
      date: r.vehicleRegNo,
      type: r.driverName,
      subType: "Expense",
      amount: r.totalExpense,
    })),
    fuelRows: rows.map((r) => ({
      date: r.vehicleRegNo,
      costInr: r.totalFuel,
      kmAtFill: undefined,
    })),
  };

  const pdfBuffer = await generateReportPdf(reportData);
  const pdfFilename = `fleetbook-admin-consolidated-${format(startDate, "yyyy-MM")}.pdf`;

  await sendReportToUser(admin, {
    totalRevenue,
    totalExpense,
    totalFuel,
    totalProfit,
    pdfBuffer,
    pdfFilename,
    startDate,
    endDate,
  });

  return { rows, totalRevenue, totalExpense, totalFuel, totalProfit };
};

// ── Fleet report (admin) ──────────────────────────────────────────────────────
export const getFleetReport = (startDate: Date, endDate: Date) =>
  repo.getFleetReport(startDate, endDate);

// ── Templates ─────────────────────────────────────────────────────────────────
export const getTemplates = (userId: string) => repo.getTemplates(userId);

export const createTemplate = (
  userId: string,
  name: string,
  template: string,
  engine: TemplateEngine = "handlebars",
) => repo.createTemplate(userId, name, template, engine);

export const updateTemplate = (
  id: string,
  data: {
    name?: string;
    template?: string;
    engine?: string;
    isDefault?: boolean;
  },
) => repo.updateTemplate(id, data);

export const deleteTemplate = (id: string) => repo.deleteTemplate(id);
