import prisma from "../models/prisma";
import { AppError, ErrorType } from "../types/errors.types";
import { createError } from "../utils/error.utils";
import { getRedisValue, setRedisValue, withRedis } from "../utils/redis.utils";
import { invalidatePrdCache } from "./prd/index.prd.service";

// Cache expiration times (in seconds)
const CACHE_TTL = {
  FOLDER_LIST: 60 * 5, // 5 minutes
  FOLDER_FILES: 60 * 3, // 3 minutes
};

export const createFolderService = async (name: string, description: string, userId: string) => {
  try {
    const doesFolderNameExist = await prisma.folder.findUnique({
      where: {
        userId_name: {
          userId: userId,
          name: name,
        },
      },
    });

    if (doesFolderNameExist) {
      throw createError(ErrorType.CONFLICT, "Folder name has already been used", {
        context: "This user has already used this folder name",
      });
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        description,
        userId,
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    await invalidateFolderCache(userId);

    return folder;
  } catch (error) {
    if (error instanceof AppError) throw error;

    throw createError(ErrorType.INTERNAL, "Internal server error", {
      originalError: error instanceof Error ? error.message : "Unknown error",
      context: "Creating folder",
    });
  }
};

export const getFilesInFolderService = async (userId: string, folderId: string) => {
  try {
    // Generate cache key
    const cacheKey = `folder:${userId}:${folderId}:files`;

    // Try to get data from cache first
    const cachedData = await getRedisValue(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    // If not in cache, perform database query
    const files = await prisma.folder.findUnique({
      where: { userId, id: folderId },
      select: {
        prds: {
          select: {
            id: true,
            title: true,
            createdAt: true,
          },
        },
      },
    });

    const result = files?.prds ?? [];

    // Cache the result
    await setRedisValue(cacheKey, JSON.stringify(result), CACHE_TTL.FOLDER_FILES);

    return result;
  } catch (error) {
    console.log(error);
    if (error instanceof AppError) throw error;

    throw createError(ErrorType.INTERNAL, "Internal server error", {
      originalError: error instanceof Error ? error.message : "Unknown error",
      context: "Getting files in folder",
    });
  }
};

export const getFoldersWithPaginationService = async (
  userId: string,
  page: string,
  size: string
) => {
  try {
    const isPaginated = size && page;

    // Generate cache key based on parameters
    const cacheKey = `folders:${userId}:${isPaginated ? `page:${page}:size:${size}` : "all"}`;

    // Try to get data from cache first
    const cachedData = await getRedisValue(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }

    // If not in cache, perform database query
    const foldersSelectFields = {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      prdIds: true, // Include PRD IDs
    };

    if (!isPaginated) {
      const folders = await prisma.folder.findMany({
        where: { userId },
        orderBy: {
          createdAt: "desc",
        },
        select: foldersSelectFields,
      });

      const result = folders.map((folder) => ({
        id: folder.id,
        name: folder.name,
        description: folder.description,
        createdAt: folder.createdAt,
        totalFiles: folder.prdIds.length,
      }));

      // Cache the result
      await setRedisValue(cacheKey, JSON.stringify(result), CACHE_TTL.FOLDER_LIST);

      return result;
    }

    const pageValue = parseInt(page);
    const limitValue = parseInt(size);
    const skip = (pageValue - 1) * limitValue;

    const totalCount = await prisma.folder.count({
      where: { userId },
    });

    const folders = await prisma.folder.findMany({
      where: { userId },
      skip,
      take: limitValue,
      orderBy: {
        createdAt: "desc",
      },
      select: foldersSelectFields,
    });

    const totalPages = Math.ceil(totalCount / limitValue);

    const formattedFolders = folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      description: folder.description,
      createdAt: folder.createdAt,
      totalFiles: folder.prdIds.length,
    }));

    const result = isPaginated
      ? {
          folders: formattedFolders,
          pagination: {
            currentPage: pageValue,
            totalPages,
            totalItems: totalCount,
            itemsPerPage: limitValue,
            hasNextPage: pageValue < totalPages,
            hasPreviousPage: pageValue > 1,
          },
        }
      : formattedFolders;

    // Cache the result
    await setRedisValue(cacheKey, JSON.stringify(result), CACHE_TTL.FOLDER_LIST);

    return result;
  } catch (error) {
    if (error instanceof AppError) throw error;

    throw createError(ErrorType.INTERNAL, "Internal Server Error", {
      originalError: error instanceof Error ? error.message : "Unknown error",
      context: "Folders get failed",
    });
  }
};

