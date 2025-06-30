import { z } from "zod";

// File schema for reuse
const fileSchema = z.object({
  originalname: z.string({
    required_error: "File name is required",
  }),
  mimetype: z.string({
    required_error: "MIME type is required",
  }),
  size: z.number({
    required_error: "File size must be a number",
  }),
  buffer: z.instanceof(Buffer, {
    message: "File buffer must be a binary value",
  }),
});

// Stakeholder schema for reuse
const stakeholderSchema = z.object({
  name: z
    .string({
      required_error: "Stakeholder name is required",
    })
    .min(1, "Stakeholder name is required"),
  role: z
    .string({
      required_error: "Stakeholder role is required",
    })
    .min(1, "Stakeholder role is required"),
});

export const generateDefaultPrdFromSurveyBodySchema = z.object({
  step1: z.object({
    "product-type-spec": z.enum(["software product", "non-software product"], {
      required_error: "Product type is required",
      invalid_type_error:
        "Product type must be either 'software product' or 'non-software product'",
    }),
    // "agile-type": z.enum(["traditional", "agile"], {
    //   required_error: "Agile type is required",
    //   invalid_type_error: "Agile type must be either 'traditional' or 'agile'",
    // }),
  }),

  step2: z.object({
    "product-title": z
      .string({
        required_error: "Product title is required",
      })
      .min(1, "Product name is required"),
  }),

  step3: z.object({
    "product-overview": z
      .string({
        required_error: "Product overview is required",
      })
      .min(1, "Product overview is required"),
  }),

  step4: z.object({
    "target-users": z
      .string({
        required_error: "Target users description is required",
      })
      .min(1, "Target users description is required"),
  }),

  step5: z.object({
    "product-problems-description": z
      .string({
        required_error: "Product problems description is required",
      })
      .min(1, "Product problems description is required"),
  }),

  step6: z.object({
    "product-objectives": z
      .string({
        required_error: "Product objectives are required",
      })
      .min(1, "Product objectives are required"),
  }),

  step7: z.object({
    stakeholders: z
      .array(stakeholderSchema, {
        required_error: "Stakeholders are required",
        invalid_type_error: "Stakeholders must be an array",
      })
      .min(1, "At least one stakeholder is required"),
  }),

  // step8: z.object({
  //   "product-visual": fileSchema,
  // }),
});
