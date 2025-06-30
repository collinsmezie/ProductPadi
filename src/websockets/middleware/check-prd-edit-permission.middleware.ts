// src/websockets/middleware/check-prd-permission.middleware.ts
import { SharePermission } from "@prisma/client";
import prisma from "../../models/prisma";
import { PrdPermissions } from "../types/edit-prd.types";

export const checkPrdPermissions = async (
  userId: string,
  prdId: string
): Promise<PrdPermissions> => {
  try {
    // Default permissions
    const permissions: PrdPermissions = {
      canView: false,
      canEdit: false,
      isOwner: false,
    };

    // Check if user is the owner of the PRD
    const prd = await prisma.pRD.findFirst({
      where: {
        id: prdId,
        userId: userId,
      },
    });

    if (prd) {
      // User is the owner - has all permissions
      permissions.canView = true;
      permissions.canEdit = true;
      permissions.isOwner = true;
      return permissions;
    }

    // If not owner, check if user has permission via sharing
    const share = await prisma.share.findFirst({
      where: {
        prdId: prdId,
        sharedWithId: userId,
        isActive: true,
      },
    });

    if (share) {
      // User has some kind of access
      permissions.canView = true;

      // Check if they have edit permission
      permissions.canEdit = share.permission === SharePermission.EDIT;
    } else {
      // Check if the PRD is public (anyone can view)
      const publicPrd = await prisma.pRD.findFirst({
        where: {
          id: prdId,
          isPublic: true,
        },
      });

      if (publicPrd) {
        permissions.canView = true;
      }
    }

    return permissions;
  } catch (error) {
    console.error(`Error checking permissions for user ${userId} on PRD ${prdId}:`, error);
    return { canView: false, canEdit: false, isOwner: false };
  }
};

// For backward compatibility
export const checkPrdEditPermission = async (userId: string, prdId: string): Promise<boolean> => {
  const permissions = await checkPrdPermissions(userId, prdId);
  return permissions.canEdit;
};
