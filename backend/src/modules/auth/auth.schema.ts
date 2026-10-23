import { toLowerCase, z } from "zod";

export const signUpSchema = z.object({
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(50),

  lastName: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .max(50),

  email: z
    .string()
    .email("Invalid email address")
    .transform((email) => email.toLowerCase().trim()),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email("Invalid email address")
    .transform((email) => email.toLowerCase().trim()),

  password: z.string().min(1, "Password is required"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const userSelfUpdateSchema = z.object({
  firstName: z
    .string().trim()
    .min(2, "First name must be at least 2 characters")
    .max(50)
    .optional(),

  lastName: z
    .string().trim()
    .min(2, "Last name must be at least 2 characters")
    .max(50)
    .optional(),

  bio: z.string().trim().max(300).nullable().optional(),
  avatarUrl: z.url().nullable().optional()
}).strict()

export const userSendEmailVerificationSchema = z.object({
  email: z
  .string()
  .email()
  .transform((email)=> email.toLowerCase().trim())
})

export const userEmailVerificationTokenSchema = z.object({
  token: z.string().min(1,"Token is required")
})