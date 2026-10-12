import mongoose from "mongoose";
import { config } from "./env.js";
import { logger } from "../core/logger/logger.js";

export class DatabaseManager {
  private static isConnected = false;

  public static async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info("Using existing MongoDB database connection");
      return;
    }

    try {
      mongoose.connection.on("connected", () => {
        logger.info("MongoDB connection established successfully");
        DatabaseManager.isConnected = true;
      });

      mongoose.connection.on("error", (err) => {
        logger.error({ err }, "MongoDB connection error encountered");
      });

      mongoose.connection.on("disconnected", () => {
        logger.warn("MongoDB connection disconnected");
        DatabaseManager.isConnected = false;
      });

      await mongoose.connect(config.MONGODB_URI, {
        maxPoolSize: 50, // Connection pool size for scalable concurrency
        minPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
    } catch (error) {
      logger.fatal({ error }, "Failed to connect to MongoDB at startup");
      throw error;
    }
  }

  public static async disconnect(): Promise<void> {
    if (!this.isConnected) return;
    try {
      await mongoose.connection.close();
      this.isConnected = false;
      logger.info("MongoDB connection cleanly closed");
    } catch (error) {
      logger.error({ error }, "Error closing MongoDB connection");
    }
  }

  public static checkHealth(): boolean {
    // 1 = connected
    return mongoose.connection.readyState === 1;
  }
}
