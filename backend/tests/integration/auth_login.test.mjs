import http from 'http';
import crypto from 'node:crypto';
import argon2 from 'argon2';
import { createApp } from '../../dist/app.js';
import { prisma } from '../../dist/lib/db.js';

async function runTests() {
  console.log('--- STARTING FOCUSED LOGIN & SESSION INTEGRATION TESTS ---');

  const app = createApp();
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server listening on port ${port}`);

  const testEmail = 'jordan.login.test@college.edu';
  const testPassword = 'MySecretPassword2026!';
  const testDisplayName = 'Jordan Lee';

  try {
    // -------------------------------------------------------------
    // Setup: Ensure clean slate & seed a known user
    // -------------------------------------------------------------
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });

    const passwordHash = await argon2.hash(testPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    const seededUser = await prisma.user.create({
      data: {
        email: testEmail,
        passwordHash,
        profile: {
          create: {
            displayName: testDisplayName,
            collegeName: 'Stanford Engineering',
          },
        },
      },
      include: { profile: true },
    });
    console.log(`✓ Seeded test user ${seededUser.email} with Argon2id hash.`);

    // -------------------------------------------------------------
    // Test 1: Successful Login
    // -------------------------------------------------------------
    console.log('\n[Test 1] Testing successful login with email normalization...');
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: '   JORDAN.login.TEST@College.EDU   ', // un-normalized casing and spacing
        password: testPassword,
      }),
    });

    const loginBody = await loginRes.json();
    console.log('Status code:', loginRes.status);
    console.log('Response body:', JSON.stringify(loginBody, null, 2));

    if (loginRes.status !== 200) {
      throw new Error(`Expected HTTP 200, received ${loginRes.status}`);
    }

    if (!loginBody.data || loginBody.data.id !== seededUser.id) {
      throw new Error('Response data missing or user ID mismatch');
    }

    if (loginBody.data.email !== testEmail) {
      throw new Error(`Expected email "${testEmail}", got "${loginBody.data.email}"`);
    }

    if (loginBody.data.displayName !== testDisplayName) {
      throw new Error(`Expected displayName "${testDisplayName}", got "${loginBody.data.displayName}"`);
    }

    // Ensure sensitive fields are NEVER returned
    if (loginBody.data.passwordHash || loginBody.data.password_hash || loginBody.data.rawToken || loginBody.data.token) {
      throw new Error('SECURITY VIOLATION: Sensitive hash or token exposed in response body!');
    }
    console.log('✓ Response contains safe user fields only (id, email, displayName).');

    // -------------------------------------------------------------
    // Test 2: Cookie Attributes Verification
    // -------------------------------------------------------------
    console.log('\n[Test 2] Verifying Set-Cookie header attributes...');
    const setCookieHeader = loginRes.headers.get('set-cookie');
    console.log('Set-Cookie:', setCookieHeader);

    if (!setCookieHeader) {
      throw new Error('Expected Set-Cookie header on successful login');
    }

    if (!setCookieHeader.includes('hackos_session=')) {
      throw new Error('Cookie must be named hackos_session');
    }

    if (!setCookieHeader.toLowerCase().includes('httponly')) {
      throw new Error('Cookie must have HttpOnly flag');
    }

    if (!setCookieHeader.toLowerCase().includes('path=/')) {
      throw new Error('Cookie must have Path=/');
    }

    if (!setCookieHeader.toLowerCase().includes('samesite=lax')) {
      throw new Error('Cookie must have SameSite=Lax');
    }

    if (!setCookieHeader.toLowerCase().includes('max-age=604800')) {
      throw new Error('Cookie must have Max-Age=604800 (7 days)');
    }
    console.log('✓ Cookie attributes verified (HttpOnly, SameSite=Lax, Path=/, Max-Age=7 days).');

    // -------------------------------------------------------------
    // Test 3: Session SHA-256 Hash Stored in Database
    // -------------------------------------------------------------
    console.log('\n[Test 3] Verifying session token hash in PostgreSQL...');
    const cookieMatch = setCookieHeader.match(/hackos_session=([a-f0-9]+);/i);
    if (!cookieMatch) {
      throw new Error('Failed to parse raw session token from Set-Cookie header');
    }
    const rawToken = cookieMatch[1];
    if (rawToken.length !== 64) {
      throw new Error(`Expected 64-char hex token (32 bytes), received length ${rawToken.length}`);
    }

    const expectedTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const dbSession = await prisma.session.findUnique({
      where: { tokenHash: expectedTokenHash },
    });

    if (!dbSession) {
      throw new Error('Session record not found in PostgreSQL by SHA-256 token hash');
    }

    if (dbSession.userId !== seededUser.id) {
      throw new Error(`Session userId ${dbSession.userId} does not match seeded user ${seededUser.id}`);
    }

    if (dbSession.revokedAt !== null) {
      throw new Error('New session should have revokedAt === null');
    }

    if (new Date(dbSession.expiresAt).getTime() <= Date.now()) {
      throw new Error('Session expiration timestamp must be in the future');
    }
    console.log('✓ Raw token is not stored; SHA-256 hash verified in PostgreSQL session store.');

    // -------------------------------------------------------------
    // Test 4: Wrong Password Rejection (401 INVALID_CREDENTIALS)
    // -------------------------------------------------------------
    console.log('\n[Test 4] Testing wrong password rejection (401 INVALID_CREDENTIALS)...');
    const wrongPwRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'IncorrectPassword999!',
      }),
    });

    const wrongPwBody = await wrongPwRes.json();
    console.log('Status code:', wrongPwRes.status);
    console.log('Response body:', JSON.stringify(wrongPwBody, null, 2));

    if (wrongPwRes.status !== 401) {
      throw new Error(`Expected HTTP 401, received ${wrongPwRes.status}`);
    }
    if (wrongPwBody.error?.code !== 'INVALID_CREDENTIALS') {
      throw new Error(`Expected INVALID_CREDENTIALS, got ${wrongPwBody.error?.code}`);
    }
    if (wrongPwRes.headers.get('set-cookie')) {
      throw new Error('Failed login must not issue a session cookie');
    }
    console.log('✓ Wrong password rejected with generic 401 INVALID_CREDENTIALS.');

    // -------------------------------------------------------------
    // Test 5: Unknown Email Rejection (401 INVALID_CREDENTIALS)
    // -------------------------------------------------------------
    console.log('\n[Test 5] Testing unknown email rejection (401 INVALID_CREDENTIALS)...');
    const unknownRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent.user@college.edu',
        password: testPassword,
      }),
    });

    const unknownBody = await unknownRes.json();
    if (unknownRes.status !== 401 || unknownBody.error?.code !== 'INVALID_CREDENTIALS') {
      throw new Error(`Expected 401 INVALID_CREDENTIALS for unknown user, got ${unknownRes.status}`);
    }
    if (unknownBody.error?.message !== wrongPwBody.error?.message) {
      throw new Error('Error message must be identical for unknown email and wrong password');
    }
    console.log('✓ Unknown email rejected with identical generic 401 INVALID_CREDENTIALS.');

    // -------------------------------------------------------------
    // Test 6: Disabled Account Rejection (401 INVALID_CREDENTIALS)
    // -------------------------------------------------------------
    console.log('\n[Test 6] Testing deactivated account rejection (401 INVALID_CREDENTIALS)...');
    await prisma.user.update({
      where: { id: seededUser.id },
      data: { disabledAt: new Date() },
    });

    const disabledRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });

    const disabledBody = await disabledRes.json();
    if (disabledRes.status !== 401 || disabledBody.error?.code !== 'INVALID_CREDENTIALS') {
      throw new Error(`Expected 401 INVALID_CREDENTIALS for disabled user, got ${disabledRes.status}`);
    }
    if (disabledBody.error?.message !== wrongPwBody.error?.message) {
      throw new Error('Error message must be identical for disabled account to avoid enumeration');
    }
    console.log('✓ Deactivated account rejected with identical generic 401 INVALID_CREDENTIALS.');

    // -------------------------------------------------------------
    // Test 7: Missing / Invalid Inputs (400 VALIDATION_ERROR)
    // -------------------------------------------------------------
    console.log('\n[Test 7] Testing validation errors (400 VALIDATION_ERROR)...');
    const badInputRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid-email-string',
        password: '',
      }),
    });

    const badInputBody = await badInputRes.json();
    if (badInputRes.status !== 400 || badInputBody.error?.code !== 'VALIDATION_ERROR') {
      throw new Error(`Expected 400 VALIDATION_ERROR, got ${badInputRes.status}`);
    }
    console.log('✓ Missing/invalid inputs rejected with 400 VALIDATION_ERROR.');

    console.log('\n======================================================');
    console.log('✓ ALL TASK 2.2 LOGIN & SESSION TESTS PASSED SUCCESSFULLY!');
    console.log('======================================================');
  } finally {
    console.log('\n[Cleanup] Cleaning up test data...');
    try {
      await prisma.user.deleteMany({
        where: { email: testEmail },
      });
      console.log('✓ Test user and cascaded sessions removed from database.');
    } catch (e) {
      console.warn('Cleanup error:', e);
    }
    server.close();
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
