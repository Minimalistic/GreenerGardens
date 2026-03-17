import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const RegisterSchema = z.object({
  email: z.string().email(),
  display_name: z.string().min(1).max(100),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const InitialSetupSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  email: z.string().email().optional(),
  display_name: z.string().min(1).max(100).optional(),
});

export const PinSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4-6 digits'),
});

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  display_name: z.string(),
  is_admin: z.boolean(),
  has_pin: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ChangePasswordSchema = z.object({
  current_password: z.string(),
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const UpdateProfileSchema = z.object({
  email: z.string().email().optional(),
  display_name: z.string().min(1).max(100).optional(),
});

export type Login = z.infer<typeof LoginSchema>;
export type Register = z.infer<typeof RegisterSchema>;
export type InitialSetup = z.infer<typeof InitialSetupSchema>;
export type Pin = z.infer<typeof PinSchema>;
export type User = z.infer<typeof UserSchema>;
export const DeleteAccountSchema = z.object({
  password: z.string(),
  confirmation: z.literal('DELETE'),
});

export type ChangePassword = z.infer<typeof ChangePasswordSchema>;
export type UpdateProfile = z.infer<typeof UpdateProfileSchema>;
export type DeleteAccount = z.infer<typeof DeleteAccountSchema>;
