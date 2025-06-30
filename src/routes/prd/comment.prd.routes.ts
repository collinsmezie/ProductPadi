import express from "express";
import validator from "../../middleware/validator.middleware";
import {
  createCommentSchema,
  getAllCommentsForAprdFieldSchema,
  getAllCommentsForAPrdSchema
} from "../../schema/prd/comment.prd.schema";
import {
  createCommentController,
  getAllCommentsForAPrdFieldController,
  getAllCommentsForAPrdController,
} from "../../controllers/prd/comment.prd.controller";

const commentPrdRouter = express.Router();

commentPrdRouter.post("/", validator(createCommentSchema), createCommentController);

commentPrdRouter.get("/:id", validator(getAllCommentsForAPrdSchema, "params"), getAllCommentsForAPrdController);

commentPrdRouter.post("/get-prdField-comments", validator(getAllCommentsForAprdFieldSchema), getAllCommentsForAPrdFieldController);


export default commentPrdRouter;
