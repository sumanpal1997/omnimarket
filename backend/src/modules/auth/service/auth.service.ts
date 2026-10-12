import crypto from "crypto";
import { userRepository, UserRepository, CreateUserDto } from "../../users/repository/user.repository.js";
import {
  refreshTokenRepository,
  RefreshTokenRepository,
} from "../repository/refresh-token.repository.js";
import { PasswordUtil } from "../../../core/utils/password.util.js";
import { JwtUtil, AccessTokenPayload } from "../../../core/utils/jwt.util.js";
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
} from "../../../core/errors/app-error.js";
import { RegisterInput, LoginInput } from "../validation/auth.validation.js";
import { IUser } from "../../users/model/user.model.js";
import { logger } from "../../../core/logger/logger.js";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
    isEmailVerified: boolean;
  };
  tokens: AuthTokens;
}

export class AuthService {
  constructor(
    private userRepo: UserRepository = userRepository,
    private tokenRepo: RefreshTokenRepository = refreshTokenRepository
  ) {}

  public async register(
    input: RegisterInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResult> {
    const existingUser = await this.userRepo.findByEmail(input.email);
    if (existingUser) {
      throw new ConflictError("An account with this email address already exists");
    }

    const passwordHash = await PasswordUtil.hash(input.password);

    const newUserDto: CreateUserDto = {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      role: input.role || "CUSTOMER",
    };

    const user = await this.userRepo.create(newUserDto);

    // Issue initial token family
    const tokens = await this.createTokenFamily(user, ipAddress, userAgent);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  public async login(
    input: LoginInput,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResult> {
    const user = await this.userRepo.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    if (user.status !== "ACTIVE") {
      throw new ForbiddenError("Your account has been suspended or deactivated");
    }

    const isPasswordValid = await PasswordUtil.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // Issue fresh token family upon login
    const tokens = await this.createTokenFamily(user, ipAddress, userAgent);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  public async refresh(
    rawRefreshToken: string | undefined,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResult> {
    if (!rawRefreshToken) {
      throw new UnauthorizedError("Refresh token missing");
    }

    const tokenHash = JwtUtil.hashToken(rawRefreshToken);
    const tokenRecord = await this.tokenRepo.findByTokenHash(tokenHash);

    if (!tokenRecord) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    // Reuse detection: If token was already revoked, someone is attempting a replay attack!
    if (tokenRecord.isRevoked) {
      logger.warn(
        { familyId: tokenRecord.familyId, userId: tokenRecord.userId },
        "🚨 Refresh token reuse detected! Revoking entire token family."
      );
      // Invalidate the entire token family immediately
      await this.tokenRepo.revokeFamily(tokenRecord.familyId);
      // Invalidate active JWTs by bumping tokenVersion
      await this.userRepo.incrementTokenVersion(tokenRecord.userId);
      throw new UnauthorizedError("Session compromised. All sessions revoked for security.", {
        code: "TOKEN_FAMILY_REVOKED",
      });
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedError("Refresh token has expired");
    }

    const user = await this.userRepo.findById(tokenRecord.userId);
    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedError("User account not found or suspended");
    }

    // Token Rotation: Revoke current token and issue successor in the same family
    await this.tokenRepo.revokeById(tokenRecord._id);

    const { token: newPlainToken, hash: newHash } = JwtUtil.generateRefreshToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.tokenRepo.create({
      userId: user._id,
      tokenHash: newHash,
      familyId: tokenRecord.familyId, // Retain family chain
      expiresAt,
      ipAddress,
      userAgent,
    });

    const accessTokenPayload: AccessTokenPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };

    const accessToken = JwtUtil.generateAccessToken(accessTokenPayload);

    return {
      user: this.sanitizeUser(user),
      tokens: {
        accessToken,
        refreshToken: newPlainToken,
      },
    };
  }

  public async logout(rawRefreshToken?: string): Promise<void> {
    if (rawRefreshToken) {
      const tokenHash = JwtUtil.hashToken(rawRefreshToken);
      const tokenRecord = await this.tokenRepo.findByTokenHash(tokenHash);
      if (tokenRecord) {
        await this.tokenRepo.revokeById(tokenRecord._id);
      }
    }
  }

  public async getCurrentUser(userId: string): Promise<ReturnType<AuthService["sanitizeUser"]>> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return this.sanitizeUser(user);
  }

  private async createTokenFamily(
    user: IUser,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthTokens> {
    const familyId = crypto.randomUUID();
    const { token: plainRefreshToken, hash: tokenHash } = JwtUtil.generateRefreshToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.tokenRepo.create({
      userId: user._id,
      tokenHash,
      familyId,
      expiresAt,
      ipAddress,
      userAgent,
    });

    const accessTokenPayload: AccessTokenPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };

    const accessToken = JwtUtil.generateAccessToken(accessTokenPayload);

    return {
      accessToken,
      refreshToken: plainRefreshToken,
    };
  }

  private sanitizeUser(user: IUser) {
    return {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
    };
  }
}

export const authService = new AuthService();
