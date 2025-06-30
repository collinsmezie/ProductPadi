import express from "express";
import {
  addFilesToFolderController,
  createFolderController,
  deleteFoldersController,
  duplicateFoldersController,
  getFilesInFolderController,
  getFoldersWithPaginationController,
} from "../controllers/folder.controller";
import {
  addFileToFolderSchema,
  createFolderSchema,
  deleteFolderByIdSchema,
  duplicateFoldersSchema,
  folderPaginationSchema,
  getFilesInFolderSchema,
} from "../schema/folder.schema";
import validator from "../middleware/validator.middleware";
import authMiddleware from "../middleware/auth.middleware";

const folderRouter = express.Router();

folderRouter.use(authMiddleware)

//* Get Folders
folderRouter.get("/", validator(folderPaginationSchema), getFoldersWithPaginationController);

//* Get files in a folder
folderRouter.get("/:id/files", validator(getFilesInFolderSchema, "params"), getFilesInFolderController);

//* Create a folder
folderRouter.post("/create", validator(createFolderSchema), createFolderController);

//* Add files to a folder
folderRouter.post("/add-files", validator(addFileToFolderSchema), addFilesToFolderController);

//* Duplicate a folder and its data 
folderRouter.post("/duplicate", validator(duplicateFoldersSchema), duplicateFoldersController);

//* Delete a folder and its data
folderRouter.delete("/", validator(deleteFolderByIdSchema), deleteFoldersController);

export default folderRouter;
