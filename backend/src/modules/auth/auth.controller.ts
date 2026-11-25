import { Request, Response, NextFunction } from 'express';
import { registerSchema } from './auth.schema.js';
import { registerUser } from './auth.service.js';

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
