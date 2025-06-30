// src/middleware/errorLogger.ts
import { Request, Response, NextFunction } from "express";
import logger from "../config/logger.config";

const errorLogger = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Log operational errors (4xx) as warnings
  if (err.status >= 400 && err.status < 500) {
    logger.warn("Client Error", {
      error: err.message,
      code: err.code,
      status: err.status,
      stack: err.stack,
      method: req.method,
      url: req.originalUrl,
      body: req.body,
      params: req.params,
      query: req.query,
      ip: req.ip,
      userId: req.user?.id, // If you have user authentication
    });
  }
  // Log programming/server errors (5xx) as errors
  else {
    logger.error("Server Error", {
      error: err.message,
      code: err.code,
      status: err.status || 500,
      stack: err.stack,
      method: req.method,
      url: req.originalUrl,
      body: req.body,
      params: req.params,
      query: req.query,
      ip: req.ip,
      userId: req.user?.id, // If you have user authentication
    });
  }

  // Pass the error to the next error handling middleware
  next(err);
};

export default errorLogger;
