import prisma from "../../models/prisma";
import { createError } from "../../utils/error.utils";
import { AppError, ErrorType } from "../../types/errors.types";
import { FieldType } from "../../types/constants/fieldTypes";
import { SharePermission } from "@prisma/client";


const fieldModelMap: Record<FieldType, string> = {
  stakeholder: "defaultTemplateStakeHolders",
  objective: "defaultTemplateProductObjective",
  functionalRequirement: "defaultTemplateFunctionalRequirement",
  nonFunctionalRequirement: "defaultTemplateNonFunctionalRequirement",
  assumptionConstraint: "defaultTemplateAssumptionConstraint",
  dependency: "defaultTemplateDependency",
  conditionCriteria: "defaultTemplateConditionCriteria",
  riskAnalysis: "defaultTemplateRiskAnalysis",
  priorityEffort: "defaultTemplatePriorityEffort",
  versionHistory: "defaultTemplateVersionHistory",
  prdPersonalDetails: "defaultTemplatePrdPersonalDetails",
};


export const createCommentService = async (
  userId: string,
  prdId: string,
  fieldType: FieldType,
  fieldId: string,
  content: string
) => {
  try {

    // Fetch PRD with its default template, and also check share permission (owner or sharedWith)
    const prdWithAccess = await prisma.pRD.findFirst({
      where: {
        id: prdId,
        prdType: "DEFAULT",
        OR: [
          { shares: { some: { sharedById: userId, isActive: true } } }, // owner
          {
            shares: {
              some: {
                sharedWithId: userId,
                isActive: true,
                NOT: { permission: SharePermission.VIEW }, // ensure commenter has edit rights
              },
            },
          },
        ],
      },
      include: {
        defaultTemplate: true,
      },
    });

    if (!prdWithAccess) {
      throw createError(
        ErrorType.UNAUTHORIZED,
        `User ${userId} does not have permission to comment on PRD`
      );
    }

    // Check if the PRD has a default template
    const template = prdWithAccess.defaultTemplate;
    if (!template) {
      throw createError(ErrorType.NOT_FOUND, "PRD template not found for the specified PRD");
    }

    // Validate fieldType mapping
    const modelName = fieldModelMap[fieldType];
    if (!modelName) {
      throw createError(ErrorType.VALIDATION, `Invalid fieldType: ${fieldType}`);
    }

    const fieldModel = (prisma as any)[modelName];
    if (!fieldModel) {
      throw createError(ErrorType.INTERNAL, `Model "${modelName}" not found on Prisma client`);
    }

    // Validate the field exists under the correct template
    const field = await fieldModel.findFirst({
      where: {
        id: fieldId,
        defaultPrdTemplateId: template.id,
      },
    });

    if (!field) {
      throw createError(
        ErrorType.NOT_FOUND,
        `No ${fieldType} field found with the provided fieldId (${fieldId}) on template (${template.id})`
      );
    }

    // Create the comment
    const newComment = await prisma.comment.create({
      data: {
        userId,
        prdId,
        defaultPrdTemplateId: template.id,
        fieldType,
        fieldId,
        content,
      },
    });

    return {
      message: "Comment added successfully",
      comment: newComment,
    };
  } catch (error) {
    console.error("Error in addCommentService:", error);

    if (error instanceof AppError) {
      throw error;
    }

    throw createError(
      ErrorType.INTERNAL,
      "An unexpected error occurred while adding the comment"
    );
  }
};



export async function getAllCommentsForAPrdService(prdId: string) {
  try {
    const comments = await prisma.comment.findMany({
      where: { prdId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        fieldType: true,
        fieldId: true,
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
        createdAt: true,
      },
    });

    // Check if comments exist
    if (comments.length === 0) {
      return {
        message: "No comments found for this PRD",
        comments: [],
      };
    }

    // Grouping logic
    const grouped: Record<string, { fieldId: string; comments: typeof comments }[]> = {};

    for (const comment of comments) {
      if (!comment.fieldType || !comment.fieldId) continue;

      if (!grouped[comment.fieldType]) {
        grouped[comment.fieldType] = [];
      }

      const fieldGroup = grouped[comment.fieldType];

      let fieldEntry = fieldGroup.find(entry => entry.fieldId === comment.fieldId);

      if (!fieldEntry) {
        fieldEntry = { fieldId: comment.fieldId, comments: [] };
        fieldGroup.push(fieldEntry);
      }

      fieldEntry.comments.push(comment);
    }

    return grouped;
  } catch (error) {
    console.error('❌ Failed to fetch or group comments:', error);
    if (error instanceof AppError) {
      throw error;
    }

    throw createError(
      ErrorType.INTERNAL,
      'An error occurred while fetching or grouping comments'
    );
  }
}



export const getAllCommentsForAPrdFieldService = async (
  prdId: string,
  fieldType: FieldType,
  fieldId: string
) => {
  try {
    // Get PRD and its default template
    const prd = await prisma.pRD.findFirst({
      where: {
        id: prdId,
        prdType: "DEFAULT",
      },
      include: {
        defaultTemplate: true,
      },
    });

    const template = prd?.defaultTemplate;

    if (!template) {
      throw createError(ErrorType.NOT_FOUND, "PRD template not found for the specified PRD");
    }

    const comments = await prisma.comment.findMany({
      where: {
        defaultPrdTemplateId: template.id,
        prdId,
        fieldType,
        fieldId,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    return {
      message: comments.length > 0
        ? "Comments retrieved successfully"
        : "No comments found for this field",
      comments,
    };

  } catch (error) {
    console.error("Error in getAllCommentsForAPrdFieldService:", error);

    if (error instanceof AppError) {
      throw error;
    }

    throw createError(
      ErrorType.INTERNAL,
      "An error occurred while retrieving comments"
    );
  }
};