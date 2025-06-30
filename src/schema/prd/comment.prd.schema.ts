import { z } from "zod";
import { fieldTypes } from "../../types/constants/fieldTypes";

// Supported field types that comments can belong to
export const fieldTypeEnum = z.enum(fieldTypes);

export const createCommentSchema = z.object({
  prdId: z
    .string()
    .min(1, "PRD ID is required")
    .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
      message: "Invalid identifier format",
    }),

  fieldId: z
    .string()
    .min(1, "Field ID is required")
    .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
      message: "Invalid identifier format",
    }),

  fieldType: fieldTypeEnum,

  content: z.string().min(1, "Comment content is required"),
});


export const getAllCommentsForAprdFieldSchema = z.object({
  prdId: z
    .string()
    .min(1, "PRD ID is required")
    .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
      message: "Invalid identifier format",
    }),

  fieldId: z
    .string()
    .min(1, "Field ID is required")
    .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
      message: "Invalid identifier format",
    }),

  fieldType: fieldTypeEnum,
});

export const getAllCommentsForAPrdSchema = z.object({
  id: z
  .string()
  .min(1, "PRD ID is required")
  .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
    message: "Invalid identifier format",
  }),
});