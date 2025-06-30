// publicAccessMiddleware.ts
import { Request, Response, NextFunction } from "express";
import { createError } from "../utils/error.utils";
import { ErrorType } from "../types/errors.types";
import prisma from "../models/prisma";
import authMiddleware from "./auth.middleware";

const publicAccessPrdMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prdId = req.params.id;

    if (!prdId) {
      return next(createError(ErrorType.VALIDATION, "PRD ID is required"));
    }

    // Check if the PRD exists and is public
    const prd = await prisma.pRD.findUnique({
      where: { id: prdId },
      select: { isPublic: true }
    });

    if (!prd) {
      return next(createError(ErrorType.NOT_FOUND, "PRD not found"));
    }

    // If the PRD is public, allow access
    if (prd.isPublic) {
      return next();
    }

    // Run auth middleware to attach authenticated user to the request
    await new Promise<void>((resolve, reject) => {
      authMiddleware(req, res, (err) => {
        if (err) reject(err);
        else resolve()
      });
    });

    // If not public, check if user is authenticated
    if (!req.user) {
      return next(createError(ErrorType.UNAUTHORIZED, "Authentications required"));
    }

    next()
  } catch (error) {
    next(error);
  }
};

export default publicAccessPrdMiddleware;