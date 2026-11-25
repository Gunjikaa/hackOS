import { Request, Response, NextFunction } from 'express';
import { loginSchema, registerSchema } from './auth.schema.js';
import { loginUser, registerUser, SESSION_COOKIE_NAME, getSessionCookieOptions } from './auth.service.js';

export async function registerController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate and normalize input fields
    const validatedInput = registerSchema.parse(req.body);

    // Atomically create user and profile with Argon2id password hash
    const safeUser = await registerUser(validatedInput);

    res.status(201).json({
      data: safeUser,
    });
  } catch (error) {
    next(error);
  }
}

export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validate and normalize login input
    const validatedInput = loginSchema.parse(req.body);

    // Verify credentials and create session
    const { rawToken, user } = await loginUser(validatedInput);

    // Set HTTP-only session cookie
    res.cookie(SESSION_COOKIE_NAME, rawToken, getSessionCookieOptions());

    // Return safe user fields only
    res.status(200).json({
      data: user,
    });
  } catch (error) {
    next(error);
  }
}
