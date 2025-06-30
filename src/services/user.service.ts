import prisma from "../models/prisma";
import { AppError, ErrorType } from "../types/errors.types";
import { createError } from "../utils/error.utils";
import { setRedisValue, getRedisValue, redisKeyExists } from '../utils/redis.utils';

export const getUserService = async (id: string) => {
  try {
    // Check if the user data is already cached in Redis
    const cacheKey = `user:${id}`;
    const cachedUser = await getRedisValue(cacheKey);

    if (cachedUser) {
      // If cached, parse the JSON string back to an object
      return JSON.parse(cachedUser);
    }

    // If not cached, fetch from the database
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        fullName: true,
        email: true
      }
    });

    if (!user) {
      throw createError(ErrorType.NOT_FOUND, "User does not exist", {
        context: "This user doesn't exist"
      });
    }

    // Cache the user data in Redis for future requests
    await setRedisValue(cacheKey, JSON.stringify(user), 21600); // Cache for 1 hour

    return user;
  } catch (error) {
    if (error instanceof AppError) throw error;

    throw createError(ErrorType.INTERNAL, "Internal Server Error", {
      originalError: error instanceof Error ? error.message : "Unknown error",
      context: "Couldn't find this user",
    });
  }
};