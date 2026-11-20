import { z } from 'zod';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../constants.js';

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Email is too long')
  .pipe(z.email('Enter a valid email address'));

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`);

export const nameSchema = z.string().trim().min(1, 'Name is required').max(80, 'Name is too long');

/** Opaque one-time token (base64url, 32 random bytes → 43 chars). */
export const opaqueTokenSchema = z
  .string()
  .trim()
  .min(20, 'Invalid token')
  .max(200, 'Invalid token')
  .regex(/^[A-Za-z0-9_-]+$/, 'Invalid token');

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  // Do not apply length policy on login: never reveal policy-related info here.
  password: z.string().min(1, 'Password is required').max(PASSWORD_MAX_LENGTH),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const verifyEmailSchema = z.object({ token: opaqueTokenSchema });

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: opaqueTokenSchema,
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required').max(PASSWORD_MAX_LENGTH),
    newPassword: passwordSchema,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    path: ['newPassword'],
    message: 'New password must be different from the current password',
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const updateProfileSchema = z.object({ name: nameSchema });
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
