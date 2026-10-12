import http from "http";
import { createApp } from "./app.js";
import { config } from "./config/env.js";
import { DatabaseManager } from "./config/database.js";
import { logger } from "./core/logger/logger.js";

const startServer = async () => {
  try {
    // 1. Initialize Database Connection
    await DatabaseManager.connect();

    // 2. Instantiate Express App
    const app = createApp();
    const server = http.createServer(app);

    // 3. Start Listening
    server.listen(config.PORT, () => {
      logger.info(
        {
          port: config.PORT,
          env: config.NODE_ENV,
          apiPrefix: config.API_PREFIX,
        },
        `🚀 OmniMarket Backend Server running at http://localhost:${config.PORT}`
      );
    });

    // 4. Graceful Shutdown Management
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info("HTTP server closed to new connections");
        await DatabaseManager.disconnect();
        logger.info("Process terminating cleanly");
        process.exit(0);
      });

      // Force shutdown after 10 seconds if hanging
      setTimeout(() => {
        logger.error("Forcefully shutting down due to timeout");
        process.exit(1);
      }, 10000).unref();
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    process.on("unhandledRejection", (reason: unknown) => {
      logger.fatal({ reason }, "Unhandled Promise Rejection detected");
    });

    process.on("uncaughtException", (error: Error) => {
      logger.fatal({ error }, "Uncaught Exception thrown. Shutting down...");
      process.exit(1);
    });
  } catch (error) {
    logger.fatal({ error }, "Failed to start server");
    process.exit(1);
  }
};

startServer();
