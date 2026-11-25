import http from 'http';
import { createApp } from '../../dist/app.js';
import { prisma } from '../../dist/lib/db.js';
import argon2 from 'argon2';

async function runTests() {
  console.log('--- STARTING FOCUSED USER REGISTRATION TESTS ---');

  const app = createApp();
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server listening on port ${port}`);

  const testEmail = 'alex.rivera.test@college.edu';
  const testInputEmail = '   Alex.Rivera.TEST@College.EDU   ';
  const testPassword = 'Password123!Safe';
  const testDisplayName = '   Alex Rivera   ';

  try {
    // Ensure clean state before test
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });

    // -------------------------------------------------------------
    // Test 1: Successful Registration
    // -------------------------------------------------------------
    console.log('\n[Test 1] Testing successful registration with normalization & Argon2id...');
    const res1 = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testInputEmail,
        password: testPassword,
        displayName: testDisplayName,
        collegeName: 'MIT Engineering',
      }),
    });

    const body1 = await res1.json();
    console.log('Status code:', res1.status);
    console.log('Response body:', JSON.stringify(body1, null, 2));

    if (res1.status !== 201) {
      throw new Error(`Expected HTTP 201, received ${res1.status}`);
    }

    if (!body1.data || !body1.data.id) {
      throw new Error('Response missing user id');
    }

    if (body1.data.email !== testEmail) {
      throw new Error(`Expected normalized email "${testEmail}", got "${body1.data.email}"`);
    }

    if (body1.data.displayName !== 'Alex Rivera') {
      throw new Error(`Expected trimmed displayName "Alex Rivera", got "${body1.data.displayName}"`);
    }

    if (body1.data.passwordHash || body1.data.password_hash) {
      throw new Error('SECURITY VIOLATION: passwordHash was exposed in API response!');
    }

    // -------------------------------------------------------------
    // Test 2: Database State Verification
    // -------------------------------------------------------------
    console.log('\n[Test 2] Verifying database records & Argon2id hash...');
    const dbUser = await prisma.user.findUnique({
      where: { email: testEmail },
      include: { profile: true },
    });

    if (!dbUser) {
      throw new Error('User record was not found in PostgreSQL');
    }

    if (!dbUser.profile) {
      throw new Error('UserProfile record was not atomically created');
    }

    if (dbUser.profile.displayName !== 'Alex Rivera') {
      throw new Error(`DB profile displayName mismatch: ${dbUser.profile.displayName}`);
    }

    if (!dbUser.passwordHash.startsWith('$argon2id$')) {
      throw new Error(`Password was not hashed using Argon2id: ${dbUser.passwordHash}`);
    }

    const passwordMatches = await argon2.verify(dbUser.passwordHash, testPassword);
    if (!passwordMatches) {
      throw new Error('Argon2id verification failed against original password');
    }
    console.log('✓ Argon2id hash verified against original password.');
    console.log('✓ User and UserProfile created atomically.');

    // -------------------------------------------------------------
    // Test 3: Duplicate Email (409 Conflict)
    // -------------------------------------------------------------
    console.log('\n[Test 3] Testing duplicate email rejection (409 Conflict)...');
    const res2 = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: '   ALEX.RIVERA.TEST@college.edu   ', // case variant
        password: 'AnotherPassword456!',
        displayName: 'Alex Duplicate',
      }),
    });

    const body2 = await res2.json();
    console.log('Status code:', res2.status);
    console.log('Response body:', JSON.stringify(body2, null, 2));

    if (res2.status !== 409) {
      throw new Error(`Expected HTTP 409 Conflict, received ${res2.status}`);
    }

    if (body2.error?.code !== 'CONFLICT') {
      throw new Error(`Expected error code CONFLICT, received ${body2.error?.code}`);
    }
    console.log('✓ Duplicate registration correctly rejected with 409 Conflict.');

    // -------------------------------------------------------------
    // Test 4: Zod Validation Failures (400 Bad Request)
    // -------------------------------------------------------------
    console.log('\n[Test 4] Testing Zod validation error handling (400 Bad Request)...');

    // 4a. Short password (< 8 chars)
    const resShortPw = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'valid.email@college.edu',
        password: 'short',
        displayName: 'Valid Name',
      }),
    });
    const bodyShortPw = await resShortPw.json();
    if (resShortPw.status !== 400 || bodyShortPw.error?.code !== 'VALIDATION_ERROR') {
      throw new Error(`Expected 400 VALIDATION_ERROR for short password, got ${resShortPw.status}`);
    }

    // 4b. Invalid email format
    const resBadEmail = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'not-an-email',
        password: 'ValidPassword123!',
        displayName: 'Valid Name',
      }),
    });
    const bodyBadEmail = await resBadEmail.json();
    if (resBadEmail.status !== 400 || bodyBadEmail.error?.code !== 'VALIDATION_ERROR') {
      throw new Error(`Expected 400 VALIDATION_ERROR for bad email, got ${resBadEmail.status}`);
    }

    // 4c. Missing display name
    const resNoName = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'valid.email2@college.edu',
        password: 'ValidPassword123!',
      }),
    });
    const bodyNoName = await resNoName.json();
    if (resNoName.status !== 400 || bodyNoName.error?.code !== 'VALIDATION_ERROR') {
      throw new Error(`Expected 400 VALIDATION_ERROR for missing displayName, got ${resNoName.status}`);
    }
    console.log('✓ Zod validation correctly rejects invalid inputs with 400 VALIDATION_ERROR.');

    // Cleanup test user
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
    console.log('✓ Test data cleaned up.');

    console.log('\n======================================================');
    console.log('✓ ALL TASK 2.1 REGISTRATION TESTS PASSED SUCCESSFULLY!');
    console.log('======================================================');
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
