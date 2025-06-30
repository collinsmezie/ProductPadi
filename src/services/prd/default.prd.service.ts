import prisma from "../../models/prisma";
import { AppError, ErrorType } from "../../types/errors.types";
import { AIResponse } from "../../types/prd/defaultPrd.types";
import { createError } from "../../utils/error.utils";
import { openai } from "../../config/openai.config";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { updateDefaultPrdBodySchema } from "../../schema/prd/default/update.default.prd.schema";
import { generateDefaultPrdFromSurveyBodySchema } from "../../schema/prd/default/create-survey.default.prd.schema";
import { PRD } from "../../types/prd/index.types";
import fs from "fs";
import path from "path";
import os from "os";
import { invalidatePrdCache } from "./index.prd.service";
import { getRedisValue, setRedisValue } from "../../utils/redis.utils";

const PriorityEnum = z.enum(["High", "Medium", "Low"]);

const responseSchema = z.object({
  Overview: z.string(),
  ProductObjectives: z.array(z.string()),
  FunctionalRequirements: z.array(z.string()),
  NonFunctionalRequirements: z.array(z.string()),
  AssumptionsAndConstraints: z.array(
    z.object({
      assumption: z.string(),
      constraint: z.string(),
    })
  ),
  Dependencies: z.array(z.string()),
  ConditionAndCriteria: z.array(
    z.object({
      condition: z.string(),
      criteria: z.string(),
    })
  ),
  RiskAnalysis: z.array(
    z.object({
      risk: z.string(),
      mitigation: z.string(),
    })
  ),
  PriorityAndEffort: z.array(
    z.object({
      requirement: z.string(),
      priority: PriorityEnum,
      estimatedEffort: z.string(),
    })
  ),
  VersionHistoryAndChangeLog: z.array(
    z.object({
      version: z.string(),
      changes: z.array(z.string()),
    })
  ),
});

const systemPrompt = `You are an AI assistant specialized in generating comprehensive Product Requirements Documents (PRDs). Analyze the user input carefully and generate a structured PRD with the following sections:

1. Overview: A concise summary of the product's purpose and scope.

2. Product Objectives: Clear, measurable goals the product aims to achieve.

3. Functional Requirements: Specific features and capabilities the product must have.

4. Non-Functional Requirements: Quality attributes like performance, security, and usability.

5. Assumptions And Constraints: Paired list of assumptions made and constraints identified.

6. Dependencies: External systems, resources, or conditions required for implementation.

7. Condition And Criteria: Paired list of conditions and their acceptance criteria.

8. Risk Analysis: Identified risks and their mitigation strategies.

9. Priority And Effort: For EACH functional requirement, include:
   - Requirement description
   - Priority level (must be one of: "High", "Medium", "Low")

10. Version History And Change Log: Include:
    - Version in semantic format (e.g., "1.0.0")
    - List of changes made in this version

When creating requirements, ensure they are:
- Specific and unambiguous
- Measurable where applicable
- Achievable and realistic
- Relevant to the product goals
- Time-bound when appropriate

If information is incomplete, make reasonable assumptions based on industry best practices and note them in the Assumptions section.

Format the response as a valid JSON matching the specified schema.`;

export const getDefaultPrdByIdService = async (
  prdId: string,
  shouldBeArranged: boolean = true
) => {
  if (!prdId) {
    throw createError(400, "PRD ID is required");
  }

  try {
    // Define the Redis key for caching
    const cacheKey = `prd:${prdId}`;

    // Try to get the PRD from Redis cache
    const cachedPrd = await getRedisValue(cacheKey)

    if (cachedPrd) {
      const prd = JSON.parse(cachedPrd);

      // Update the lastOpenedAt for the template
      await prisma.defaultPrdTemplate.update({
        where: { id: prd.defaultTemplate?.id },
        data: { lastOpenedAt: new Date() },
      });

      const response = shouldBeArranged
        ? arrangeTheSavedDefaultPrdResponseInTheProperSchemaForTheFrontend(prd)
        : prd;

      return {
        success: true,
        data: response,
      };
    }

    const prd = await prisma.pRD.findUnique({
      where: {
        id: prdId,
        prdType: "DEFAULT",
      },
      include: {
        defaultTemplate: {
          include: {
            functionalRequirements: true,
            nonFunctionalRequirements: true,
            objectives: true,
            priorityEffort: true,
            versionHistory: true,
            riskAnalysis: true,
            conditionCriteria: true,
            dependencies: true,
            assumptionsAndConstraints: true,
            prdPersonalDetails: true,
            stakeholders: true,
          },
        },
      },
    });

    if (!prd) {
      throw createError(404, "PRD not found", {
        originalError: `PRD WITH THE ID ${prdId} was not found`,
        context: "Couldn't find prd",
      });
    }

    // Update the lastOpenedAt for the template
    await prisma.defaultPrdTemplate.update({
      where: { id: prd.defaultTemplate?.id },
      data: { lastOpenedAt: new Date() },
    });

    await setRedisValue(cacheKey, JSON.stringify(prd), 3600)

    const response = shouldBeArranged
      ? arrangeTheSavedDefaultPrdResponseInTheProperSchemaForTheFrontend(prd)
      : prd;

    return {
      success: true,
      data: response,
    };
  } catch (error) {
    console.log(error);
    if (error instanceof AppError) throw error;

    throw createError(500, "Failed to retrieve PRD", {
      originalError: error instanceof Error ? error.message : "Unknown error",
      context: "PRD retrieval",
    });
  }
};