export const addFilesToFolderService = async (
  folderId: string,
  prdIds: string[],
  userId: string
) => {
  try {
    //* Validate folder exists and belongs to user
    const folder = await prisma.folder.findUnique({
      where: {
        id: folderId,
        userId: userId,
      },
    });

    if (!folder) {
      throw createError(ErrorType.NOT_FOUND, "Folder not found", {
        context: "The specified folder does not exist or does not belong to the user",
      });
    }

    //* Validate all PRDs exist and belong to user
    const existingPRDs = await prisma.pRD.findMany({
      where: {
        id: { in: prdIds },
        userId: userId,
      },
    });

    if (existingPRDs.length !== prdIds.length) {
      throw createError(ErrorType.NOT_FOUND, "One or more PRDs not found", {
        context: "Some PRDs do not exist or do not belong to the user",
      });
    }

    //* Update folder with PRD IDs
    const updatedFolder = await prisma.folder.update({
      where: { id: folderId },
      data: {
        prdIds: {
          push: prdIds, // Add new PRD IDs to existing array
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    // Invalidate both the specific folder and the folders list
    await invalidateFolderCache(userId, folderId);

    return {
      success: true,
      updatedFolder,
    };
  } catch (error) {
    console.log(error);
    if (error instanceof AppError) throw error;

    throw createError(ErrorType.INTERNAL, "Internal server error", {
      originalError: error instanceof Error ? error.message : "Unknown error",
      context: "Adding files to folder",
    });
  }
};

export const removeFilesFromFolderService = async (
  userId: string,
  folderId: string,
  fileIds: string[]
) => {
  try {
    // Verify folder belongs to user
    const folder = await prisma.folder.findUnique({
      where: {
        id: folderId,
        userId
      },
      select: {
        id: true,
        prdIds: true
      }
    });

    if (!folder) {
      throw createError(ErrorType.NOT_FOUND, "Folder not found", {
        context: "Removing files from folder"
      });
    }

    // Filter to only remove PRDs that are actually in the folder
    const prdIdsToRemove = fileIds.filter(id => folder.prdIds.includes(id));
    
    if (prdIdsToRemove.length === 0) {
      return {
        success: true,
        message: "No files to remove",
        removedCount: 0
      };
    }

    // Get the new list of PRD IDs after removal
    const updatedPrdIds = folder.prdIds.filter(id => !prdIdsToRemove.includes(id));

    // Update the folder with the new list of PRD IDs
    const updatedFolder = await prisma.folder.update({
      where: {
        id: folderId
      },
      data: {
        prdIds: updatedPrdIds
      }
    });

    // Invalidate relevant caches
    await invalidateFolderCache(userId, folderId);
    
    // Also invalidate PRD cache since PRD associations have changed
    await invalidatePrdCache(userId);

    return {
      success: true,
      message: `Successfully removed ${prdIdsToRemove.length} files from folder`,
      removedCount: prdIdsToRemove.length
    };
  } catch (error) {
    if (error instanceof AppError) throw error;

    throw createError(ErrorType.INTERNAL, "Internal server error", {
      originalError: error instanceof Error ? error.message : "Unknown error",
      context: "Removing files from folder"
    });
  }
};

export const duplicateFoldersService = async (ids: string[], userId: string) => {
  try {
    //* Get original folders and all existing folders in one query
    const [originalFolders, existingFolders] = await Promise.all([
      prisma.folder.findMany({
        where: {
          id: { in: ids },
          userId,
        },
        select: {
          name: true,
          description: true,
          prdIds: true,
        },
      }),
      prisma.folder.findMany({
        where: {
          userId,
        },
        select: {
          name: true,
        },
      }),
    ]);

    if (originalFolders.length === 0) {
      return {
        success: true,
        duplicatedCount: 0,
        message: "No folders found to duplicate",
      };
    }

    //* Create a Set of existing names for O(1) lookup
    const existingNames = new Set(existingFolders.map((f) => f.name));

    //* Create all duplicates in a single transaction
    const duplicatedFolders = await prisma.$transaction(
      originalFolders.map((folder) => {
        let copyNumber = 1;
        let newName = `${folder.name} Copy`;

        // Find unique name using in-memory Set
        while (existingNames.has(newName)) {
          copyNumber++;
          newName = `${folder.name} Copy ${copyNumber}`;
        }
        existingNames.add(newName); // Add to Set to maintain uniqueness in batch

        return prisma.folder.create({
          data: {
            name: newName,
            userId,
            description: folder.description,
            prdIds: folder.prdIds,
          },
          select: {
            id: true,
            name: true,
            prdIds: true,
            createdAt: true,
          },
        });
      })
    );

    await invalidateFolderCache(userId);

    return {
      success: true,
      duplicatedCount: duplicatedFolders.length,
      duplicatedFolders,
      message: `Successfully duplicated ${duplicatedFolders.length} folders`,
    };
  } catch (error) {
    console.log(error);
    if (error instanceof AppError) throw error;

    throw createError(ErrorType.INTERNAL, "Internal server error", {
      originalError: error instanceof Error ? error.message : "Unknown error",
      context: "Duplicating folders",
    });
  }
};

export const deleteFoldersService = async (ids: string[], userId: string) => {
  try {
    // Start a transaction to ensure all operations complete or none do
    return await prisma.$transaction(async (tx) => {
      // 1. Find all folders that match the criteria
      const foldersToDelete = await tx.folder.findMany({
        where: {
          id: { in: ids },
          userId,
        },
        select: { id: true },
      });

      const foundFolderIds = foldersToDelete.map((folder) => folder.id);

      if (foundFolderIds.length === 0) {
        throw createError(ErrorType.NOT_FOUND, "No folders found to delete");
      }

      // 2. Find all PRDs that reference the folders being deleted
      const affectedPRDs = await tx.pRD.findMany({
        where: {
          folderIds: { hasSome: foundFolderIds },
        },
        select: {
          id: true,
          folderIds: true,
        },
      });

      // 3. Update each PRD to remove folder references - using Prisma's batch operations
      const prdUpdatePromises = affectedPRDs.map((prd) => {
        const updatedFolderIds = prd.folderIds.filter(
          (folderId) => !foundFolderIds.includes(folderId)
        );

        return tx.pRD.update({
          where: { id: prd.id },
          data: { folderIds: updatedFolderIds },
        });
      });

      // Wait for all PRD updates to complete
      if (prdUpdatePromises.length > 0) {
        await Promise.all(prdUpdatePromises);
      }

      // 4. Delete the folders
      const deleteResult = await tx.folder.deleteMany({
        where: {
          id: { in: foundFolderIds },
          userId,
        },
      });

      // 5. Check results
      if (deleteResult.count !== foundFolderIds.length) {
        throw createError(ErrorType.INTERNAL, "Some folders were not deleted", {
          context: "Folders deletion",
          details: `Deleted ${deleteResult.count} out of ${foundFolderIds.length} folders`,
        });
      }

      // Invalidate all folder caches for the user
      await invalidateFolderCache(userId);

      // 6. Report if some requested IDs were not found
      const notFoundCount = ids.length - foundFolderIds.length;

      return {
        success: true,
        deletedCount: deleteResult.count,
        notFoundCount,
        updatedPRDs: prdUpdatePromises.length,
      };
    });
  } catch (error) {
    console.log(error);
    if (error instanceof AppError) throw error;

    throw createError(ErrorType.INTERNAL, "Internal server error", {
      originalError: error instanceof Error ? error.message : "Unknown error",
      context: "Deleting folders",
    });
  }
};

// Function to invalidate folder cache when folders are modified
export const invalidateFolderCache = async (userId: string, folderId?: string) => {
  return withRedis(async (client) => {
    const keys = folderId
      ? await client.keys(`folder:${userId}:${folderId}:*`) // Specific folder
      : await client.keys(`folder*:${userId}:*`); // All folder-related keys for user

    // Also invalidate folders list
    const folderListKeys = await client.keys(`folders:${userId}:*`);
    keys.push(...folderListKeys);

    // Delete all matching keys
    if (keys.length > 0) {
      await client.del(keys);
    }

    return keys.length;
  });
};
