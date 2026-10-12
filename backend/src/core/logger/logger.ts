import pino from "pino";
import { config } from "../../config/env.js";

export const logger = pino({
  level: config.NODE_ENV === "development" ? "debug" : "info",
  transport:
    config.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            ignore: "pid,hostname",
            translateTime: "SYS:standard",
          },
        }
      : undefined,
  redact: {
    paths: [
      "password",
      "passwordHash",
      "token",
      "accessToken",
      "refreshToken",
      "headers.authorization",
      "headers.cookie",
      "creditCard",
      "bankAccount.accountNumber",
    ],
    censor: "[CONFIDENTIAL]",
  },
});
