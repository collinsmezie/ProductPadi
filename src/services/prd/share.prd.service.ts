import { z } from "zod";
import { revokePrdShareSchema, sharePrdByEmailSchema, togglePrdPublicAccessSchema, updatePrdShareSchema } from "../../schema/prd/share.prd.schema";
import { createError } from "../../utils/error.utils";
import { AppError, ErrorType } from "../../types/errors.types";
import prisma from "../../models/prisma";

export const sharePrdByEmailService = async (
  userId: string,
  shareData: z.infer<typeof sharePrdByEmailSchema>
) => {
  try {
    const { prdId, email, permission } = shareData;

    // Check if the PRD exists and the user has access to it
    const prd = await prisma.pRD.findFirst({
      where: {
        id: prdId,
        userId: userId,
      },
    });

    if (!prd) {
      throw createError(
        ErrorType.NOT_FOUND,
        "PRD not found or you don't have permission to share it"
      );
    }

    // Check if there's already a share for this PRD and email
    const existingShare = await prisma.share.findFirst({
      where: {
        prdId,
        sharedWithEmail: email,
      },
    });

    if (existingShare) {
      // Update the existing share instead of creating a new one
      return await prisma.share.update({
        where: { id: existingShare.id },
        data: {
          permission,
          isActive: true, // Reactivate if it was previously deactivated
          updatedAt: new Date(),
        },
      });
    }

    // Find if the email belongs to a registered user
    const targetUser = await prisma.user.findUnique({
      where: { email },
    });

    // Create the share
    const share = await prisma.share.create({
      data: {
        prd: { connect: { id: prdId } },
        sharedBy: { connect: { id: userId } },
        sharedWithEmail: email,
        ...(targetUser && { sharedWith: { connect: { id: targetUser.id } } }),
        permission,
      },
    });

    // TODO: Send email notification

    return share;
  } catch (error) {
    if(error instanceof AppError) throw error 
    
    throw createError(ErrorType.INTERNAL, "Internal Server Error", {
      originalError: error instanceof Error ? error.message : "Unknown error",
      context: "Failed to share the PRD",
    });
  }
};

export const updatePrdShareService = async (
  userId: string,
  updateData: z.infer<typeof updatePrdShareSchema>
) => {
  try {
    const { shareId, permission } = updateData;

    // Find the share and verify ownership
    const share = await prisma.share.findFirst({
      where: {
        id: shareId,
        sharedById: userId, // Only the creator can update a share
      },
      include: {
        prd: true,
      },
    });

    if (!share) {
      throw createError(
        ErrorType.NOT_FOUND,
        "Share not found or you don't have permission to update it"
      );
    }

    // Update the share
    return await prisma.share.update({
      where: { id: shareId },
      data: {
        permission,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    if(error instanceof AppError) throw error 

    throw createError(ErrorType.INTERNAL, "Internal Server Error", {
      originalError: error instanceof Error ? error.message : "Unknown error",
      context: "Failed to update share",
    });
  }
};

export const revokePrdShareService = async (
  userId: string,
  revokeData: z.infer<typeof revokePrdShareSchema>
) => {
  try {
    const { shareId } = revokeData;

    // Find the share and verify ownership
    const share = await prisma.share.findFirst({
      where: {
        id: shareId,
        sharedById: userId, // Only the creator can revoke a share
      },
    });

    if (!share) {
      throw createError(ErrorType.NOT_FOUND, "Share not found or you don't have permission to revoke it");
    }

    // Delete the share
    return await prisma.share.delete({
      where: { id: shareId },
    });
  } catch (error) {
    if(error instanceof AppError) throw error 
    
    throw createError(ErrorType.INTERNAL, "Internal Server Error", {
      originalError: error instanceof Error ? error.message : "Unknown error",
      context: "Failed to revoke the share",
    });
  }
};

export const togglePrdPublicAccessService = async (
  userId: string,
  toggleData: z.infer<typeof togglePrdPublicAccessSchema>
) => {
  try {
    const { prdId, isPublic } = toggleData;

    // Check if the PRD exists and the user has access to it
    const prd = await prisma.pRD.findFirst({
      where: {
        id: prdId,
        userId: userId,
      },
    });

    if (!prd) {
      throw createError(ErrorType.NOT_FOUND, "PRD not found or you don't have permission to modify it");
    }

    // Update the PRD's public status
    return await prisma.pRD.update({
      where: { id: prdId },
      data: {
        isPublic,
      },
    });
  } catch (error) {
    if(error instanceof AppError) throw error 
    
    throw createError(ErrorType.INTERNAL, "Internal Server Error", {
      originalError: error instanceof Error ? error.message : "Unknown error",
      context: "Failed to toggle public access for the PRD",
    });
  }
};