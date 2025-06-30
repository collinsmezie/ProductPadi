import { Request, Response, NextFunction } from "express";
import logger from "../config/logger.config";

const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startHrTime = process.hrtime();

  res.on("finish", () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedTimeInMs = elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6;

    logger.info("HTTP Request", {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      responseTime: elapsedTimeInMs.toFixed(3),
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
  });

  next();
};

export default requestLogger;
