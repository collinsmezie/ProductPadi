import prisma from "../models/prisma";
import { AppError, ErrorType } from "../types/errors.types";
import { comparePassword, handleHashedPassword } from "../utils/auth/bcrypt";
import { createError } from "../utils/error.utils";

export const registerService = async (fullName: string, email: string, password: string) => {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw createError(ErrorType.CONFLICT, "User already exists");
    }

    // Hash the password
    const hashedPassword = await handleHashedPassword(password);

    // Create a new user
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
      },
    });

    return newUser;
  } catch (error) {
    if (error instanceof AppError) throw error;

    throw createError(ErrorType.INTERNAL, "Internal Server Error", {
      originalError: error instanceof Error ? error.message : "Unknown error",
      context: "Couldn't create new user",
    });
  }
};

export const loginService = async (email: string, password: string) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        password: true,
      },
    });

    if (!user || !user.password) {
      throw createError(ErrorType.NOT_FOUND, "Invalid email or password");
    }

    const isMatch = await comparePassword(password, user.password);

    if (!isMatch) {
      throw createError(ErrorType.VALIDATION, "Invalid email or password");
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;

    throw createError(ErrorType.INTERNAL, "Internal Server error", {
      originalError: error instanceof Error ? error.message : "Unknown error",
      context: "Couldn't login the user",
    });
  }
};
