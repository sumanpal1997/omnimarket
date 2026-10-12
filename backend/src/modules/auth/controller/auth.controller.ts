import { Request, Response, NextFunction, CookieOptions } from "express";
import { authService, AuthService } from "../service/auth.service.js";
import { ResponseUtil } from "../../../core/utils/response.util.js";
import { HttpStatus } from "../../../core/constants/http-status.js";
import { config } from "../../../config/env.js";

const REFRESH_COOKIE_NAME = "omni_refresh_token";

const getCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: config.NODE_ENV === "production",
  sameSite: config.NODE_ENV === "production" ? "strict" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
});

export class AuthController {
  constructor(private service: AuthService = authService) {}

  public register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      const result = await this.service.register(req.body, ip, userAgent);

      // Set HTTP-only refresh token cookie
      res.cookie(REFRESH_COOKIE_NAME, result.tokens.refreshToken, getCookieOptions());

      ResponseUtil.sendSuccess(
        res,
        {
          user: result.user,
          accessToken: result.tokens.accessToken,
        },
        "User account registered successfully",
        HttpStatus.CREATED
      );
    } catch (error) {
      next(error);
    }
  };

  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      const result = await this.service.login(req.body, ip, userAgent);

      // Set HTTP-only refresh token cookie
      res.cookie(REFRESH_COOKIE_NAME, result.tokens.refreshToken, getCookieOptions());

      ResponseUtil.sendSuccess(
        res,
        {
          user: result.user,
          accessToken: result.tokens.accessToken,
        },
        "Logged in successfully",
        HttpStatus.OK
      );
    } catch (error) {
      next(error);
    }
  };

  public refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = req.cookies[REFRESH_COOKIE_NAME];
      const ip = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];

      const result = await this.service.refresh(refreshToken, ip, userAgent);

      // Set rotated HTTP-only refresh token cookie
      res.cookie(REFRESH_COOKIE_NAME, result.tokens.refreshToken, getCookieOptions());

      ResponseUtil.sendSuccess(
        res,
        {
          user: result.user,
          accessToken: result.tokens.accessToken,
        },
        "Session refreshed successfully",
        HttpStatus.OK
      );
    } catch (error) {
      next(error);
    }
  };

  public logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const refreshToken = req.cookies[REFRESH_COOKIE_NAME];
      await this.service.logout(refreshToken);

      res.clearCookie(REFRESH_COOKIE_NAME, {
        httpOnly: true,
        secure: config.NODE_ENV === "production",
        sameSite: config.NODE_ENV === "production" ? "strict" : "lax",
        path: "/",
      });

      ResponseUtil.sendSuccess(res, null, "Logged out successfully", HttpStatus.OK);
    } catch (error) {
      next(error);
    }
  };

  public getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const user = await this.service.getCurrentUser(userId);

      ResponseUtil.sendSuccess(res, { user }, "User profile retrieved successfully");
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
