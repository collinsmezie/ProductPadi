import { Request, Response, NextFunction } from "express";
import {
  createCommentService,
  getAllCommentsForAPrdFieldService,
  getAllCommentsForAPrdService
} from "../../services/prd/comment.prd.service";

export const createCommentController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id!;
    const { prdId, fieldType, fieldId, content } = req.body;

    const response = await createCommentService(userId, prdId, fieldType, fieldId, content);

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};


export const getAllCommentsForAPrdFieldController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { prdId, fieldType, fieldId } = req.body;

    const response = await getAllCommentsForAPrdFieldService(prdId, fieldType, fieldId);

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getAllCommentsForAPrdController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { prdId } = req.params;

    const groupedComments = await getAllCommentsForAPrdService(prdId);

    res.status(200).json({
      data: groupedComments,
    });
  } catch (error) {
    next(error);
  }
};