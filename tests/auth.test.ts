import { createHmac, generateKeyPairSync, sign } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { testDatabase } from './d1-test-helper';

const runtime = vi.hoisted(() => ({ env: {} as Record<string, unknown> }));
vi.mock('@/lib/server/runtime', () => ({ getEnv: () => runtime.env }));
import { getAuth } from '@/lib/server/auth';
import type { RuntimeEnv } from '@/lib/server/runtime';
import { requireActor } from '@/lib/server/session';
import { GET as authRouteGET, POST as authRoutePOST } from '@/app/api/auth/[...all]/route';
import { safeReturnPath } from '@/lib/auth-client';

const origin = 'http://localhost:3000';
const email = 'fresh-google-student@example.test';
const secret = 'synthetic-only-auth-secret-at-least-thirty-two-characters';
const clientId = 'synthetic-google-client-id';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const googleKey = { ...publicKey.export({ format: 'jwk' }), kid: 'synthetic-google-key', alg: 'RS256', use: 'sig' };
function cookies(response: Response) {
  return response.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
}
function signedIdToken(verified = true) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: googleKey.kid, typ: 'JWT' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({ iss: 'https://accounts.google.com', aud: clientId, sub: 'google-student-subject', email, email_verified: verified, name: 'Google Student', iat: now, exp: now + 3600 })).toString('base64url');
  const payload = `${header}.${claims}`;
  return `${payload}.${Buffer.from(sign('RSA-SHA256', Buffer.from(payload), privateKey)).toString('base64url')}`;
}
function mockGoogle(verified = true) {
  const requests: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    requests.push(url);
    if (url === 'https://oauth2.googleapis.com/token') {
      const body = new URLSearchParams(String(init?.body));
      expect(body.get('grant_type')).toBe('authorization_code');
      expect(body.get('code_verifier')).toBeTruthy();
      return Response.json({ access_token: 'synthetic-google-access-token', token_type: 'Bearer', expires_in: 3600, scope: 'openid email profile', id_token: signedIdToken(verified) });
    }
    if (url === 'https://www.googleapis.com/oauth2/v3/certs') return Response.json({ keys: [googleKey] });
    throw new Error(`Unexpected external test request: ${url}`);
  }));
  return requests;
}
function authFixture(configured = true) {
  const fixture = testDatabase();
  const env = { DB: fixture.db, APP_ORIGIN: origin, BETTER_AUTH_SECRET: secret,
    ...(configured ? { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: 'synthetic-google-client-secret' } : {}),
  } as RuntimeEnv;
  runtime.env = env as unknown as Record<string, unknown>;
  const auth = getAuth(env);
  const request = (path: string, body?: unknown, cookie?: string) => new Request(`${origin}/api/auth${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Origin: origin, 'cf-connecting-ip': '192.0.2.1', 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const call = (path: string, body?: unknown, cookie?: string) => auth.handler(request(path, body, cookie));
  async function start(callbackURL = `${origin}/dashboard`) {
    const response = await call('/sign-in/social', { provider: 'google', callbackURL, disableRedirect: true });
    expect(response.status, await response.clone().text()).toBe(200);
    const data = await response.json() as { url: string };
    const url = new URL(data.url);
    expect(url.origin).toBe('https://accounts.google.com');
    expect(url.searchParams.get('prompt')).toBe('select_account');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('redirect_uri')).toBe(`${origin}/api/auth/callback/google`);
    return { state: url.searchParams.get('state')!, cookie: cookies(response) };
  }
  const callback = (state: string, cookie?: string) => call(`/callback/google?code=synthetic-code&state=${encodeURIComponent(state)}`, undefined, cookie);
  return { ...fixture, auth, request, call, start, callback };
}
afterEach(() => { vi.unstubAllGlobals(); });

describe('Google-only Better Auth with a fresh D1 schema', () => {
  it('completes the installed Google code callback, creates a verified Google account, and revokes logout sessions', async () => {
    const fixture = authFixture();
    const network = mockGoogle();
    try {
      const started = await fixture.start();
      const completed = await fixture.callback(started.state, started.cookie);
      expect(completed.status, await completed.clone().text()).toBe(302);
      expect(completed.headers.get('location')).toBe(`${origin}/dashboard`);
      const cookie = cookies(completed);
      expect(cookie).toContain('session_token=');
      const session = await fixture.auth.api.getSession({ headers: new Headers({ Cookie: cookie }) });
      expect(session?.user).toMatchObject({ email, emailVerified: true });
      expect(await fixture.db.prepare('SELECT providerId,password FROM account WHERE userId=?').bind(session!.user.id).first()).toEqual({ providerId: 'google', password: null });
      const actorRequest = new Request(`${origin}/api/me`, { headers: { Cookie: cookie } });
      expect(await requireActor(actorRequest)).toMatchObject({ email, emailVerified: true });
      expect(await fixture.db.prepare('SELECT id FROM profiles WHERE id=?').bind(session!.user.id).first()).not.toBeNull();
      await fixture.db.prepare('UPDATE user SET emailVerified=0 WHERE id=?').bind(session!.user.id).run();
      await expect(requireActor(actorRequest)).rejects.toMatchObject({ status: 401 });
      await fixture.db.prepare('UPDATE user SET emailVerified=1 WHERE id=?').bind(session!.user.id).run();
      await fixture.db.prepare('DELETE FROM account WHERE userId=?').bind(session!.user.id).run();
      await expect(requireActor(actorRequest)).rejects.toMatchObject({ status: 401 });
      expect((await fixture.call('/sign-out', {}, cookie)).status).toBe(200);
      expect(await fixture.auth.api.getSession({ headers: new Headers({ Cookie: cookie }) })).toBeNull();
      expect(network).toContain('https://oauth2.googleapis.com/token');
    } finally { fixture.close(); }
  });

  it('rejects forged OAuth state and consumed-state replay without minting a second session', async () => {
    const fixture = authFixture();
    const network = mockGoogle();
    try {
      const started = await fixture.start();
      const forged = await fixture.callback('forged-state', started.cookie);
      expect(forged.headers.get('location')).toContain('error=');
      expect(network).toHaveLength(0);
      const fresh = await fixture.start();
      expect((await fixture.callback(fresh.state, fresh.cookie)).status).toBe(302);
      const replay = await fixture.callback(fresh.state, fresh.cookie);
      expect(replay.headers.get('location')).toContain('error=');
      expect(await fixture.db.prepare('SELECT COUNT(*) n FROM session').first('n')).toBe(1);
      expect(network.filter(url => url === 'https://oauth2.googleapis.com/token')).toHaveLength(1);
    } finally { fixture.close(); }
  });

  it('does not authorize a Google identity with an unverified email', async () => {
    const fixture = authFixture();
    mockGoogle(false);
    try {
      const started = await fixture.start();
      const completed = await fixture.callback(started.state, started.cookie);
      expect(completed.headers.get('location')).toContain('error=email_not_verified');
      const cookie = cookies(completed);
      await expect(requireActor(new Request(`${origin}/api/me`, { headers: { Cookie: cookie } }))).rejects.toMatchObject({ status: 401 });
      expect(await fixture.db.prepare('SELECT COUNT(*) n FROM user').first('n')).toBe(0);
      expect(await fixture.db.prepare('SELECT COUNT(*) n FROM account').first('n')).toBe(0);
      expect(await fixture.db.prepare('SELECT COUNT(*) n FROM session').first('n')).toBe(0);
      expect(await fixture.db.prepare('SELECT COUNT(*) n FROM profiles').first('n')).toBe(0);
    } finally { fixture.close(); }
  });

  it('rejects missing Google configuration and unsupported providers before any network call', async () => {
    const fixture = authFixture(false);
    const network = mockGoogle();
    try {
      const unavailable = await authRoutePOST(fixture.request('/sign-in/social', { provider: 'google', callbackURL: `${origin}/dashboard` }));
      expect(unavailable.status).toBe(503);
      expect(await unavailable.json()).toMatchObject({ code: 'GOOGLE_AUTH_NOT_CONFIGURED' });
      for (const provider of ['google', 'github', 'facebook']) {
        const response = await fixture.call('/sign-in/social', { provider, callbackURL: `${origin}/dashboard` });
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
      expect(network).toHaveLength(0);
      expect(await fixture.db.prepare('SELECT COUNT(*) n FROM user').first('n')).toBe(0);
    } finally { fixture.close(); }
  });

  it('blocks every legacy password, reset, verification and OTP entrypoint without creating credentials', async () => {
    const fixture = authFixture();
    const network = mockGoogle();
    try {
      const paths = ['/sign-up/email', '/sign-in/email', '/request-password-reset', '/reset-password', '/change-password', '/set-password', '/verify-password', '/send-verification-email', '/change-email', '/email-otp/send-verification-otp', '/email-otp/verify-email', '/sign-in/email-otp', '/email-otp/reset-password'];
      for (const path of paths) {
        const response = await authRoutePOST(fixture.request(path, { email, password: 'Synthetic-password-123!', newPassword: 'Synthetic-password-456!', token: 'synthetic-token', otp: '123456', type: 'email-verification' }));
        expect(response.status, path).toBe(404);
      }
      for (const path of ['/verify-email?token=synthetic-token', '/reset-password/synthetic-token?callbackURL=%2Fdashboard']) {
        expect((await authRouteGET(fixture.request(path))).status, path).toBe(404);
      }
      expect(network).toHaveLength(0);
      expect(await fixture.db.prepare('SELECT COUNT(*) n FROM user').first('n')).toBe(0);
      expect(await fixture.db.prepare('SELECT COUNT(*) n FROM account').first('n')).toBe(0);
    } finally { fixture.close(); }
  });

  it('denies an existing verified password-only session and leaves its stored password unchanged', async () => {
    const fixture = authFixture();
    try {
      const now = Date.now();
      await fixture.db.prepare('INSERT INTO user(id,name,email,emailVerified,createdAt,updatedAt) VALUES(?,?,?,1,?,?)').bind('legacy-user', 'Legacy User', 'legacy@example.test', now, now).run();
      await fixture.db.prepare('INSERT INTO account(id,accountId,providerId,userId,password,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?)').bind('legacy-account', 'legacy-user', 'credential', 'legacy-user', 'unchanged-legacy-password-hash', now, now).run();
      const token = 'synthetic-legacy-session-token';
      await fixture.db.prepare('INSERT INTO session(id,userId,token,expiresAt,createdAt,updatedAt) VALUES(?,?,?,?,?,?)').bind('legacy-session', 'legacy-user', token, now + 60_000, now, now).run();
      const signature = createHmac('sha256', secret).update(token).digest('base64');
      const cookie = `better-auth.session_token=${encodeURIComponent(`${token}.${signature}`)}`;
      expect((await fixture.auth.api.getSession({ headers: new Headers({ Cookie: cookie }) }))?.user.id).toBe('legacy-user');
      await expect(requireActor(new Request(`${origin}/api/me`, { headers: { Cookie: cookie } }))).rejects.toMatchObject({ status: 401 });
      for (const path of ['/request-password-reset', '/reset-password', '/change-password', '/set-password']) {
        const response = await authRoutePOST(fixture.request(path, { email: 'legacy@example.test', password: 'Synthetic-password-123!', newPassword: 'Synthetic-password-456!', token: 'synthetic-reset-token' }, cookie));
        expect(response.status, path).toBe(404);
      }
      expect(await fixture.db.prepare('SELECT password FROM account WHERE id=?').bind('legacy-account').first('password')).toBe('unchanged-legacy-password-hash');
      expect(await fixture.db.prepare('SELECT COUNT(*) n FROM profiles').first('n')).toBe(0);
    } finally { fixture.close(); }
  });

  it('does not silently link a Google identity to an existing password account with the same email', async () => {
    const fixture = authFixture();
    mockGoogle();
    try {
      const now = Date.now();
      await fixture.db.prepare('INSERT INTO user(id,name,email,emailVerified,createdAt,updatedAt) VALUES(?,?,?,1,?,?)').bind('legacy-user', 'Legacy User', email, now, now).run();
      await fixture.db.prepare('INSERT INTO account(id,accountId,providerId,userId,password,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?)').bind('legacy-account', 'legacy-user', 'credential', 'legacy-user', 'unchanged-legacy-password-hash', now, now).run();
      const started = await fixture.start();
      const completed = await fixture.callback(started.state, started.cookie);
      expect(completed.headers.get('location')).toContain('error=');
      expect(await fixture.db.prepare('SELECT COUNT(*) n FROM account WHERE providerId=?').bind('google').first('n')).toBe(0);
      expect(await fixture.db.prepare('SELECT COUNT(*) n FROM session').first('n')).toBe(0);
      expect(await fixture.db.prepare('SELECT password FROM account WHERE id=?').bind('legacy-account').first('password')).toBe('unchanged-legacy-password-hash');
    } finally { fixture.close(); }
  });
});

describe('internal return URLs', () => {
  it.each(['https://evil.example', '//evil.example', '/\\evil.example', '/\n/evil.example', '', null])('rejects unsafe destination %s', (value) => {
    expect(safeReturnPath(value)).toBe('/dashboard');
  });
  it('keeps an internal assignment path and query', () => {
    expect(safeReturnPath('/org/student/questions?q=one')).toBe('/org/student/questions?q=one');
  });
});
