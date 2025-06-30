import express, { Request, Response } from "express";
import { logoutController, registerController } from "../controllers/auth.controller";
import { loginController } from "../controllers/auth.controller";
import validator from "../middleware/validator.middleware";
import { loginSchema, userRegisterSchema } from "../schema/auth.schema";
import passport from "../config/passport.config";
import { generateAccessToken } from "../utils/auth/tokens";
import { setAuthCookies } from "../utils/auth/cookies";
import { createError } from "../utils/error.utils";
import { ErrorType } from "../types/errors.types";
import { frontendURL } from "../config/urls.config";
import prisma from "../models/prisma";

const authRouter = express.Router();

authRouter.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
authRouter.get(
  "/google/callback",
  passport.authenticate("google"),
  async (req: Request, res: Response) => {
    try {
      const user = req.user;

      const accessToken = generateAccessToken(user!);

      //* Send refresh token and access token as an HTTP-only cookie
      setAuthCookies(res, accessToken);

      const userPrd = await prisma.user.findUnique({
        where: { id: user?.id },
        include: { PRD: true },
      });

      if (userPrd?.PRD) {
        res.redirect(`${frontendURL}/prd`);
      } else {
        res.redirect(`${frontendURL}/prd/generate`);
      }
    } catch (error) {
      console.log(error);
      throw createError(ErrorType.INTERNAL, "Failed to authenticate user with google", {
        originalError: error instanceof Error ? error.message : "Unknown error",
        context: "Passport google auth",
      });
    }
  }
);

authRouter.post("/register", [validator(userRegisterSchema)], registerController);
authRouter.post("/login", [validator(loginSchema)], loginController);

authRouter.post("/logout", logoutController);

authRouter.get("/test", (req, res) => {
  res.send('<h1>Home Page</h1><br><a href="/auth/google">Login with Google</a><br>');
});

//*Discontinued the Linkedin auth with passport
// authRouter.get(
//   "/linkedin",
//   passport.authenticate("linkedin")
// );

// authRouter.get(
//   "/linkedin/callback",
//   passport.authenticate(
//     "linkedin",
//     { failureRedirect: `${frontendURL}/login`, failureMessage: true }),
//     async (req: Request, res: Response) => {
//       try {
//         const user = req.user;

//         const accessToken = generateAccessToken(user);
//         const refreshToken = generateRefreshToken(user);

//         // Send refresh token and access token as an HTTP-only cookie
//         setAuthCookies(res, accessToken, refreshToken);

//         res.redirect(`${frontendURL}/dashboard`)
//       } catch (error) {
//        console.log(error)
//        throw createError(ErrorType.INTERNAL, "Failed to authenticate user with linkedin", {
//          originalError: error instanceof Error ? error.message : "Unknown error",
//          context: "Passport linkedin auth"
//        })
//     }}
// );

export default authRouter;
