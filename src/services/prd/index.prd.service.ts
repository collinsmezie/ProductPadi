import prisma from "../../models/prisma";
import { AppError, ErrorType } from "../../types/errors.types";
import { createError } from "../../utils/error.utils";
import { getRedisValue, setRedisValue, withRedis } from "../../utils/redis.utils";

// Cache expiration times (in seconds)

const CACHE_TTL = {
  PRD_LIST: 60 * 5, // 5 minutes
};

export const getPrdsService = async (
  userId: string,
  page: string,
  size: string
) => {
  try {
    const isPaginated = size && page;
    
    // Generate cache key based on parameters
    const cacheKey = `prds:${userId}:${isPaginated ? `page:${page}:size:${size}` : 'all'}`;
    
    // Try to get data from cache first
    const cachedData = await getRedisValue(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    
    // If not in cache, perform database query
    const prdSelectFields = {
      id: true,
      title: true,
      prdType: true,
      createdAt: true,
      isPublic: true,
      userId: true,
      shares: {
        select: {
          id: true,
          permission: true,
          sharedWithEmail: true,
          sharedWithId: true,
        },
        where: {
          sharedById: userId,
          isActive: true,
        },
      },
    };
    
    // Base query to find both owned and shared PRDs
    const whereCondition = {
      OR: [
        { userId }, // PRDs owned by user
        {
          shares: {
            some: {
              sharedById: userId,
              isActive: true,
            },
          },
        },
      ],
    };
    
    if (!isPaginated) {
      const prds = await prisma.pRD.findMany({
        where: whereCondition,
        orderBy: {
          createdAt: "desc",
        },
        select: prdSelectFields,
      });
      
      // Add an 'access' property to clarify the user's relationship to each PRD
      const prdsWithAccessInfo = prds.map((prd) => ({
        ...prd,
        access: prd.userId === userId ? "OWNER" : "SHARED",
        permission:
          prd.userId === userId
            ? "OWNER"
            : prd.shares.length > 0
            ? prd.shares[0].permission
            : "VIEW",
      }));
      
      // Cache the result
      await setRedisValue(cacheKey, JSON.stringify(prdsWithAccessInfo), CACHE_TTL.PRD_LIST);
      
      return prdsWithAccessInfo;
    }
    
    // Paginated query
    const pageValue = parseInt(page);
    const limitValue = parseInt(size);
    const skip = (pageValue - 1) * limitValue;
    
    // Count both owned and shared PRDs
    const totalCount = await prisma.pRD.count({
      where: whereCondition,
    });
    
    const prds = await prisma.pRD.findMany({
      where: whereCondition,
      skip,
      take: limitValue,
      orderBy: {
        createdAt: "desc",
      },
      select: prdSelectFields,
    });
    
    // Add access info
    const prdsWithAccessInfo = prds.map((prd) => ({
      ...prd,
      access: prd.userId === userId ? "OWNER" : "SHARED",
      permission:
        prd.userId === userId ? "OWNER" : prd.shares.length > 0 ? prd.shares[0].permission : "VIEW",
    }));
    
    const totalPages = Math.ceil(totalCount / limitValue);
    
    // Pagination details
    const paginationDetails = {
      currentPage: pageValue,
      totalPages,
      totalItems: totalCount,
      itemsPerPage: limitValue,
      hasNextPage: pageValue < totalPages,
      hasPreviousPage: pageValue > 1,
    };
    
    const result = {
      prds: prdsWithAccessInfo,
      pagination: paginationDetails,
    };
    
    // Cache the result
    await setRedisValue(cacheKey, JSON.stringify(result), CACHE_TTL.PRD_LIST);
    
    return result;
  } catch (error) {
    if (error instanceof AppError) throw error;
    
    throw createError(ErrorType.INTERNAL, "Internal Server Error", {
      originalError: error instanceof Error ? error.message : "Unknown error",
      context: "PRDs get failed",
    });
  }
};

export const deletePrdsService = async (ids: string[], userId: string) => {
  try {
    // Use deleteMany for batch deletion instead of mapping individual deletes
    const deleteResult = await prisma.pRD.deleteMany({
      where: {
        id: {
          in: ids,
        },
        userId,
      },
    });

    // Check if all requested PRDs were actually deleted
    if (deleteResult.count !== ids.length) {
      throw createError(ErrorType.NOT_FOUND, "Some PRDs could not be deleted", {
        context: "Not all PRDs were found",
        details: `Deleted ${deleteResult.count} out of ${ids.length} PRDs`,
      });
    }

    await invalidatePrdCache(userId)

    // Also remove these PRD IDs from any folders that reference them
    const foldersToUpdate = await prisma.folder.findMany({
      where: {
        prdIds: {
          hasSome: ids,
        },
      },
    });

    await Promise.all(
      foldersToUpdate.map((folder) => {
        return prisma.folder.update({
          where: { id: folder.id },
          data: {
            prdIds: folder.prdIds.filter((id) => !ids.includes(id)),
          },
        });
      })
    );

    return {
      success: true,
      deletedCount: deleteResult.count,
      message: "Deleted successfully",
    };
  } catch (error) {
    if (error instanceof AppError) throw error;

    throw createError(ErrorType.INTERNAL, "Failed to delete PRD documents", {
      originalError: error instanceof Error ? error.message : "Unknown error",
      context: "PRD batch delete failed",
    });
  }
};

export const invalidatePrdCache = async (userId: string) => {
  return withRedis(async (client) => {
    // Get all keys matching the pattern
    const keys = await client.keys(`prds:${userId}:*`);
    
    // Delete all matching keys
    if (keys.length > 0) {
      await client.del(keys);
    }
    
    return keys.length;
  });
};

