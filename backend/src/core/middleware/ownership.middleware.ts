import { Request, Response, NextFunction } from "express";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "../errors/app-error.js";
import { Types } from "mongoose";

export type OwnerIdResolver = (
  req: Request
) => Promise<string | Types.ObjectId | null | undefined>;

/**
 * Higher-order middleware enforcing resource ownership.
 * Admins automatically bypass ownership checks.
 * For other roles, req.user.id must match the resolved resource owner ID.
 */
export const requireOwnership = (resolveOwnerId: OwnerIdResolver) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        return next(new UnauthorizedError("Authentication required for this operation"));
      }

      // Administrators possess omniscient system override privileges
      if (req.user.role === "ADMIN") {
        return next();
      }

      const ownerId = await resolveOwnerId(req);
      if (ownerId === undefined || ownerId === null) {
        return next(new NotFoundError("Requested resource not found"));
      }

      const ownerIdString = ownerId.toString();
      if (ownerIdString !== req.user.id) {
        return next(
          new ForbiddenError("Access denied: You do not own this resource")
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
