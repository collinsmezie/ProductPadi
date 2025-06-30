import { Router } from "express";
import authRouter from "./auth.routes";
import folderRoute from "./folder.routes";
import prdRouter from "./prd/index.prd.routes";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import userRouter from "./user.routes";

const routes = Router();

// Set up Swagger UI
const swaggerDocument = YAML.load(path.join(__dirname, "../../swagger.yaml"));
routes.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

//  API ROUTES
routes.use("/auth", authRouter);
routes.use("/user", userRouter)
routes.use("/prd", prdRouter);
routes.use("/folder", folderRoute);

export default routes;
