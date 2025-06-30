import { Router } from "express";
import { getUserController } from "../controllers/user.controller";
import authMiddleware from "../middleware/auth.middleware";

const userRouter = Router();

userRouter.use(authMiddleware)

userRouter.get("/", getUserController)

export default userRouter;
