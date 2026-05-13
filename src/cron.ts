import cron from "node-cron";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";
import { prisma } from "./shared/utils/prisma";
import { generateAndSendReport } from "./modules/reports/reports.service";
import { logger } from "./shared/utils/logger";

/**
 * Runs on the 1st of every month at 08:00 AM.
 * Sends the previous month's profit report to every active user.
 */
export const startMonthlyReportCron = () => {
  cron.schedule("0 8 1 * *", async () => {
    logger.info("Monthly report cron started");

    const lastMonth = subMonths(new Date(), 1);
    const startDate = startOfMonth(lastMonth);
    const endDate = endOfMonth(lastMonth);

    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, phone: true },
    });

    for (const user of users) {
      try {
        await generateAndSendReport(user.id, startDate, endDate);
        logger.info(`Monthly report sent to user ${user.id} (${user.name})`);
      } catch (err) {
        logger.error(`Failed to send report to user ${user.id}: ${err}`);
      }
    }

    logger.info("Monthly report cron completed");
  });

  logger.info("Monthly report cron scheduled (1st of each month at 08:00)");
};
