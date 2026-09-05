import { z } from "zod";

/**
 * Shared Zod schemas for the auth flows.
 *
 * `signInSchema` is used by the Credentials provider's `authorize` callback in
 * `src/auth.ts`; `registerSchema` validates the `POST /api/auth/register` body.
 */

export const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(1, "Password is required"),
});

/** Body of `POST /api/auth/resend-verification`. */
export const resendVerificationSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    email: z.email().transform((value) => value.toLowerCase()),
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
