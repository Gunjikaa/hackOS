import { Router } from 'express';
import { loginController, registerController } from './auth.controller.js';
import { requireAuth } from '../../middleware/requireAuth.js';

export const authRouter = Router();

authRouter.post('/register', registerController);
authRouter.post('/login', loginController);

/**
 * GET /api/v1/auth/me
 * Returns the authenticated user's safe profile.
 * Protected by requireAuth middleware — used for session validation and integration tests.
 */
authRouter.get('/me', requireAuth, (req, res) => {
  res.status(200).json({ data: req.user });
});
