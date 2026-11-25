import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .pipe(
      z
        .string()
        .email('Invalid email address')
        .max(255, 'Email cannot exceed 255 characters')
    ),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters'),
  displayName: z
    .string({ required_error: 'Display name is required' })
    .trim()
    .min(2, 'Display name must be at least 2 characters')
    .max(100, 'Display name cannot exceed 100 characters'),
  collegeName: z
    .string()
    .trim()
    .max(150, 'College name cannot exceed 150 characters')
    .optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export interface SafeUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
}
