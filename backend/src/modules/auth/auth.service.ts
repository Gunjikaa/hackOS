import argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db.js';
import { AppError } from '../../middleware/errorHandler.js';
import { RegisterInput, SafeUser } from './auth.schema.js';

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
