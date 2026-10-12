import jwt, { SignOptions } from "jsonwebtoken";
import crypto from "crypto";
import { config } from "../../config/env.js";
import { UnauthorizedError } from "../errors/app-error.js";
import { UserRole } from "../../modules/users/model/user.model.js";

export interface AccessTokenPayload {
  sub: string; // User ID
  email: string;
  role: UserRole;
  tokenVersion: number;
}

export class JwtUtil {
  /**
   * Generates a signed, short-lived JWT Access Token
   */
  public static generateAccessToken(payload: AccessTokenPayload): string {
    const options: SignOptions = {
      expiresIn: config.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
      issuer: "omnimarket-api",
      audience: "omnimarket-client",
    };
    return jwt.sign(payload, config.JWT_ACCESS_SECRET, options);
  }

  /**
   * Verifies a JWT Access Token. Throws UnauthorizedError on invalid/expired token.
   */
  public static verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET, {
        issuer: "omnimarket-api",
        audience: "omnimarket-client",
      }) as AccessTokenPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError("Access token has expired", { code: "TOKEN_EXPIRED" });
      }
      throw new UnauthorizedError("Invalid access token", { code: "INVALID_TOKEN" });
    }
  }

  /**
   * Generates a high-entropy 256-bit cryptographically secure random refresh token
   * Returns both the plain token (to send to client) and its SHA-256 hash (to store in DB).
   */
  public static generateRefreshToken(): { token: string; hash: string } {
    const token = crypto.randomBytes(40).toString("hex");
    const hash = this.hashToken(token);
    return { token, hash };
  }

  /**
   * Hashes a token using SHA-256 before database storage to protect against DB dump compromises
   */
  public static hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }
}
