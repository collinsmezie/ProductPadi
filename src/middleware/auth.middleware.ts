import { User } from "@prisma/client";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { verifyToken } from "../utils/auth/tokens";
import { createError } from "../utils/error.utils";
import { AppError, ErrorType } from "../types/errors.types";
import { clearAuthCookies } from "../utils/auth/cookies";

interface DecodedToken {
  id: string;
  email: string;
  exp?: number;
}

type UserContext = Omit<User, "password">;

const createUserContext = (decoded: DecodedToken): UserContext => ({
  id: decoded.id,
  email: decoded.email,
  fullName: "", // Required by User type
  image: null,
  createdAt: new Date(), // Required by User type
  updatedAt: new Date(), // Required by User type
});

export default async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const { accessToken } = req.cookies;

    if (!accessToken) {
      throw createError(ErrorType.UNAUTHORIZED, "Authentication required");
    }

    let decoded: DecodedToken;

    try {
      decoded = await verifyToken(accessToken, process.env.ACCESS_TOKEN_SECRET!);
      req.user = createUserContext(decoded);
      return next();
    } catch (error) {
      // Handle token verification errors
      clearAuthCookies(res);
      throw createError(ErrorType.UNAUTHORIZED, "Authentication required");
    }
  } catch (error) {
    clearAuthCookies(res);

    if (error instanceof AppError) {
      return next(error);
    }

    return next(
      createError(ErrorType.INTERNAL, "Internal Server Error", {
        originalError: error instanceof Error ? error.message : "Unknown error",
      })
    );
  }
}
