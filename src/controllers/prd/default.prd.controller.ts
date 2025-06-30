import { NextFunction, Request, Response } from "express";
import { createError } from "../../utils/error.utils";
import { ErrorType } from "../../types/errors.types";
import path from "path";
import {
  downloadDefaultPrdFileAsPDFService,
  duplicateDefaultPrdsService,
  generateAndSaveDefaultPrdFromFileService,
  generateAndSaveDefaultPrdWithSurveyService,
  getDefaultPrdByIdService,
  updateDefaultPrdService,
} from "../../services/prd/default.prd.service";


export const getDefaultPrdByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id!

    const prd = await getDefaultPrdByIdService(id);

    res.status(200).json({ ...prd.data });
  } catch (error) {
    next(error);
  }
};

export const generateDefaultPrdWithSurveyController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const prompt = req.body;

    //! Uploading PRD file visual is discontinued
    // const uploadedFiles = req.files;

    // if (!Array.isArray(uploadedFiles) || uploadedFiles.length === 0) {
    //   throw createError(ErrorType.VALIDATION, "No files were uploaded");
    // }

    // const uploadedFile = uploadedFiles[0];

    // const { step8, ...filteredPrompt } = prompt;

    const result = await generateAndSaveDefaultPrdWithSurveyService(
      prompt,
      req.user?.id!
    );

    res.status(200).json(result.data);
  } catch (error) {
    next(error);
  }
};

export const generateDefaultPrdFromFileController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const file = req.file;
    const userId = req.user?.id!;

    if (file === undefined) throw createError(ErrorType.VALIDATION, "No file was added");

    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    // Throw error if either extension or mimetype is NOT valid
    if (!extname || !mimetype) {
      throw createError(
        ErrorType.VALIDATION,
        "Invalid file type. Only PDF, DOC, and DOCX files are allowed"
      );
    }

    const result = await generateAndSaveDefaultPrdFromFileService(file, userId);

    res.status(200).json({ ...result });
  } catch (error) {
    next(error);
  }
};

export const updateDefaultPrdController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id!
    const updateData = req.body;

    const updatedPrd = await updateDefaultPrdService(userId, id, updateData);

    res.status(200).json({ updatedPrd });
  } catch (error) {
    next(error);
  }
};

export const duplicateDefaultPrdsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { ids } = req.body;
    const userId = req.user?.id!

    const duplicatedPrds = await duplicateDefaultPrdsService(ids, userId);

    res.status(200).json({ ...duplicatedPrds });
  } catch (error) {
    next(error);
  }
};

export const downloadDefaultPrdFileAsPDFController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id: prdId } = req.params;
    const userId = req.user?.id!

    const _ = await downloadDefaultPrdFileAsPDFService(userId, prdId);
  } catch (error) {
    next(error);
  }
};

