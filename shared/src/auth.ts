import { z } from 'zod';

/** User data that is safe to send to the client (never includes the password hash). */
export interface PublicUser {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export const PASSWORD_MIN_LENGTH = 8;
/** Upper bound prevents very large inputs from being fed to the password hasher. */
export const PASSWORD_MAX_LENGTH = 128;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'Email is too long')
  .pipe(z.email('Enter a valid email address'));

const name = z.string().trim().min(1, 'Name is required').max(100, 'Name is too long');

/** Rules for choosing a password (signup, change password). */
const newPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`);

/** An existing password typed to confirm an action. Not checked against the rules above. */
const currentPassword = (message: string) => z.string().min(1, message).max(PASSWORD_MAX_LENGTH);

export const signupSchema = z.object({
  name,
  email,
  password: newPassword,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required').max(PASSWORD_MAX_LENGTH),
});

/**
 * PATCH /api/auth/me. Send the fields to change. Changing the email also
 * requires `currentPassword`; the server checks that, since only it knows
 * whether the email actually changed.
 */
export const updateProfileSchema = z
  .object({
    name: name.optional(),
    email: email.optional(),
    currentPassword: z.string().max(PASSWORD_MAX_LENGTH).optional(),
  })
  .refine((v) => v.name !== undefined || v.email !== undefined, { message: 'Nothing to update' });

export const changePasswordSchema = z.object({
  currentPassword: currentPassword('Enter your current password'),
  newPassword,
});

export const deleteAccountSchema = z.object({
  password: currentPassword('Enter your password to confirm'),
});

/** A signed-in browser or device, as listed on the Account page. */
export interface SessionInfo {
  /** Opaque id for revoking this session (not the session token). */
  id: string;
  /** e.g. "Chrome on macOS". */
  device: string;
  /** True for the session making the request. */
  current: boolean;
  /** When this device logged in. */
  createdAt: string;
  /** Last request from this device (updated at most every few minutes). */
  lastActiveAt: string;
}

export type SignupInput = z.input<typeof signupSchema>;
export type LoginInput = z.input<typeof loginSchema>;
export type UpdateProfileInput = z.input<typeof updateProfileSchema>;
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;
export type DeleteAccountInput = z.input<typeof deleteAccountSchema>;