export const generateAndSaveDefaultPrdWithSurveyService = async (
  input: z.infer<typeof generateDefaultPrdFromSurveyBodySchema>,
  // visualData: Express.Multer.File,
  userId: string
) => {
  try {
    const completion = await openai.beta.chat.completions.parse({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],
      response_format: zodResponseFormat(responseSchema, "event"),
    });

    if (completion.choices[0].message.parsed === null)
      throw createError(ErrorType.INTERNAL, "Failed to generate response", {
        service: "AI",
        context: "Response parsing",
      });

    /** //! Discontinued the file visual for PRD's
    // Handle file upload
    // const blob = new Blob([visualData.buffer], { type: visualData.mimetype });
    // const convertedFile = new File([blob], `${Date.now()}`, {
    //   type: visualData.mimetype,
    //   lastModified: Date.now(),
    // });

    // const storageResult = await storage.createFile(bucketId!, ID.unique(), convertedFile);

    // const imgUrl = storage.getFilePreview(bucketId!, storageResult.$id);
    */

    const prdSavedToDB = await saveDefaultPRDToDatabase(
      completion.choices[0].message.parsed,
      userId,
      input.step7.stakeholders
    );

    if (!prdSavedToDB.success)
      throw createError(ErrorType.INTERNAL, prdSavedToDB.error || "Failed to save PRD", {
        context: "Database operation",
      });

    await invalidatePrdCache(userId);

    const arrangedResponse = arrangeTheSavedDefaultPrdResponseInTheProperSchemaForTheFrontend(
      prdSavedToDB.data!
    );

    return {
      success: true,
      data: arrangedResponse,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;

    throw createError(500, "Operation failed", {
      originalError: error instanceof Error ? error.message : "Unknown error",
      context: "PRD generation and save",
    });
  }
};

export const generateAndSaveDefaultPrdFromFileService = async (
  file: Express.Multer.File,
  userId: string
) => {
  try {
    // Create a File directly from the buffer with proper filename
    const timestamp = Date.now();
    const originalFilename = file.originalname || `file_${timestamp}`;
    const convertedFile = new File([file.buffer], originalFilename, {
      type: file.mimetype,
      lastModified: timestamp,
    });

    // First, write the buffer to a temporary file
    const tempFilePath = path.join(os.tmpdir(), `upload_${Date.now()}_${originalFilename}`);
    fs.writeFileSync(tempFilePath, file.buffer);

    // Upload to Appwrite
    //! Removed the upload to appwrite cause It isn't being used
    // await storage.createFile(bucketId!, ID.unique(), convertedFile);

    // Upload file to openai as assistant
    const uploadFileToOpenAi = await openai.files.create({
      file: fs.createReadStream(tempFilePath),
      purpose: "assistants",
    });

    const completion = await openai.beta.chat.completions.parse({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: "Analyze the attached file and generate a PRD based on the analysis",
          attachments: {
            type: "file_attachment",
            file_id: uploadFileToOpenAi.id,
          },
        },
      ],
      response_format: zodResponseFormat(responseSchema, "event"),
    });

    // Delete file from open ai files
    await openai.files.del(uploadFileToOpenAi.id);

    // Send error if parsed completion is null
    if (completion.choices[0].message.parsed === null)
      throw createError(ErrorType.INTERNAL, "Failed to generate response", {
        service: "AI",
        context: "Response parsing",
      });

    // Save prd to DB
    const prdSavedToDB = await saveDefaultPRDToDatabase(
      completion.choices[0].message.parsed,
      userId
    );

    if (!prdSavedToDB.success)
      throw createError(500, prdSavedToDB.error || "Failed to save PRD", {
        context: "Database operation",
      });

    await invalidatePrdCache(userId);

    const arrangedResponse = arrangeTheSavedDefaultPrdResponseInTheProperSchemaForTheFrontend(
      prdSavedToDB.data!
    );

    return arrangedResponse;
  } catch (error) {
    if (error instanceof AppError) throw error;

    throw createError(500, "Failed to process file and generate PRD", {
      originalError: error instanceof Error ? error.message : "Unknown error",
      context: "File processing service",
    });
  }
};

