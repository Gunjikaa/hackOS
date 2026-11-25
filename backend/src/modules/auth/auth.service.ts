import crypto from 'node:crypto';
import argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db.js';
import { AppError } from '../../middleware/errorHandler.js';
import { RegisterInput, SafeUser, LoginInput, LoginResponseUser } from './auth.schema.js';

export const SESSION_COOKIE_NAME = 'hackos_session';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface LoginResult {
  rawToken: string;
  user: LoginResponseUser;
}

export async function registerUser(input: RegisterInput): Promise<SafeUser> {
  const { email, password, displayName, collegeName } = input;

  // 1. Check for existing user with normalized email
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser) {
    throw new AppError({
      code: 'CONFLICT',
      statusCode: 409,
      message: 'An account with this email address already exists.',
    });
  }

  // 2. Hash password with Argon2id
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,       // 3 iterations
    parallelism: 4,    // 4 threads
  });

  // 3. Atomically create User and UserProfile in a transaction
  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        profile: {
          create: {
            displayName,
            collegeName: collegeName ?? null,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    // 4. Return safe user fields only (never expose passwordHash)
    return {
      id: user.id,
      email: user.email,
      displayName: user.profile?.displayName ?? displayName,
      createdAt: user.createdAt,
    };
  } catch (error) {
    // Handle database unique constraint violation if concurrent registration races
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError({
        code: 'CONFLICT',
        statusCode: 409,
        message: 'An account with this email address already exists.',
      });
    }
    throw error;
  }
}

export async function loginUser(input: LoginInput): Promise<LoginResult> {
  const { email, password } = input;

  const invalidCredentialsError = new AppError({
    code: 'INVALID_CREDENTIALS',
    statusCode: 401,
    message: 'Invalid email or password.',
  });

  // 1. Find user by normalized email
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      profile: true,
    },
  });

  if (!user) {
    throw invalidCredentialsError;
  }

  // 2. Verify password using Argon2id
  const passwordMatches = await argon2.verify(user.passwordHash, password);
  if (!passwordMatches) {
    throw invalidCredentialsError;
  }

  // 3. Reject deactivated accounts with same generic error
  if (user.disabledAt !== null) {
    throw invalidCredentialsError;
  }

  // 4. Generate cryptographically secure 32-byte random session token
  const rawToken = crypto.randomBytes(32).toString('hex');

  // 5. Compute SHA-256 hash to store in DB
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  // 6. Create session record in PostgreSQL
  await prisma.session.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt,
    },
  });

  // 7. Return raw token (for cookie) and safe user fields
  return {
    rawToken,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.profile?.displayName ?? '',
    },
  };
}
