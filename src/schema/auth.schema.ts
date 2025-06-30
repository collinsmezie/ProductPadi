import { z } from "zod";

export const userRegisterSchema = z.object({
  fullName: z.string({
    required_error: "Full name is required",
  }),
  email: z.string({
    required_error: "Email is required",
  }).email("Invalid email address"),
  password: z.string({
    required_error: "Password is required",
  }).min(8, "Password must be at least 8 characters long"),
});

export const loginSchema = z.object({
  email: z.string({
    required_error: "Email is required",
  }).email("Invalid email address"),
  password: z.string({
    required_error: "Password is required",
  }).min(8, "Password must be at least 8 characters long"),
});

export type UserRegisterInput = z.infer<typeof userRegisterSchema>;
export type LoginInput = z.infer<typeof loginSchema>;