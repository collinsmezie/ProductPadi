import { NextFunction, Request, Response } from "express";
import { deletePrdsService, getPrdsService } from "../../services/prd/index.prd.service";


export const getPrdsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id!
    const { page, size } = req.query;

    const prds = await getPrdsService(userId, page as string, size as string);

    res.status(200).json(prds);
  } catch (error) {
    next(error);
  }
};

export const deletePrdsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { ids } = req.body;

    const userId = req.user?.id!

    const deletedPrd = await deletePrdsService(ids, userId);

    res.status(200).json({ ...deletedPrd });
  } catch (error) {
    next(error);
  }
};
