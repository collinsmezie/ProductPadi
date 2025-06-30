import { z } from "zod";

// Params Schema for getting PRD
export const defaultPrdPaginationSchema = z
  .object({
    page: z.string().optional(),
    size: z.string().optional(),
  })
  .refine(
    (data) => {
      // If one pagination parameter is provided, both must be provided
      if (data.page || data.size) {
        return Boolean(data.page) && Boolean(data.size);
      }
      return true;
    },
    {
      message: "Both page and size must be provided for pagination",
    }
  );

export const getPrdByIdSchema = z.object({
  id: z.string({
    required_error: "PRD ID is required",
  }),
});

export const downloadPRDSchema = z.object({
  id: z.string({
    required_error: "PRD ID is required",
  }),
});

export const duplicatePrdsSchema = z.object({
  ids: z.array(z.string()).min(1, {
    message: "At least one folder must be selected",
  }),
});

export const deletePrdsByIdSchema = z.object({
  ids: z.array(z.string()).min(1, {
    message: "At least one PRD file must be selected",
  }),
});

export const updateDefaultPrdParamSchema = z.object({
  id: z.string({
    required_error: "PRD ID is required",
  }),
});


