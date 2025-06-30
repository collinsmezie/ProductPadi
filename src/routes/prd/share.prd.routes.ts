import express from "express";
import validator from "../../middleware/validator.middleware";
import {
  revokePrdShareSchema,
  sharePrdByEmailSchema,
  updatePrdShareSchema,
} from "../../schema/prd/share.prd.schema";
import {
  revokePrdShareController,
  sharePrdByEmailController,
  updatePrdShareController,
} from "../../controllers/prd/share.prd.controller";

const sharePrdRouter = express.Router();

sharePrdRouter.post("/", validator(sharePrdByEmailSchema), sharePrdByEmailController);

sharePrdRouter.put("/", validator(updatePrdShareSchema), updatePrdShareController);

sharePrdRouter.delete("/", validator(revokePrdShareSchema), revokePrdShareController);

export default sharePrdRouter;
