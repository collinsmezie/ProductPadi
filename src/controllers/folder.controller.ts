import { NextFunction, Request, Response } from "express";
import {
  addFilesToFolderService,
  createFolderService,
  deleteFoldersService,
  duplicateFoldersService,
  getFilesInFolderService,
  getFoldersWithPaginationService,
} from "../services/folder.service";

export const createFolderController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description } = req.body;
    const userId = req.user?.id!

    const createdFolder = await createFolderService(name, description, userId);

    res.status(201).json({ createdFolder });
  } catch (error) {
    next(error);
  }
};

export const getFoldersWithPaginationController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id!
    const { page, size } = req.query;

    const folders = await getFoldersWithPaginationService(userId, page as string, size as string);

    res.status(200).json([...folders]);
  } catch (error) {
    next(error);
  }
};

export const getFilesInFolderController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id!
    const { id } = req.params;
    const fetchedFiles = await getFilesInFolderService(userId, id);

    res.status(200).json([...fetchedFiles]);
  } catch (error) {
    next(error);
  }
};

export const addFilesToFolderController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { folderId, prdIds } = req.body;
    const userId = req.user?.id!

    const uploadedFiles = await addFilesToFolderService(folderId, prdIds, userId!);

    res.status(201).json({ ...uploadedFiles });
  } catch (error) {
    next(error);
  }
};

export const duplicateFoldersController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { ids } = req.body;
    const userId = req.user?.id!

    const duplicatedFolders = await duplicateFoldersService(ids, userId);

    console.log(duplicatedFolders);

    res.status(200).json({ ...duplicatedFolders });
  } catch (error) {
    next(error);
  }
};

export const deleteFoldersController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { ids } = req.body;
    const userId = req.user?.id!

    const deletedFolders = await deleteFoldersService(ids, userId);

    res.status(200).json({ ...deletedFolders });
  } catch (error) {
    next(error);
  }
};
