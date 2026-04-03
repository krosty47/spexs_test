import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  password: z.string().min(12, 'Password must be at least 12 characters'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

// --- Output Schemas (tRPC procedure return shapes) ---

/** User shape returned in auth responses */
export const authUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.string(),
});

/** Auth response with tokens and user (login, register, refresh) */
export const authOutputSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: authUserSchema,
});

export type AuthOutput = z.infer<typeof authOutputSchema>;

/** User shape from tRPC context (auth.me return) */
export const trpcUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.string(),
});

export type TrpcUserOutput = z.infer<typeof trpcUserSchema>;
