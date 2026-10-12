import { describe, it, expect, vi, beforeEach } from "vitest";
import { PasswordUtil } from "../../src/core/utils/password.util.js";
import { JwtUtil } from "../../src/core/utils/jwt.util.js";
import { AuthService } from "../../src/modules/auth/service/auth.service.js";
import { ConflictError, UnauthorizedError } from "../../src/core/errors/app-error.js";
import { Types } from "mongoose";

describe("Auth Domain Unit Tests", () => {
  describe("PasswordUtil", () => {
    it("should hash a password and correctly verify valid/invalid attempts", async () => {
      const password = "StrongPassword123!";
      const hash = await PasswordUtil.hash(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith("$2")).toBe(true);

      const isValid = await PasswordUtil.compare(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await PasswordUtil.compare("WrongPassword123!", hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe("JwtUtil", () => {
    it("should generate and verify access token payload", () => {
      const payload = {
        sub: new Types.ObjectId().toString(),
        email: "test@example.com",
        role: "CUSTOMER" as const,
        tokenVersion: 0,
      };

      const token = JwtUtil.generateAccessToken(payload);
      expect(token).toBeDefined();

      const decoded = JwtUtil.verifyAccessToken(token);
      expect(decoded.sub).toBe(payload.sub);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    it("should generate cryptographically unique refresh tokens and SHA-256 hashes", () => {
      const { token: t1, hash: h1 } = JwtUtil.generateRefreshToken();
      const { token: t2, hash: h2 } = JwtUtil.generateRefreshToken();

      expect(t1).not.toBe(t2);
      expect(h1).not.toBe(h2);
      expect(JwtUtil.hashToken(t1)).toBe(h1);
    });
  });

  describe("AuthService Logic", () => {
    const mockUserRepo = {
      create: vi.fn(),
      findByEmail: vi.fn(),
      findById: vi.fn(),
      incrementTokenVersion: vi.fn(),
      updatePassword: vi.fn(),
    };

    const mockTokenRepo = {
      create: vi.fn(),
      findByTokenHash: vi.fn(),
      revokeFamily: vi.fn(),
      revokeById: vi.fn(),
      revokeAllForUser: vi.fn(),
    };

    let authService: AuthService;

    beforeEach(() => {
      vi.clearAllMocks();
      authService = new AuthService(mockUserRepo as any, mockTokenRepo as any);
    });

    it("should throw ConflictError if registering with an existing email", async () => {
      mockUserRepo.findByEmail.mockResolvedValue({ id: "1", email: "existing@example.com" });

      await expect(
        authService.register({
          email: "existing@example.com",
          password: "StrongPassword1!",
          firstName: "John",
          lastName: "Doe",
        })
      ).rejects.toThrow(ConflictError);
    });

    it("should detect refresh token replay attack and revoke entire family", async () => {
      const compromisedHash = JwtUtil.hashToken("fake_token");

      mockTokenRepo.findByTokenHash.mockResolvedValue({
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(),
        tokenHash: compromisedHash,
        familyId: "family-uuid-123",
        isRevoked: true, // Already consumed!
        expiresAt: new Date(Date.now() + 100000),
      });

      await expect(authService.refresh("fake_token")).rejects.toThrow(UnauthorizedError);

      // Assert entire family was revoked for security
      expect(mockTokenRepo.revokeFamily).toHaveBeenCalledWith("family-uuid-123");
      expect(mockUserRepo.incrementTokenVersion).toHaveBeenCalled();
    });
  });
});
