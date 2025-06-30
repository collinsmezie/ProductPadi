import { z } from "zod";

// Base schema for share permissions
const sharePermissionEnum = z.enum(["VIEW", "EDIT"]);

// Schema for sharing a PRD by email
export const sharePrdByEmailSchema = z.object({
  prdId: z
    .string()
    .min(1, "PRD ID is required")
    .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
      message: "Invalid ID format",
    }),
  email: z.string().email("Invalid email address format").min(1, "Email is required"),
  permission: sharePermissionEnum.default("VIEW"),
});

// Schema for updating an existing share
export const updatePrdShareSchema = z.object({
  shareId: z
    .string()
    .min(1, "Share ID is required")
    .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
      message: "Invalid ID format",
    }),
  permission: sharePermissionEnum,
  //   isActive: z.boolean().optional(),
});

// Schema for revoking/deleting a share
export const revokePrdShareSchema = z.object({
  shareId: z
    .string()
    .min(1, "Share ID is required")
    .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
      message: "Invalid MongoDB ObjectId format",
    }),
});

// Schema for toggling public access to a PRD
export const togglePrdPublicAccessSchema = z.object({
  prdId: z
    .string()
    .min(1, "PRD ID is required")
    .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
      message: "Invalid MongoDB ObjectId format",
    }),
  isPublic: z.boolean(),
});
