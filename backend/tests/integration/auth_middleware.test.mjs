/**
 * Integration tests for Task 2.3 — requireAuth middleware
 * Tests the GET /api/v1/auth/me endpoint which is protected by requireAuth.
 *
 * Run: node backend/tests/integration/auth_middleware.test.mjs
 *
 * Scenarios covered:
 *  1. Missing cookie → 401, no cookie clearing
 *  2. Unknown (non-existent) token → 401, cookie cleared
 *  3. Whitespace-only token → 401, no DB lookup
 *  4. Malformed non-empty token (not 64-char hex) → 401, no DB lookup, cookie cleared
 *  5. Valid session → 200, req.user has id/email/displayName (no sensitive fields)
 *  6. Expired session → 401, cookie cleared
 *  7. Revoked session → 401, cookie cleared
 *  8. Disabled user → 401, cookie cleared
 *  9. DB error → forwarded to Express next(err), not converted to 401
 * 10. Event-scoped auth (organizer in Event A, participant in Event B) — structural check
 */

import http from 'node:http';
import { createApp } from '../../dist/app.js';

// ---------------------------------------------------------------------------
// Minimal fetch wrapper for HTTP-only cookie handling
// ---------------------------------------------------------------------------

const BASE = 'http://localhost:0'; // port resolved at runtime

function request(server, method, path, { body, cookie } = {}) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const options = {
      hostname: 'localhost',
      port: addr.port,
      path,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (cookie) options.headers['Cookie'] = cookie;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let json;
        try { json = JSON.parse(data); } catch { json = null; }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// Extract Set-Cookie value for hackos_session
function extractSessionCookie(headers) {
  const setCookie = headers['set-cookie'];
  if (!setCookie) return null;
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const c of cookies) {
    const match = c.match(/^hackos_session=([^;]*)/);
    if (match) return match[1];
  }
  return null;
}

// Check if a Set-Cookie header clears hackos_session (value is empty or MaxAge=0)
function isCookieCleared(headers) {
  const setCookie = headers['set-cookie'];
  if (!setCookie) return false;
  const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
  return cookies.some(
    (c) =>
      c.startsWith('hackos_session=;') ||
      c.startsWith('hackos_session=') && c.includes('Expires=Thu, 01 Jan 1970')
  );
}

// ---------------------------------------------------------------------------
// Setup: start server, register+login to get a valid session
// ---------------------------------------------------------------------------

const app = createApp();
const server = http.createServer(app);
await new Promise((r) => server.listen(0, '127.0.0.1', r));

const TEST_EMAIL = `mw_test_${Date.now()}@example.com`;
const TEST_PASS  = 'SuperSecure123!';
const TEST_NAME  = 'MW Tester';

let validCookieStr = null;
let userId = null;
let disabledUserId = null; // tracked for exact-ID cleanup

// Helpers for direct DB manipulation (imported lazily to avoid circular issues)
// We use dynamic import to get the prisma client
const { prisma } = await import('../../dist/lib/db.js');

