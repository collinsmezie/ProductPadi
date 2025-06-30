import { z } from "zod";

export const createFolderSchema = z.object({
  name: z
    .string({
      required_error: "Folder name is required",
    })
    .min(1, "Folder name is required"),
  description: z.string({
    required_error: "Folder description is required",
  }),
});

export const getFilesInFolderSchema = z.object({
  id: z.string({
    required_error: "Folder Id is required",
  }),
});

export type createFolderSchemaType = z.infer<typeof createFolderSchema>;

export const addFileToFolderSchema = z.object({
  folderId: z.string({
    required_error: "The folder id is required",
  }),
  prdIds: z.array(z.string()).min(1, {
    message: "At least one PRD file must be selected",
  }),
});

export const folderPaginationSchema = z
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

export const duplicateFoldersSchema = z.object({
  ids: z.array(z.string()).min(1, {
    message: "At least one folder must be selected",
  }),
});

export const deleteFolderByIdSchema = z.object({
  ids: z.array(z.string()).min(1, {
    message: "At least one folder must be selected",
  }),
});
