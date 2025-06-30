import { Request, Response, NextFunction } from "express";
import {
  revokePrdShareService,
  sharePrdByEmailService,
  togglePrdPublicAccessService,
  updatePrdShareService,
} from "../../services/prd/share.prd.service";

export const sharePrdByEmailController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id!;

    const response = await sharePrdByEmailService(userId, req.body);

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const updatePrdShareController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id!
    const response = await updatePrdShareService(userId, req.body);

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const revokePrdShareController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!

    const response = await revokePrdShareService(userId, req.body)

    res.status(200).json(response);
  } catch (error) {
    next(error)
  }
}

export const togglePrdPublicAccessController = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id!

    const response = await togglePrdPublicAccessService(userId, req.body)

    res.status(200).json(response);
  } catch (error) {
    next(error)
  }
}