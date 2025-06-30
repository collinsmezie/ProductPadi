import { z } from "zod";

// Error message constants
const REQUIRED_ERROR = "This field is required";
const INVALID_EMAIL = "Please enter a valid email address";
const INVALID_DATE = "Please enter a valid date format (YYYY-MM-DD)";
const INVALID_PRIORITY = "Priority must be High, Medium, or Low";

// Create schemas with custom error messages
const createFunctionalRequirementSchema = z.array(z.string({ required_error: REQUIRED_ERROR }));

const createNonFunctionalRequirementSchema = z.array(z.string({ required_error: REQUIRED_ERROR }));

const createObjectiveSchema = z.array(z.string({ required_error: REQUIRED_ERROR }));

const createAssumptionAndConstraints = z.array(
  z.object({
    assumption: z.string({ required_error: REQUIRED_ERROR }),
    constraint: z.string({ required_error: REQUIRED_ERROR }),
  })
);

const createDependencySchema = z.array(z.string({ required_error: REQUIRED_ERROR }));

const createConditionCriteriaSchema = z.object({
  condition: z.string({ required_error: REQUIRED_ERROR }),
  criteria: z.string({ required_error: REQUIRED_ERROR }),
});

const createRiskAnalysisSchema = z.array(
  z.object({
    risk: z.string({ required_error: REQUIRED_ERROR }),
    mitigation: z.string({ required_error: REQUIRED_ERROR }),
  })
);

const createPriorityEffortSchema = z.array(
  z.object({
    requirement: z.string({ required_error: REQUIRED_ERROR }),
    priority: z.enum(["High", "Medium", "Low"], {
      required_error: REQUIRED_ERROR,
      invalid_type_error: INVALID_PRIORITY,
    }),
    estimatedEffort: z.string({ required_error: REQUIRED_ERROR }),
  })
);

const createVersionHistorySchema = z.array(
  z.object({
    version: z.string({ required_error: REQUIRED_ERROR }),
    date: z.string({ required_error: REQUIRED_ERROR }).refine((val) => !isNaN(Date.parse(val)), {
      message: INVALID_DATE,
    }),
    descriptionOfEdit: z.array(z.string({ required_error: REQUIRED_ERROR })),
    editsCompletedBy: z.string({ required_error: REQUIRED_ERROR }),
  })
);

const createStakeholdersSchema = z.array(
  z.object({
    name: z.string({ required_error: REQUIRED_ERROR }),
    role: z.string({ required_error: REQUIRED_ERROR }),
  })
);

// Update schemas with error messages
const updateRequirementItemSchema = z.object({
  id: z.string({ required_error: "Item ID is required" }),
  requirement: z.string({ required_error: "New value is required" }),
});

const updateDescriptionItemSchema = z.object({
  id: z.string({ required_error: "Item ID is required" }),
  description: z.string({ required_error: "New value is required" }),
});

const updateFunctionalRequirementSchema = z.array(updateRequirementItemSchema);
const updateNonFunctionalRequirementSchema = z.array(updateRequirementItemSchema);
const updateObjectiveSchema = z.array(updateDescriptionItemSchema);

const updateAssumptionsAndConstraints = z.array(
  z.object({
    id: z.string({ required_error: "Item ID is required" }),
    new: z.object({
      assumption: z.string().optional(),
      constraint: z.string().optional(),
    }),
  })
);

const updateDependencySchema = z.array(updateDescriptionItemSchema);

const updateConditionCriteriaSchema = z.array(
  z.object({
    id: z.string({ required_error: "Item ID is required" }),
    condition: z.string({ required_error: REQUIRED_ERROR }).optional(),
    criteria: z.string({ required_error: REQUIRED_ERROR }).optional(),
  })
);

const updateRiskAnalysisSchema = z.array(
  z.object({
    id: z.string({ required_error: "Item ID is required" }),
    risk: z.string().optional(),
    mitigation: z.string().optional(),
  })
);

const updatePriorityEffortSchema = z.array(
  z.object({
    id: z.string({ required_error: "Item ID is required" }),
    requirement: z.string().optional(),
    priority: z
      .enum(["High", "Medium", "Low"], {
        invalid_type_error: INVALID_PRIORITY,
      })
      .optional(),
    estimatedEffort: z.string().optional(),
  })
);

const updateVersionHistorySchema = z.array(
  z.object({
    id: z.string({ required_error: "Item ID is required" }),
    version: z.string().optional(),
    date: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: INVALID_DATE,
      })
      .optional(),
    descriptionOfEdit: z.array(z.string()).optional(),
    editsCompletedBy: z.string().optional(),
  })
);

const updateStakeholdersSchema = z.array(
  z.object({
    id: z.string({ required_error: "Item ID is required" }),
    name: z.string().optional(),
    role: z.string().optional(),
  })
);

const updatePersonalDetailsSchema = z.object({
  id: z.string({ required_error: "Item ID is required" }),
  productTitle: z.string().optional(),
  author: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email({ message: INVALID_EMAIL }).optional(),
  address: z.string().optional(),
});

// Delete schemas
const deleteIdsSchema = z.array(z.string({ required_error: "Item ID is required for deletion" }));

// Main schema with custom error messaging
export const updateDefaultPrdBodySchema = z
  .object({
    create: z
      .object({
        functionalRequirements: createFunctionalRequirementSchema.optional(),
        nonFunctionalRequirements: createNonFunctionalRequirementSchema.optional(),
        objectives: createObjectiveSchema.optional(),
        assumptionAndConstraints: createAssumptionAndConstraints.optional(),
        dependencies: createDependencySchema.optional(),
        conditionCriteria: createConditionCriteriaSchema.optional(),
        riskAnalysis: createRiskAnalysisSchema.optional(),
        priorityEffort: createPriorityEffortSchema.optional(),
        versionHistory: createVersionHistorySchema.optional(),
        stakeholders: createStakeholdersSchema.optional(),
      })
      .optional(),
    update: z
      .object({
        title: z.string().optional(),
        functionalRequirements: updateFunctionalRequirementSchema.optional(),
        nonFunctionalRequirements: updateNonFunctionalRequirementSchema.optional(),
        objectives: updateObjectiveSchema.optional(),
        assumptionAndConstraints: updateAssumptionsAndConstraints.optional(),
        dependencies: updateDependencySchema.optional(),
        conditionCriteria: updateConditionCriteriaSchema.optional(),
        riskAnalysis: updateRiskAnalysisSchema.optional(),
        priorityEffort: updatePriorityEffortSchema.optional(),
        versionHistory: updateVersionHistorySchema.optional(),
        stakeholders: updateStakeholdersSchema.optional(),
        personalDetails: updatePersonalDetailsSchema.optional(),
      })
      .optional(),
    delete: z
      .object({
        functionalRequirements: deleteIdsSchema.optional(),
        nonFunctionalRequirements: deleteIdsSchema.optional(),
        objectives: deleteIdsSchema.optional(),
        assumptionAndConstraints: deleteIdsSchema.optional(),
        dependencies: deleteIdsSchema.optional(),
        conditionCriteria: deleteIdsSchema.optional(),
        riskAnalysis: deleteIdsSchema.optional(),
        priorityEffort: deleteIdsSchema.optional(),
        versionHistory: deleteIdsSchema.optional(),
        stakeholders: deleteIdsSchema.optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    // Ensure at least one operation is provided
    if (!data.create && !data.update && !data.delete) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one operation (create, update, or delete) must be provided",
        path: [],
      });
    }
  });
