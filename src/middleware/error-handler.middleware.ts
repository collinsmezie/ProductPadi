import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { AppError, ErrorType } from "../types/errors.types";

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const isDev = process.env.NODE_ENV === "development";

  if (err instanceof AppError) {
    const response = err.toResponse(isDev);
    res.status(err.code).json({
      ...response,
      ...(isDev && { stack: err.stack }),
    });
    return;
  }

  // Handle unknown errors
  const defaultError = {
    status: "Error" as const,
    message: "Internal Server Error",
    code: ErrorType.INTERNAL,
    ...(isDev && {
      details: err.message,
      stack: err.stack,
    }),
  };

  res.status(500).json(defaultError);
  return;
};