export const updateDefaultPrdService = async (
  userId: string,
  prdId: string,
  updateData: z.infer<typeof updateDefaultPrdBodySchema>
) => {
  try {
    // Validate that the template exists
    const existingPrd = await prisma.pRD.findUnique({
      where: { id: prdId, userId, prdType: "DEFAULT" },
      include: {
        defaultTemplate: true,
      },
    });

    if (!existingPrd) {
      throw createError(ErrorType.NOT_FOUND, "PRD not found", {
        context: "Failed to find the PRD to be updated",
      });
    }

    const defaultPrdId = existingPrd.defaultTemplate?.id;

    if (!defaultPrdId) {
      throw createError(ErrorType.NOT_FOUND, "Default PRD template not found", {
        context: "Failed to find the default template for the PRD",
      });
    }

    await prisma.$transaction(
      async (tx) => {
        // Process creates
        if (updateData.create) {
          // Functional Requirements
          if (updateData.create.functionalRequirements?.length) {
            await Promise.all(
              updateData.create.functionalRequirements.map((requirement) =>
                tx.defaultTemplateFunctionalRequirement.create({
                  data: {
                    requirement,
                    defaultPrdTemplateId: defaultPrdId,
                  },
                })
              )
            );
          }

          // Non-Functional Requirements
          if (updateData.create.nonFunctionalRequirements?.length) {
            await Promise.all(
              updateData.create.nonFunctionalRequirements.map((requirement) =>
                tx.defaultTemplateNonFunctionalRequirement.create({
                  data: {
                    requirement,
                    defaultPrdTemplateId: defaultPrdId,
                  },
                })
              )
            );
          }

          // Objectives
          if (updateData.create.objectives?.length) {
            await Promise.all(
              updateData.create.objectives.map((description) =>
                tx.defaultTemplateProductObjective.create({
                  data: {
                    description,
                    defaultPrdTemplateId: defaultPrdId,
                  },
                })
              )
            );
          }

          // Assumptions and Constraints
          if (updateData.create.assumptionAndConstraints?.length) {
            await Promise.all(
              updateData.create.assumptionAndConstraints.map(({ assumption, constraint }) =>
                tx.defaultTemplateAssumptionsConstraints.create({
                  data: {
                    assumption,
                    constraint,
                    defaultPrdTemplateId: defaultPrdId,
                  },
                })
              )
            );
          }

          // Dependencies
          if (updateData.create.dependencies?.length) {
            await Promise.all(
              updateData.create.dependencies.map((description) =>
                tx.defaultTemplateDependency.create({
                  data: {
                    description,
                    defaultPrdTemplateId: defaultPrdId,
                  },
                })
              )
            );
          }

          // Condition Criteria
          if (updateData.create.conditionCriteria) {
            await tx.defaultTemplateConditionCriteria.create({
              data: {
                condition: updateData.create.conditionCriteria.condition,
                criteria: updateData.create.conditionCriteria.criteria,
                defaultPrdTemplateId: defaultPrdId,
              },
            });
          }

          // Risk Analysis
          if (updateData.create.riskAnalysis?.length) {
            await Promise.all(
              updateData.create.riskAnalysis.map(({ risk, mitigation }) =>
                tx.defaultTemplateRiskAnalysis.create({
                  data: {
                    risk,
                    mitigation,
                    defaultPrdTemplateId: defaultPrdId,
                  },
                })
              )
            );
          }

          // Priority Effort
          if (updateData.create.priorityEffort?.length) {
            await Promise.all(
              updateData.create.priorityEffort.map(({ requirement, priority, estimatedEffort }) =>
                tx.defaultTemplatePriorityEffort.create({
                  data: {
                    requirement,
                    priority,
                    estimatedEffort,
                    defaultPrdTemplateId: defaultPrdId,
                  },
                })
              )
            );
          }

          // Version History
          if (updateData.create.versionHistory?.length) {
            await Promise.all(
              updateData.create.versionHistory.map(
                ({ version, date, descriptionOfEdit, editsCompletedBy }) =>
                  tx.defaultTemplateVersionHistory.create({
                    data: {
                      version,
                      date: new Date(date),
                      descriptionOfEdit,
                      editsCompletedBy,
                      defaultPrdTemplateId: defaultPrdId,
                    },
                  })
              )
            );
          }

          // Stakeholders
          if (updateData.create.stakeholders?.length) {
            await Promise.all(
              updateData.create.stakeholders.map(({ name, role }) =>
                tx.defaultTemplateStakeHolders.create({
                  data: {
                    name,
                    role,
                    defaultPrdTemplateId: defaultPrdId,
                  },
                })
              )
            );
          }
        }

        // Process updates
        if (updateData.update) {
          // PRD Title
          if (updateData.update.title) {
            await tx.pRD.update({
              where: { id: prdId },
              data: { title: updateData.update.title },
            });
          }

          // Functional Requirements
          if (updateData.update.functionalRequirements?.length) {
            await Promise.all(
              updateData.update.functionalRequirements.map(({ id, requirement }) =>
                tx.defaultTemplateFunctionalRequirement.update({
                  where: { id },
                  data: { requirement },
                })
              )
            );
          }

          // Non-Functional Requirements
          if (updateData.update.nonFunctionalRequirements?.length) {
            await Promise.all(
              updateData.update.nonFunctionalRequirements.map(({ id, requirement }) =>
                tx.defaultTemplateNonFunctionalRequirement.update({
                  where: { id },
                  data: { requirement },
                })
              )
            );
          }

          // Objectives
          if (updateData.update.objectives?.length) {
            await Promise.all(
              updateData.update.objectives.map(({ id, description }) =>
                tx.defaultTemplateProductObjective.update({
                  where: { id },
                  data: { description },
                })
              )
            );
          }

          // Assumptions and Constraints
          if (updateData.update.assumptionAndConstraints?.length) {
            await Promise.all(
              updateData.update.assumptionAndConstraints.map(
                ({ id, new: { assumption, constraint } }) => {
                  const updateData: { assumption?: string; constraint?: string } = {};
                  if (assumption !== undefined) {
                    updateData.assumption = assumption;
                  }
                  if (constraint !== undefined) {
                    updateData.constraint = constraint;
                  }
                  return tx.defaultTemplateAssumptionsConstraints.update({
                    where: { id },
                    data: updateData,
                  });
                }
              )
            );
          }

          // Dependencies
          if (updateData.update.dependencies?.length) {
            await Promise.all(
              updateData.update.dependencies.map(({ id, description }) =>
                tx.defaultTemplateDependency.update({
                  where: { id },
                  data: { description },
                })
              )
            );
          }

          // Condition Criteria
          if (updateData.update.conditionCriteria) {
            await Promise.all(
              updateData.update.conditionCriteria.map(({ id, condition, criteria }) =>
                tx.defaultTemplateConditionCriteria.update({
                  where: { id },
                  data: {
                    condition,
                    criteria,
                  },
                })
              )
            );
          }

          // Risk Analysis
          if (updateData.update.riskAnalysis?.length) {
            await Promise.all(
              updateData.update.riskAnalysis.map(({ id, risk, mitigation }) =>
                tx.defaultTemplateRiskAnalysis.update({
                  where: { id },
                  data: { risk, mitigation },
                })
              )
            );
          }

          // Priority Effort
          if (updateData.update.priorityEffort?.length) {
            await Promise.all(
              updateData.update.priorityEffort.map(
                ({ id, requirement, priority, estimatedEffort }) =>
                  tx.defaultTemplatePriorityEffort.update({
                    where: { id },
                    data: { requirement, priority, estimatedEffort },
                  })
              )
            );
          }

          // Version History
          if (updateData.update.versionHistory?.length) {
            await Promise.all(
              updateData.update.versionHistory.map(
                ({ id, version, date, descriptionOfEdit, editsCompletedBy }) =>
                  tx.defaultTemplateVersionHistory.update({
                    where: { id },
                    data: {
                      version,
                      ...(date && { date: new Date(date) }),
                      descriptionOfEdit,
                      editsCompletedBy,
                    },
                  })
              )
            );
          }

          // Stakeholders
          if (updateData.update.stakeholders?.length) {
            await Promise.all(
              updateData.update.stakeholders.map(({ id, name, role }) =>
                tx.defaultTemplateStakeHolders.update({
                  where: { id },
                  data: { name, role },
                })
              )
            );
          }

          // Personal Details
          if (updateData.update.personalDetails) {
            await tx.defaultTemplatePrdPersonalDetails.update({
              where: { id: updateData.update.personalDetails.id },
              data: {
                productTitle: updateData.update.personalDetails.productTitle,
                author: updateData.update.personalDetails.author,
                phoneNumber: updateData.update.personalDetails.phoneNumber,
                email: updateData.update.personalDetails.email,
                address: updateData.update.personalDetails.address,
              },
            });
          }
        }

        // Process deletes
        if (updateData.delete) {
          // Functional Requirements
          if (updateData.delete.functionalRequirements?.length) {
            await Promise.all(
              updateData.delete.functionalRequirements.map((id) =>
                tx.defaultTemplateFunctionalRequirement.delete({
                  where: { id },
                })
              )
            );
          }

          // Non-Functional Requirements
          if (updateData.delete.nonFunctionalRequirements?.length) {
            await Promise.all(
              updateData.delete.nonFunctionalRequirements.map((id) =>
                tx.defaultTemplateNonFunctionalRequirement.delete({
                  where: { id },
                })
              )
            );
          }

          // Objectives
          if (updateData.delete.objectives?.length) {
            await Promise.all(
              updateData.delete.objectives.map((id) =>
                tx.defaultTemplateProductObjective.delete({
                  where: { id },
                })
              )
            );
          }

          // Assumptions
          if (updateData.delete.assumptionAndConstraints?.length) {
            await Promise.all(
              updateData.delete.assumptionAndConstraints.map((id) =>
                tx.defaultTemplateAssumptionsConstraints.delete({
                  where: { id },
                })
              )
            );
          }

          // Dependencies
          if (updateData.delete.dependencies?.length) {
            await Promise.all(
              updateData.delete.dependencies.map((id) =>
                tx.defaultTemplateDependency.delete({
                  where: { id },
                })
              )
            );
          }

          // Condition Criteria
          if (updateData.delete.conditionCriteria?.length) {
            await Promise.all(
              updateData.delete.conditionCriteria.map((id) =>
                tx.defaultTemplateConditionCriteria.delete({
                  where: { id },
                })
              )
            );
          }

          // Risk Analysis
          if (updateData.delete.riskAnalysis?.length) {
            await Promise.all(
              updateData.delete.riskAnalysis.map((id) =>
                tx.defaultTemplateRiskAnalysis.delete({
                  where: { id },
                })
              )
            );
          }

          // Priority Effort
          if (updateData.delete.priorityEffort?.length) {
            await Promise.all(
              updateData.delete.priorityEffort.map((id) =>
                tx.defaultTemplatePriorityEffort.delete({
                  where: { id },
                })
              )
            );
          }

          // Version History
          if (updateData.delete.versionHistory?.length) {
            await Promise.all(
              updateData.delete.versionHistory.map((id) =>
                tx.defaultTemplateVersionHistory.delete({
                  where: { id },
                })
              )
            );
          }

          // Stakeholders
          if (updateData.delete.stakeholders?.length) {
            await Promise.all(
              updateData.delete.stakeholders.map((id) =>
                tx.defaultTemplateStakeHolders.delete({
                  where: { id },
                })
              )
            );
          }
        }
      },
      { timeout: 15000 }
    );

    // Return the success true
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (
      error instanceof Error &&
      error.message.includes("Transaction already closed") &&
      error.message.includes("timeout for this transaction")
    ) {
      const getTransactionTimeoutDetails = (
        error: Error
      ): { timeout: number; duration: number } => {
        const timeoutMatch = error.message.match(/timeout for this transaction was (\d+) ms/);
        const durationMatch = error.message.match(/however (\d+) ms passed/);

        return {
          timeout: timeoutMatch ? parseInt(timeoutMatch[1], 10) : 0,
          duration: durationMatch ? parseInt(durationMatch[1], 10) : 0,
        };
      };

      const errorDetails = getTransactionTimeoutDetails(error as Error);

      throw createError(ErrorType.TRANSACTION_TIMEOUT, "The operation took too long to complete", {
        timeout: errorDetails.timeout,
        duration: errorDetails.duration,
        recommendation: "Try breaking your operation into smaller updates or try again later",
        context: "PRD update transaction",
      });
    }
    throw createError(500, "Internal Server Error", {
      originalError: error instanceof Error ? error.message : "Unknown error",
      context: "PRD update/edit failed",
    });
  }
};

