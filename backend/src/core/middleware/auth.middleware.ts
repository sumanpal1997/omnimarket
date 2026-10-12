import { Request, Response, NextFunction } from "express";
import { JwtUtil } from "../utils/jwt.util.js";
import { UnauthorizedError, ForbiddenError } from "../errors/app-error.js";
import { userRepository } from "../../modules/users/repository/user.repository.js";
import { UserRole } from "../../modules/users/model/user.model.js";

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Authentication token is required");
    }

    const token = authHeader.split(" ")[1];
    const payload = JwtUtil.verifyAccessToken(token);

    // Verify token version against user database to enforce immediate global revocations
    const user = await userRepository.findById(payload.sub);
    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedError("User session is inactive or revoked");
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedError("Session has been invalidated. Please log in again.");
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const payload = JwtUtil.verifyAccessToken(token);
      const user = await userRepository.findById(payload.sub);
      if (user && user.status === "ACTIVE" && user.tokenVersion === payload.tokenVersion) {
        req.user = {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
        };
      }
    }
  } catch {
    // Gracefully ignore token errors for optional authentication
  }
  next();
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError("Authentication required"));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError("Access forbidden: Insufficient permissions for this resource")
      );
    }

    next();
  };
};
