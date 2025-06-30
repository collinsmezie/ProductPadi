import { Response } from "express";

// Set token to expire in 1 month (30 days)
const TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

export const setAuthCookies = (res: Response, accessToken: string): void => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    expires: new Date(Date.now() + TOKEN_MAX_AGE),
    path: "/",
    ...(process.env.NODE_ENV === "production" && { domain: ".productpadi.app" }),
  });
};

export const clearAuthCookies = (res: Response): void => {
  res.cookie("accessToken", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    expires: new Date(0),
    path: "/",
    ...(process.env.NODE_ENV === "production" && { domain: ".productpadi.app" }),
  });
};