export const downloadDefaultPrdFileAsPDFService = async (userId: string, prdId: string) => {
  try {
    const { data: prdData } = await getDefaultPrdByIdService(prdId, false);

    const prdDataWithDefaultTemplate = prdData as PRD;
  } catch (error) {
    if (error instanceof AppError) throw error;

    throw createError(ErrorType.INTERNAL, "Internal Server Error", {
      originalError: error instanceof Error ? error.message : "Unknown error",
      context: "PRD PDF download failed",
    });
  }
};

export const duplicateDefaultPrdsService = async (ids: string[], userId: string) => {
  try {
    //* Get original prd data
    const originalPrds = await prisma.pRD.findMany({
      where: {
        id: { in: ids },
        userId,
        prdType: "DEFAULT",
      },
      include: {
        defaultTemplate: {
          include: {
            functionalRequirements: {
              select: {
                requirement: true,
              },
            },
            nonFunctionalRequirements: {
              select: {
                requirement: true,
              },
            },
            objectives: {
              select: {
                description: true,
              },
            },
            priorityEffort: {
              select: {
                requirement: true,
                priority: true,
                estimatedEffort: true,
              },
            },
            versionHistory: {
              select: {
                version: true,
                date: true,
                descriptionOfEdit: true,
                editsCompletedBy: true,
              },
            },
            riskAnalysis: {
              select: {
                risk: true,
                mitigation: true,
              },
            },
            conditionCriteria: {
              select: {
                condition: true,
                criteria: true,
              },
            },
            dependencies: {
              select: {
                description: true,
              },
            },
            assumptionsAndConstraints: {
              select: {
                assumption: true,
                constraint: true,
              },
            },
            prdPersonalDetails: {
              select: {
                productTitle: true,
                author: true,
                phoneNumber: true,
                email: true,
                productVisualFileUrl: true,
                address: true,
              },
            },
            stakeholders: {
              select: {
                name: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (originalPrds.length === 0) {
      return {
        success: true,
        duplicatedCount: 0,
        message: "No PRDs found to duplicate",
      };
    }

    // Execute all operations in a single transaction using the callback approach
    const duplicatedPrds = await prisma.$transaction(
      async (tx) => {
        const results = [];

        for (const originalPrd of originalPrds) {
          const { defaultTemplate } = originalPrd;

          if (!defaultTemplate) {
            throw createError(ErrorType.NOT_FOUND, "Default PRD template not found", {
              context: "Failed to find the default PRD template",
            });
          }

          const duplicated = await tx.pRD.create({
            data: {
              userId,
              title: `Copy of ${originalPrd.title}`,
              prdType: "DEFAULT",
              chosenLanguage: originalPrd.chosenLanguage,
              defaultTemplate: {
                create: {
                  //* Clone all template relationships
                  overview: defaultTemplate.overview,

                  functionalRequirements: {
                    create: defaultTemplate.functionalRequirements.map((fr) => ({
                      requirement: fr.requirement,
                    })),
                  },
                  nonFunctionalRequirements: {
                    create: defaultTemplate.nonFunctionalRequirements.map((nfr) => ({
                      requirement: nfr.requirement,
                    })),
                  },
                  objectives: {
                    create: defaultTemplate.objectives.map((obj) => ({
                      description: obj.description,
                    })),
                  },
                  priorityEffort: {
                    create: defaultTemplate.priorityEffort.map((pe) => ({
                      requirement: pe.requirement,
                      priority: pe.priority,
                      estimatedEffort: pe.estimatedEffort,
                    })),
                  },
                  versionHistory: {
                    create: defaultTemplate.versionHistory.map((vh) => ({
                      version: vh.version,
                      date: vh.date,
                      descriptionOfEdit: vh.descriptionOfEdit,
                      editsCompletedBy: vh.editsCompletedBy,
                    })),
                  },
                  riskAnalysis: {
                    create: defaultTemplate.riskAnalysis.map((ra) => ({
                      risk: ra.risk,
                      mitigation: ra.mitigation,
                    })),
                  },
                  conditionCriteria: {
                    create: defaultTemplate.conditionCriteria.map((ac) => ({
                      condition: ac.condition,
                      criteria: ac.criteria,
                    })),
                  },
                  dependencies: {
                    create: defaultTemplate.dependencies.map((d) => ({
                      description: d.description,
                    })),
                  },
                  assumptionsAndConstraints: {
                    create: defaultTemplate.assumptionsAndConstraints.map(
                      ({ assumption, constraint }) => ({
                        assumption,
                        constraint,
                      })
                    ),
                  },
                  prdPersonalDetails: defaultTemplate.prdPersonalDetails
                    ? {
                        create: {
                          productTitle: `Copy of ${defaultTemplate.prdPersonalDetails.productTitle}`,
                          author: defaultTemplate.prdPersonalDetails.author,
                          phoneNumber: defaultTemplate.prdPersonalDetails.phoneNumber,
                          email: defaultTemplate.prdPersonalDetails.email,
                          productVisualFileUrl:
                            defaultTemplate.prdPersonalDetails.productVisualFileUrl,
                          address: defaultTemplate.prdPersonalDetails.address,
                        },
                      }
                    : undefined,
                  stakeholders: {
                    create: defaultTemplate.stakeholders.map((s) => ({
                      name: s.name,
                      role: s.role,
                    })),
                  },
                },
              },
            },
          });

          results.push(duplicated);
        }

        return results;
      },
      { timeout: 30000 }
    ); // Increased timeout for handling multiple duplications

    await invalidatePrdCache(userId);

    return {
      success: true,
      duplicatedCount: duplicatedPrds.length,
      message: `Successfully duplicated ${duplicatedPrds.length} PRD(s)`,
    };
  } catch (error) {
    console.log(error);
    if (error instanceof AppError) throw error;

    throw createError(ErrorType.INTERNAL, "Internal Server Error", {
      originalError: error instanceof Error ? error.message : "Unknown error",
      context: "Failed to duplicate the PRDs",
    });
  }
};

const saveDefaultPRDToDatabase = async (
  aiResponse: AIResponse,
  userId: string,
  stakeholders?: { name: string; role: string }[],
  visualUrl?: string
) => {
  try {
    const {
      Overview,
      ProductObjectives,
      FunctionalRequirements,
      NonFunctionalRequirements,
      AssumptionsAndConstraints,
      Dependencies,
      ConditionAndCriteria,
      RiskAnalysis,
      PriorityAndEffort,
      VersionHistoryAndChangeLog,
    } = aiResponse;

    const prd = await prisma.pRD.create({
      data: {
        userId,
        defaultTemplate: {
          create: {
            overview: Overview,

            prdPersonalDetails: {
              create: {
                productVisualFileUrl: visualUrl,
                productTitle: "",
                author: "",
                phoneNumber: "",
                email: "",
                address: "",
              },
            },

            objectives: {
              create: ProductObjectives.map((objective) => ({
                description: objective,
              })),
            },

            functionalRequirements: {
              create: FunctionalRequirements.map((requirement) => ({
                requirement: requirement,
              })),
            },

            nonFunctionalRequirements: {
              create: NonFunctionalRequirements.map((requirement) => ({
                requirement: requirement,
              })),
            },

            stakeholders: {
              create: stakeholders?.map(({ name, role }) => ({
                name,
                role,
              })),
            },

            assumptionsAndConstraints: {
              create: AssumptionsAndConstraints.map(({ assumption, constraint }) => ({
                assumption,
                constraint,
              })),
            },

            dependencies: {
              create: Dependencies.map((dependency) => ({
                description: dependency,
              })),
            },

            conditionCriteria: {
              create: ConditionAndCriteria.map((ac) => ({
                condition: ac.condition,
                criteria: ac.criteria,
              })),
            },

            riskAnalysis: {
              create: RiskAnalysis.map((risk) => ({
                risk: risk.risk,
                mitigation: risk.mitigation,
              })),
            },

            priorityEffort: {
              create: PriorityAndEffort.map(({ requirement, priority, estimatedEffort }) => ({
                requirement,
                priority,
                estimatedEffort,
              })),
            },

            versionHistory: {
              create: VersionHistoryAndChangeLog.map((vh) => ({
                version: vh.version,
                date: new Date(),
                descriptionOfEdit: vh.changes,
                editsCompletedBy: "AI Assistant",
              })),
            },
          },
        },
      },
      include: {
        defaultTemplate: {
          include: {
            objectives: true,
            prdPersonalDetails: true,
            functionalRequirements: true,
            nonFunctionalRequirements: true,
            stakeholders: true,
            assumptionsAndConstraints: true,
            dependencies: true,
            conditionCriteria: true,
            riskAnalysis: true,
            priorityEffort: true,
            versionHistory: true,
          },
        },
      },
    });

    return {
      success: true,
      data: prd,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to save generated PRD to the database",
    };
  }
};

export const arrangeTheSavedDefaultPrdResponseInTheProperSchemaForTheFrontend = (response: PRD) => {
  const { id, prdType, title, chosenLanguage, defaultTemplate } = response;

  if (!defaultTemplate) {
    throw createError(ErrorType.NOT_FOUND, "Default PRD not found", {
      context: "Failed to find the default PRD",
    });
  }

  return {
    id,
    templateType: prdType,
    title,
    chosenLanguage,
    timeStamp: {
      lastOpenedAt: defaultTemplate.lastOpenedAt,
      createdAt: defaultTemplate.createdAt,
      updatedAt: defaultTemplate.updatedAt,
    },
    formFields: [
      {
        name: "personal details",
        id: defaultTemplate?.prdPersonalDetails?.id,
        fieldType: "personalDetails",
        details: [
          {
            id: 0,
            type: "productTitle",
            label: "product title",
            value: defaultTemplate.prdPersonalDetails?.productTitle,
          },
          {
            id: 1,
            type: "author",
            label: "author",
            value: defaultTemplate.prdPersonalDetails?.author,
          },
          {
            id: 2,
            type: "phoneNumber",
            label: "phone number",
            value: defaultTemplate.prdPersonalDetails?.phoneNumber,
          },
          {
            id: 3,
            type: "email",
            label: "email",
            value: defaultTemplate.prdPersonalDetails?.email,
          },
          {
            id: 4,
            type: "address",
            label: "address",
            value: defaultTemplate.prdPersonalDetails?.address,
          },
        ],
      },
      {
        name: "overview",
        fieldType: "overview",
        details: [
          {
            id: 0,
            label: "overview",
            description: defaultTemplate.overview,
          },
        ],
      },
      {
        name: "product objectives",
        fieldType: "objectives",
        labelPreffix: "objectives",
        details: defaultTemplate.objectives.map((obj) => ({
          id: obj.id,
          description: obj.description,
        })),
      },
      {
        name: "stakeholder identification",
        fieldType: "stakeholders",
        labelPreffix: "stakeholder",
        details: (defaultTemplate.stakeholders ?? []).map((stakeholder) => ({
          id: stakeholder.id,
          name: stakeholder.name,
          role: stakeholder.role,
        })),
      },
      {
        name: "functional requirements",
        fieldType: "functionalRequirements",
        labelPreffix: "requirement",
        details: defaultTemplate.functionalRequirements.map((req) => ({
          id: req.id,
          requirement: req.requirement,
        })),
      },
      {
        name: "non-functional requirements",
        fieldType: "nonFunctionalRequirements",
        labelPreffix: "requirement",
        details: defaultTemplate.nonFunctionalRequirements.map((req) => ({
          id: req.id,
          requirement: req.requirement,
        })),
      },
      {
        name: "assumptions and constraints",
        fieldType: "assumptionsAndConstraints",
        labelPreffix: "requirement",
        details: defaultTemplate.assumptionsAndConstraints.map(
          ({ id, assumption, constraint }) => ({
            id,
            assumption: assumption,
            constraint: constraint,
          })
        ),
      },
      {
        name: "dependencies",
        fieldType: "dependencies",
        details: defaultTemplate.dependencies.map((dep) => ({
          id: dep.id,
          description: dep.description,
        })),
      },
      {
        name: "acceptance criteria",
        fieldType: "acceptanceCriteria",
        labelPreffix: "condition",
        details: defaultTemplate.conditionCriteria.map((ac) => ({
          id: ac.id,
          condition: ac.condition,
          criteria: ac.criteria,
        })),
      },
      {
        name: "risk analysis",
        fieldType: "riskAnalysis",
        labelPreffix: "risk",
        details: defaultTemplate.riskAnalysis.flatMap((risk) => ({
          id: risk.id,
          risk: risk.risk,
          mitigation: risk.mitigation,
        })),
      },
      {
        name: "priority effort",
        fieldType: "priorityEfforts",
        labelPreffix: "priority",
        details: defaultTemplate.priorityEffort.map((pe) => ({
          id: pe.id,
          requirement: pe.requirement,
          priorityLevel: pe.priority,
          estimatedEffortRequired: pe.estimatedEffort,
        })),
      },
      {
        name: "version history",
        fieldType: "versionHistory",
        labelPreffix: "version",
        details: defaultTemplate.versionHistory.map((vh) => ({
          id: vh.id,
          version: vh.version,
          completedBy: vh.editsCompletedBy,
          dateReleased: vh.date,
          changes: vh.descriptionOfEdit,
        })),
      },
    ],
  };
};
