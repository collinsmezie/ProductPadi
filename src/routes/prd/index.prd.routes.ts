import { Router } from "express";
import authMiddleware from "../../middleware/auth.middleware";
import validator from "../../middleware/validator.middleware";

import { defaultPrdPaginationSchema, deletePrdsByIdSchema } from "../../schema/prd.schema";
import {
  deletePrdsController,
  getPrdsController,
} from "../../controllers/prd/index.prd.controller";

import defaultPrdRouter from "./default.prd.routes";
import sharePrdRouter from "./share.prd.routes";
import { togglePrdPublicAccessSchema } from "../../schema/prd/share.prd.schema";
import { togglePrdPublicAccessController } from "../../controllers/prd/share.prd.controller";
import commentPrdRouter from "./comment.prd.routes";

const prdRouter = Router();

// Routes requiring authentication
prdRouter.use(["/public", "/share", "/comments"], authMiddleware);

//* Getting prds data
prdRouter.get("/", authMiddleware, validator(defaultPrdPaginationSchema, "query"), getPrdsController);

//* Make a prd publicly accessible
prdRouter.post("/public", validator(togglePrdPublicAccessSchema), togglePrdPublicAccessController);

//* Delete prd route
prdRouter.delete("/", authMiddleware, validator(deletePrdsByIdSchema), deletePrdsController);

//* Sharing a PRD
prdRouter.use("/share", sharePrdRouter);

// * Comment routes
prdRouter.use("/comments", commentPrdRouter);

//* For the default template prd routes
prdRouter.use("/default", defaultPrdRouter);

export default prdRouter;