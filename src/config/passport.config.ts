import passport from "passport";
import {
  Strategy as GoogleStrategy,
  StrategyOptionsWithRequest as StrategyOptionsWithRequestForGoogle,
} from "passport-google-oauth20";
import prisma from "../models/prisma";
import { Request } from "express";
import { googleCallbackURL } from "./urls.config";

declare global {
  namespace Express {
    /**
     * This is the declared global type fo the request user object
     */
    interface User {
      id: string;
      email: string;
      fullName: string;
      image: string | null;
      password?: string | null;
      createdAt: Date;
      updatedAt: Date;
    }
  }
}

type VerifyFunctionWithRequestForGoogle = (
  req: Request,
  accessToken: string,
  refreshToken: string,
  profile: any,
  done: (error: any, user?: Express.User) => void
) => void;

interface GoogleProfile {
  emails: Array<{ value: string }>;
  displayName: string;
  photos: Array<{ value: string }>;
}



const googleStrategyOptions: StrategyOptionsWithRequestForGoogle = {
  clientID: process.env.AUTH_GOOGLE_ID!,
  clientSecret: process.env.AUTH_GOOGLE_SECRET!,
  callbackURL: googleCallbackURL,
  passReqToCallback: true,
};

const verifyFunctionGoogle: VerifyFunctionWithRequestForGoogle = async (
  req: Request,
  accessToken: string,
  refreshToken: string,
  profile: GoogleProfile,
  done: (error: any, user?: any) => void
) => {
  try {
    // Check if the user already exists in the database
    let existingUser = await prisma.user.findUnique({
      where: { email: profile.emails[0].value },
    });

    if (!existingUser) {
      // If not, create a new user
      existingUser = await prisma.user.create({
        data: {
          email: profile.emails[0].value,
          fullName: profile.displayName,
          image: profile.photos[0].value,
        },
      });
    }

    return done(null, existingUser);
  } catch (error) {
    return done(error);
  }
};

// interface StrategyOptionsWithRequestForLinkedin {
//   issuer: string;
//   authorizationURL: string;
//   tokenURL: string;
//   userInfoURL: string;
//   clientID: string;
//   clientSecret: string;
//   callbackURL: string;
//   scope: string[];
//   // passReqToCallback: true;
// }

// type VerifyFunctionWithRequestForLinkedin = (
//   issuer: string,
//   profile: Profile,
//   done: VerifyCallback
// ) => void;



// const linkedinStrategyOptions: StrategyOptionsWithRequestForLinkedin = {
//   issuer: "https://www.linkedin.com",
//   authorizationURL: "https://www.linkedin.com/oauth/v2/authorization",
//   tokenURL: "https://www.linkedin.com/oauth/v2/accessToken",
//   userInfoURL: "https://api.linkedin.com/v2/userinfo",
//   clientID: process.env.AUTH_LINKEDIN_ID!,
//   clientSecret: process.env.AUTH_LINKEDIN_SECRET!,
//   callbackURL: linkedinCallbackURL,
//   scope: ["openid", "profile", "email"],
//   // passReqToCallback: true,
// };

// const verifyFunctionLinkedin: VerifyFunctionWithRequestForLinkedin = async (
//   issuer: string,
//   profile: Profile,
//   done: VerifyCallback
// ) => {
//   try {
//     const email = profile.emails?.[0]?.value;
//     if (!email) {
//       return done(new Error("No email provided by LinkedIn"));
//     }
//     const existingUser = await prisma.user.findUnique({
//       where: { email }
//     });

//     if (existingUser) {
//       return done(null, existingUser as Express.User);
//     }

//     const fullName = [
//       profile.name?.givenName,
//       profile.name?.middleName,
//     ]
//       .filter(Boolean) // Remove undefined values
//       .join(" ");


//       const image = profile.photos?.[0]?.value || null;

//     const newUser = await prisma.user.create({
//       data: {
//         email,
//         fullName,
//         image
//       },
//     });

//     return done(null, newUser as Express.User);
//   } catch (error) {
//     console.error("LinkedIn verify error:", error);
//     return done(error as Error);
//   }
// };





// Initialize strategies
passport.use(new GoogleStrategy(googleStrategyOptions, verifyFunctionGoogle));


//* Discontinued the linkedin auth
// passport.use(
//   "linkedin",
//   new OpenIDConnectStrategy(
//     linkedinStrategyOptions,
//     verifyFunctionLinkedin
//   )
// );

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user || !user.id || !user.email) {
      return done(new Error("Invalid user object"));
    }

    done(null, user as Express.User);
  } catch (error) {
    done(error);
  }
});

export default passport;