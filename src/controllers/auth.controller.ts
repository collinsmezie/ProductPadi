import { NextFunction, Request, Response } from "express";
import { registerService, loginService } from "../services/auth.service";
import { generateAccessToken } from "../utils/auth/tokens";
import { clearAuthCookies, setAuthCookies } from "../utils/auth/cookies";
import { ErrorType } from "../types/errors.types";
import { createError } from "../utils/error.utils";

export const registerController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { fullName, email, password } = req.body;
  try {
    const { id, ...restOfUserObj }  = await registerService(fullName, email, password);

    // Generate tokens
    const accessToken = generateAccessToken({id, ...restOfUserObj});

    // Set new cookies
    setAuthCookies(res, accessToken);

    res.status(201).json({ message: "User created successfully",  ...restOfUserObj, });
  } catch (error) {
    next(error);
  }
};

export const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    const { id, ...restOfUserObj } = await loginService(email, password);

    // I'm clearing the refresh tokens and access tokens before sending another
    clearAuthCookies(res);

    // Generate tokens
    const accessToken = generateAccessToken({id, ...restOfUserObj});

    setAuthCookies(res, accessToken);

    res.status(200).json({
      message: "User successfully logged in",
      ...restOfUserObj,
    });
  } catch (error: any) {
    next(error);
  }
};


export const logoutController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Clear the session
    req.logout((err) => {
      if (err) {
        throw createError(ErrorType.INTERNAL, "Failed to clear session", {
          originalError: err instanceof Error ? err.message : "Unknown error",
          context: "Session logout",
        });
      }
    });

    // Clear cookies
    clearAuthCookies(res);

    res.status(200).json({ message: "Successfully logged out" });
  } catch (error) {
    next(error);
  }
};