import { Request, Response, NextFunction } from "express";
import { createError } from "../utils/error.utils";
import { ErrorType } from "../types/errors.types";
import { z } from "zod";

interface UpdatedRequest extends Request {
  dirty?: any;
  files?: any;
}

function attachFilesToNestedBody(body: any, files: any[]) {
  files.forEach((file: any) => {
    const keys = file.fieldname.split(".");
    let current = body;

    //* If it's a single segment field name and the value is meant to be an array
    if (keys.length === 1 && Array.isArray(current[keys[0]])) {
      current[keys[0]].push({
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      });
      return;
    }

    //* Handle nested paths
    keys.forEach((key: any, index: number) => {
      if (index === keys.length - 1) {
        //* Check if the current value is an array
        if (Array.isArray(current[key])) {
          current[key].push({
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            buffer: file.buffer,
          });
        } 
        //* Check if it's already an object with other properties
        else if (typeof current[key] === "object" && current[key] !== null) {
          current[key]["file"] = {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            buffer: file.buffer,
          };
        } 
        //* Direct assignment
        else {
          current[key] = {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            buffer: file.buffer,
          };
        }
      } else {
        if (!current[key]) {
          current[key] = {};
        }
        current = current[key];
      }
    });
  });
}

function validator(schema: z.ZodSchema, path: "body" | "query" | "params" = "body") {
  return async function (req: UpdatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const contentType = req.headers["content-type"] || "";
      let requestData;
      
      // Select the appropriate request data based on path
      if (path === "body") {
        requestData = req.body;
      } else if (path === "query") {
        requestData = req.query;
      } else if (path === "params") {
        requestData = req.params;
      }


      // Handle multipart/form-data for body validation only
      if (path === "body" && contentType.startsWith("multipart/form-data")) {
        const parsedBody: Record<string, any> = {};

        if (req.body) {
          Object.keys(req.body).forEach((key) => {
            try {
              parsedBody[key] = JSON.parse(req.body[key]);
            } catch {
              parsedBody[key] = req.body[key];
            }
          });
        }

        if (req.files && Array.isArray(req.files)) {
          //* Initialize arrays for fields that should be arrays based on the schema
          if (schema instanceof z.ZodObject) {
            const schemaShape = (schema as any)._def.shape();
            Object.entries(schemaShape).forEach(([key, value]: [string, any]) => {
              if (value instanceof z.ZodArray) {
                parsedBody[key] = parsedBody[key] || [];
              }
            });
          }
          
          attachFilesToNestedBody(parsedBody, req.files);
        }

        requestData = parsedBody;
      }

      const validatedData = await schema.parseAsync(requestData);
      
      // Store the validated data only in the appropriate part of the request
      if (path === "body") {
        req.dirty = req.body; // Save original body
        req.body = validatedData;
      } else if (path === "query") {
        req.query = validatedData;
      } else if (path === "params") {
        req.params = validatedData;
      }

      // console.log(`${path} after validation:`, path === "body" ? req.body : (path === "query" ? req.query : req.params));
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return next(
          createError(ErrorType.VALIDATION, error.errors[0].message, {
            originalError: error.errors[0].message,
            path: error.errors.map(err => ({
              message: err.message,
              path: err.path,
              code: err.code,
            }))
          })
        );
      }

      return next(
        createError(ErrorType.VALIDATION, "Validation Failed", {
          originalError: error instanceof Error ? error.message : "Unknown error",
        })
      );
    }
  };
}

export default validator;