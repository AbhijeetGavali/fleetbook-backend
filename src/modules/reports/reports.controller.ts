import { Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../shared/utils/asyncHandler";
import { sendSuccess } from "../../shared/utils/response";
import { AuthRequest } from "../../shared/types";
import * as service from "./reports.service";

const reportQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const templateSchema = z.object({
  name: z.string().min(1).max(100),
  template: z.string().min(1),
  engine: z.enum(["handlebars", "mustache"]).default("handlebars"),
  isDefault: z.boolean().optional(),
});

export const getFleetStats = asyncHandler(async (_req, res: Response) => {
  sendSuccess(res, await service.getFleetStats());
});

export const getFleetReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { startDate, endDate } = reportQuerySchema.parse(req.query);
  sendSuccess(res, await service.getFleetReport(
    new Date(startDate),
    new Date(endDate + "T23:59:59")
  ));
});

export const generateReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { startDate, endDate } = reportQuerySchema.parse(req.query);
  const userId = req.params.userId ?? req.user!.userId;

  const result = await service.generateAndSendReport(
    userId,
    new Date(startDate),
    new Date(endDate + "T23:59:59")
  );

  // Return PDF directly if requested
  if (req.query.download === "1") {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="report-${startDate}-${endDate}.pdf"`);
    return res.send(result.pdfBuffer);
  }

  sendSuccess(res, {
    totalRevenue: result.totalRevenue,
    totalExpense: result.totalExpense,
    totalFuel: result.totalFuel,
    totalProfit: result.totalProfit,
    message: "Report generated and sent",
  });
});

export const generateAdminConsolidatedReport = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { startDate, endDate } = reportQuerySchema.parse(req.query);
  const result = await service.generateAndSendAdminConsolidatedReport(
    req.user!.userId,
    new Date(startDate),
    new Date(endDate + "T23:59:59"),
  );

  sendSuccess(res, {
    ...result,
    message: "Admin consolidated report generated and sent",
  });
});

// ── Templates ─────────────────────────────────────────────────────────────────
export const getTemplates = asyncHandler(async (req: AuthRequest, res: Response) => {
  sendSuccess(res, await service.getTemplates(req.user!.userId));
});

export const createTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, template, engine, isDefault } = templateSchema.parse(req.body);
  sendSuccess(res, await service.createTemplate(req.user!.userId, name, template, engine), 201);
});

export const updateTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
  sendSuccess(res, await service.updateTemplate(req.params.id, templateSchema.partial().parse(req.body)));
});

export const deleteTemplate = asyncHandler(async (req: AuthRequest, res: Response) => {
  await service.deleteTemplate(req.params.id);
  sendSuccess(res, { message: "Template deleted" });
});
