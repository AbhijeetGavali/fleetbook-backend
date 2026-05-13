import app from "./app";
import { startMonthlyReportCron } from "./cron";
import { logger } from "./shared/utils/logger";
import { prisma } from "./shared/utils/prisma";

const PORT = Number(process.env.PORT) || 3000;

const start = async () => {
  try {
    await prisma.$connect();
    logger.info("Database connected");

    startMonthlyReportCron();

    app.listen(PORT, () => {
      logger.info(`FleetBook API running on port ${PORT} [${process.env.NODE_ENV ?? "development"}]`);
    });
  } catch (err) {
    logger.error("Failed to start server", err);
    process.exit(1);
  }
};

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

start();
