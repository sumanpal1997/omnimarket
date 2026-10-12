import { Types } from "mongoose";
import { AuditLogModel, IAuditLog } from "../model/audit-log.model.js";
import { logger } from "../../../core/logger/logger.js";

export interface LogActionParams {
  actorId: string | Types.ObjectId;
  actorRole: "ADMIN" | "SELLER" | "SYSTEM";
  action: string;
  resource: string;
  resourceId: string | Types.ObjectId;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogService {
  public async record(params: LogActionParams): Promise<IAuditLog> {
    try {
      const entry = new AuditLogModel({
        ...params,
        actorId: new Types.ObjectId(params.actorId),
      });
      return await entry.save();
    } catch (error) {
      // Audit log failures should never crash the main operation, but must be logged with high severity
      logger.error({ error, params }, "Failed to write audit log entry");
      throw error;
    }
  }

  public async getHistoryForResource(
    resource: string,
    resourceId: string | Types.ObjectId
  ): Promise<IAuditLog[]> {
    return AuditLogModel.find({ resource, resourceId }).sort({ createdAt: -1 });
  }
}

export const auditLogService = new AuditLogService();
