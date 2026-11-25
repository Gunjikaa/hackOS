import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/db.js';
import { SESSION_COOKIE_NAME, getClearCookieOptions } from '../modules/auth/auth.service.js';

// Extend Express Request type via declaration merging so req.user is typed globally
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        displayName: string;
      };
    }
  }
}

/**
 * requireAuth — Session authentication middleware.
 *
 * Reads the raw opaque session token from the HTTP-only `hackos_session` cookie,
 * hashes it with SHA-256, and verifies it against the Session table in PostgreSQL.
 *
 * Valid sessions must:
 *   - Exist in the database (not revoked, not expired)
 *   - Belong to an active (non-disabled) user
 *
 * On success: attaches safe user fields (id, email, displayName) to req.user and calls next().
 * On failure: clears the cookie and returns 401 UNAUTHENTICATED.
 * On DB error: propagates to the global error handler (NOT converted to 401).
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const rawToken: unknown = req.cookies?.[SESSION_COOKIE_NAME];

  // 1. Missing or malformed cookie — reject immediately (no DB lookup)
  if (
    typeof rawToken !== 'string' ||
    !/^[a-f0-9]{64}$/i.test(rawToken)
  ) {
    res.clearCookie(SESSION_COOKIE_NAME, getClearCookieOptions());
    res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication required.',
      },
    });
    return;
  }

  // 2. Hash the raw token with SHA-256 (never log or expose the raw token)
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  let session: {
    id: string;
    revokedAt: Date | null;
    expiresAt: Date;
    user: {
      id: string;
      email: string;
      disabledAt: Date | null;
      profile: { displayName: string } | null;
    };
  } | null;

  try {
    session = await prisma.session.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        revokedAt: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            email: true,
            disabledAt: true,
            profile: {
              select: { displayName: true },
            },
          },
        },
      },
    });
  } catch (err) {
    // DB failure — propagate to global error handler; never convert to 401
    next(err);
    return;
  }

  // Helper: clear cookie and return 401
  const clearAndReject = (): void => {
    res.clearCookie(SESSION_COOKIE_NAME, getClearCookieOptions());
    res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' },
    });
  };

  // 3. Session not found in DB
  if (!session) {
    clearAndReject();
    return;
  }

  // 4. Session explicitly revoked
  if (session.revokedAt !== null) {
    clearAndReject();
    return;
  }

  // 5. Session expired
  if (session.expiresAt <= new Date()) {
    clearAndReject();
    return;
  }

  // 6. User account is disabled
  if (session.user.disabledAt !== null) {
    clearAndReject();
    return;
  }

  // 7. Attach safe user info to request — no password hash, no token, no session ID
  req.user = {
    id: session.user.id,
    email: session.user.email,
    displayName: session.user.profile?.displayName ?? '',
  };

  next();
}
