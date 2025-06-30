import express from "express";
import {
  downloadPRDSchema,
  duplicatePrdsSchema,
  getPrdByIdSchema,
  updateDefaultPrdParamSchema,
} from "../../schema/prd.schema";
import { upload } from "../../config/multer.config";
import validator from "../../middleware/validator.middleware";
import {
  downloadDefaultPrdFileAsPDFController,
  duplicateDefaultPrdsController,
  generateDefaultPrdFromFileController,
  generateDefaultPrdWithSurveyController,
  getDefaultPrdByIdController,
  updateDefaultPrdController,
} from "../../controllers/prd/default.prd.controller";
import { updateDefaultPrdBodySchema } from "../../schema/prd/default/update.default.prd.schema";
import { generateDefaultPrdFromSurveyBodySchema } from "../../schema/prd/default/create-survey.default.prd.schema";
import publicAccessPrdMiddleware from "../../middleware/public-access-prd.middleware";
import authMiddleware from "../../middleware/auth.middleware";

const defaultPrdRouter = express.Router();

defaultPrdRouter.get(
  "/:id",
  validator(getPrdByIdSchema, "params"),
  publicAccessPrdMiddleware,
  getDefaultPrdByIdController
);

defaultPrdRouter.use(authMiddleware)

//* Downloading default prd template as pdf
defaultPrdRouter.get(
  "/:id/pdf",
  validator(downloadPRDSchema, "params"),
  downloadDefaultPrdFileAsPDFController
);

//* Generating default prd from survey data
defaultPrdRouter.post(
  "/generate/survey",
  upload.any(),
  validator(generateDefaultPrdFromSurveyBodySchema),
  generateDefaultPrdWithSurveyController
);

//* Generating default prd from file
defaultPrdRouter.post(
  "/generate/file",
  upload.single("file"),
  generateDefaultPrdFromFileController
);

//* Duplicating prds
defaultPrdRouter.post("/duplicate", validator(duplicatePrdsSchema), duplicateDefaultPrdsController);

defaultPrdRouter.put(
  "/:id",
  validator(updateDefaultPrdParamSchema, "params"),
  validator(updateDefaultPrdBodySchema),
  updateDefaultPrdController
);

export default defaultPrdRouter;
