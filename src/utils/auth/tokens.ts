import jwt from "jsonwebtoken";
import { createError } from "../error.utils";
import { ErrorType } from "../../types/errors.types";

interface UserEmailAndPasswordPayload {
  id: string;
  email: string;
}

export const generateAccessToken = (user: UserEmailAndPasswordPayload) => {
  const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
  if (!accessTokenSecret) {
    throw createError(ErrorType.INTERNAL, "Authentication failed", {
      context: "Couldn't generate the access token",
    });
  }

  if (!user || !user.id || !user.email) {
    throw createError(ErrorType.INTERNAL, "Authentication failed", {
      context: "Couldn't generate the access token",
    });
  }

  try {
    return jwt.sign({ id: user.id, email: user.email }, accessTokenSecret, { expiresIn: "30d" });
  } catch (error) {
    throw createError(ErrorType.INTERNAL, "Authentication failed", {
      originalError: error instanceof Error ? error.message : "Unknown error",
      context: "Couldn't generate the access token",
    });
  }
};

interface TokenPayload {
  id: string;
  email: string;
  exp?: number;
}

export const verifyToken = async (token: string, secret: string): Promise<TokenPayload> => {
  try {
    return jwt.verify(token, secret) as TokenPayload;
  } catch (error) {
    throw createError(ErrorType.INTERNAL, "Token Payload", {
      originalError: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