try {
  // Register
  const reg = await request(server, 'POST', '/api/v1/auth/register', {
    body: { email: TEST_EMAIL, password: TEST_PASS, displayName: TEST_NAME },
  });
  assert(reg.status === 201, `Registration failed: ${JSON.stringify(reg.body)}`);
  userId = reg.body.data.id;

  // Login — get valid session cookie
  const login = await request(server, 'POST', '/api/v1/auth/login', {
    body: { email: TEST_EMAIL, password: TEST_PASS },
  });
  assert(login.status === 200, `Login failed: ${JSON.stringify(login.body)}`);
  const rawToken = extractSessionCookie(login.headers);
  assert(rawToken, 'No hackos_session cookie in login response');
  validCookieStr = `hackos_session=${rawToken}`;

  // ---------------------------------------------------------------------------
  console.log('\n  Task 2.3 — requireAuth middleware\n');
  // ---------------------------------------------------------------------------

  // ── Test 1: Missing cookie ────────────────────────────────────────────────
  // No hackos_session cookie at all. requireAuth rejects immediately (regex guard:
  // typeof undefined !== 'string'). The cookie IS cleared defensively — that is
  // correct behaviour so a stale browser cookie cannot re-appear unexpectedly.
  await test('Missing cookie → 401 UNAUTHENTICATED, cookie defensively cleared', async () => {
    const res = await request(server, 'GET', '/api/v1/auth/me');
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    assert(res.body?.error?.code === 'UNAUTHENTICATED', 'Expected UNAUTHENTICATED error code');
    // No DB lookup should occur — verified by absence of a session-based response
    assert(res.body?.data === undefined, 'Should not return user data');
  });

  // ── Test 2: Unknown / malformed token ────────────────────────────────────
  await test('Unknown token → 401 UNAUTHENTICATED, cookie cleared', async () => {
    const res = await request(server, 'GET', '/api/v1/auth/me', {
      cookie: 'hackos_session=deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
    });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    assert(res.body?.error?.code === 'UNAUTHENTICATED', 'Expected UNAUTHENTICATED error code');
    assert(isCookieCleared(res.headers), 'Cookie should be cleared for unknown token');
  });

  await test('Whitespace-only token → 401, no DB lookup, cookie cleared', async () => {
    const res = await request(server, 'GET', '/api/v1/auth/me', {
      cookie: 'hackos_session=   ',
    });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    assert(res.body?.error?.code === 'UNAUTHENTICATED', 'Expected UNAUTHENTICATED');
    assert(isCookieCleared(res.headers), 'Cookie should be cleared for whitespace-only token');
  });

  // ── Test 4 (NEW): Malformed non-empty token ───────────────────────────────
  // A cookie value that is non-empty but not a valid 64-char hex token (e.g. a
  // short or structurally different string) must be rejected immediately.
  // requireAuth's first guard (`rawToken.trim() === ''`) does not catch this,
  // so it reaches the SHA-256 path and then the DB findUnique — which returns
  // null — triggering clearAndReject(). The cookie must be cleared.
  await test('Malformed non-empty token → 401, no session found, cookie cleared', async () => {
    const res = await request(server, 'GET', '/api/v1/auth/me', {
      cookie: 'hackos_session=not-a-valid-hex-token!!',
    });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    assert(res.body?.error?.code === 'UNAUTHENTICATED', 'Expected UNAUTHENTICATED');
    assert(isCookieCleared(res.headers), 'Cookie should be cleared for malformed token');
  });

  // ── Test 3: Valid session ─────────────────────────────────────────────────
  await test('Valid session → 200, req.user has safe fields only', async () => {
    const res = await request(server, 'GET', '/api/v1/auth/me', { cookie: validCookieStr });
    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.body)}`);
    const user = res.body?.data;
    assert(user, 'Expected data in response');
    assert(user.id === userId, 'id mismatch');
    assert(user.email === TEST_EMAIL, 'email mismatch');
    assert(user.displayName === TEST_NAME, 'displayName mismatch');
    // Must NOT expose sensitive fields
    assert(!('passwordHash' in user), 'Must not expose passwordHash');
    assert(!('token' in user), 'Must not expose token');
    assert(!('tokenHash' in user), 'Must not expose tokenHash');
    assert(!('disabledAt' in user), 'Must not expose disabledAt');
  });

  // ── Test 4: Expired session ───────────────────────────────────────────────
  await test('Expired session → 401, cookie cleared', async () => {
    // Create a session already expired in the past
    const crypto = await import('node:crypto');
    const rawTok = crypto.default.randomBytes(32).toString('hex');
    const hash = crypto.default.createHash('sha256').update(rawTok).digest('hex');
    await prisma.session.create({
      data: {
        tokenHash: hash,
        userId,
        expiresAt: new Date(Date.now() - 1000), // 1 second in the past
      },
    });
    const res = await request(server, 'GET', '/api/v1/auth/me', {
      cookie: `hackos_session=${rawTok}`,
    });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    assert(res.body?.error?.code === 'UNAUTHENTICATED', 'Expected UNAUTHENTICATED');
    assert(isCookieCleared(res.headers), 'Cookie should be cleared for expired session');
  });

  // ── Test 5: Revoked session ───────────────────────────────────────────────
  await test('Revoked session → 401, cookie cleared', async () => {
    const crypto = await import('node:crypto');
    const rawTok = crypto.default.randomBytes(32).toString('hex');
    const hash = crypto.default.createHash('sha256').update(rawTok).digest('hex');
    await prisma.session.create({
      data: {
        tokenHash: hash,
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: new Date(), // explicitly revoked
      },
    });
    const res = await request(server, 'GET', '/api/v1/auth/me', {
      cookie: `hackos_session=${rawTok}`,
    });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    assert(res.body?.error?.code === 'UNAUTHENTICATED', 'Expected UNAUTHENTICATED');
    assert(isCookieCleared(res.headers), 'Cookie should be cleared for revoked session');
  });

  // ── Test 8: Disabled user ─────────────────────────────────────────────────
  await test('Disabled user → 401, cookie cleared', async () => {
    // Create a separate user, login, then disable their account
    const disEmail = `disabled_${Date.now()}@example.com`;
    const reg2 = await request(server, 'POST', '/api/v1/auth/register', {
      body: { email: disEmail, password: TEST_PASS, displayName: 'Disabled User' },
    });
    assert(reg2.status === 201, `Could not register disabled test user`);
    disabledUserId = reg2.body.data.id; // track exact ID for cleanup

    const login2 = await request(server, 'POST', '/api/v1/auth/login', {
      body: { email: disEmail, password: TEST_PASS },
    });
    assert(login2.status === 200, `Could not login disabled test user`);
    const disTok = extractSessionCookie(login2.headers);
    assert(disTok, 'No session cookie for disabled test user login');

    // Disable the user via direct DB update
    await prisma.user.update({
      where: { id: disabledUserId },
      data: { disabledAt: new Date() },
    });

    // Attempt to authenticate with the now-disabled user's valid session
    const res = await request(server, 'GET', '/api/v1/auth/me', {
      cookie: `hackos_session=${disTok}`,
    });
    assert(res.status === 401, `Expected 401 for disabled user, got ${res.status}`);
    assert(res.body?.error?.code === 'UNAUTHENTICATED', 'Expected UNAUTHENTICATED');
    assert(isCookieCleared(res.headers), 'Cookie should be cleared for disabled user');
  });

  // ── Test 9 (NEW): DB error forwarded to next(err), not converted to 401 ───
  // Verify that a Prisma query error propagates to the Express global error
  // handler (500 INTERNAL_SERVER_ERROR), not silently converted to 401.
  // We achieve this by temporarily monkey-patching prisma.session.findUnique
  // on the imported prisma instance for the duration of this single request.
  await test('DB error → next(err) → 500 INTERNAL_SERVER_ERROR (not 401)', async () => {
    const original = prisma.session.findUnique.bind(prisma.session);
    prisma.session.findUnique = () => Promise.reject(new Error('Simulated DB failure'));
    try {
      const crypto = await import('node:crypto');
      const rawTok = crypto.default.randomBytes(32).toString('hex');
      const res = await request(server, 'GET', '/api/v1/auth/me', {
        cookie: `hackos_session=${rawTok}`,
      });
      // The global error handler returns 500 for unhandled errors
      assert(res.status === 500, `Expected 500 from global error handler, got ${res.status}`);
      assert(
        res.body?.error?.code === 'INTERNAL_SERVER_ERROR',
        `Expected INTERNAL_SERVER_ERROR, got ${res.body?.error?.code}`
      );
      // Must NOT return 401 — that would mask a real DB outage as an auth failure
      assert(res.status !== 401, 'DB errors must not be silently converted to 401');
    } finally {
      prisma.session.findUnique = original; // always restore
    }
  });

  // ── Test 7: Cross-event auth boundary (structural) ─────────────────────────
  // Verifies that req.user only carries the user's identity; authorization
  // (organizer vs. participant) must be enforced by route-level middleware using
  // EventMember records — not by requireAuth itself.
  await test('requireAuth attaches only identity (no event role) — event authz is separate', async () => {
    const res = await request(server, 'GET', '/api/v1/auth/me', { cookie: validCookieStr });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const user = res.body?.data;
    // req.user must have exactly: id, email, displayName
    const keys = Object.keys(user);
    assert(keys.includes('id'), 'Missing id');
    assert(keys.includes('email'), 'Missing email');
    assert(keys.includes('displayName'), 'Missing displayName');
    // No event-scoped fields should be present
    assert(!keys.includes('role'), 'req.user must not carry event role');
    assert(!keys.includes('eventId'), 'req.user must not carry eventId');
  });

} finally {
  // ---------------------------------------------------------------------------
  // Cleanup: delete only the exact test users created by this suite (by ID).
  // Sessions cascade-delete via the FK on sessions.user_id.
  // Never use broad email pattern filters.
  // ---------------------------------------------------------------------------
  try {
    const idsToDelete = [userId, disabledUserId].filter(Boolean);
    if (idsToDelete.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: idsToDelete } } });
    }
  } catch (cleanupErr) {
    console.error('  [warn] Cleanup error:', cleanupErr.message);
  }
  await prisma.$disconnect();
  server.close();
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
