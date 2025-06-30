import { AppError, ErrorType } from "../types/errors.types";

export const createError = (code: ErrorType, message: string, details?: unknown): AppError => {
  return new AppError(code, message, details);
};
