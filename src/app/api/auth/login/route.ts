import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { comparePassword } from '@/lib/auth/password';
import { generateToken, setSessionCookie } from '@/lib/auth/session';
import { loginLimiter } from '@/lib/auth/rate-limit';
import { writeAuditLog } from '@/lib/audit/logger';
import { attachTraceHeaders, createTraceContext, logTraceEvent, type TraceContext } from '@/lib/observability/trace';

function jsonWithTrace(trace: TraceContext, body: unknown, status: number) {
  const res = NextResponse.json(body, { status });
  attachTraceHeaders(res, trace);
  return res;
}

export async function POST(req: NextRequest) {
  const trace = createTraceContext(req.headers);
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || undefined;
  if (!loginLimiter.check(ip)) {
    logTraceEvent(trace, 'auth.login.rate_limited', {
      ip,
      requestPath: '/api/auth/login',
    });
    await writeAuditLog({
      action: 'login_rate_limited',
      resourceType: 'user',
      requestMethod: 'POST',
      requestPath: '/api/auth/login',
      requestBody: { traceId: trace.traceId },
      responseStatus: 429,
      ipAddress: ip,
      userAgent,
    });
    return jsonWithTrace(trace, { error: '请求过于频繁，请稍后再试' }, 429);
  }
  const { username, password } = await req.json();
  const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (!user || !user.isActive) {
    logTraceEvent(trace, 'auth.login.invalid_user', {
      username,
      ip,
      requestPath: '/api/auth/login',
    });
    await writeAuditLog({
      action: 'login_failed',
      resourceType: 'user',
      resourceName: username,
      requestMethod: 'POST',
      requestPath: '/api/auth/login',
      requestBody: { traceId: trace.traceId },
      responseStatus: 401,
      ipAddress: ip,
      userAgent,
    });
    return jsonWithTrace(trace, { error: '用户名或密码错误' }, 401);
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    logTraceEvent(trace, 'auth.login.locked', {
      userId: user.id,
      username,
      lockedUntil: user.lockedUntil.toISOString(),
      ip,
      requestPath: '/api/auth/login',
    });
    await writeAuditLog({
      userId: user.id,
      action: 'login_locked',
      resourceType: 'user',
      resourceName: username,
      requestMethod: 'POST',
      requestPath: '/api/auth/login',
      requestBody: { traceId: trace.traceId },
      responseStatus: 423,
      ipAddress: ip,
      userAgent,
    });
    return jsonWithTrace(trace, { error: '账户已锁定，请 15 分钟后再试' }, 423);
  }
  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    const updates: { failedLoginAttempts: number; lockedUntil?: Date } = { failedLoginAttempts: attempts };
    if (attempts >= 5) { updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); }
    const lockedUntil = updates.lockedUntil instanceof Date ? updates.lockedUntil.toISOString() : null;
    await db.update(users).set(updates).where(eq(users.id, user.id));
    logTraceEvent(trace, 'auth.login.invalid_password', {
      userId: user.id,
      username,
      attempts,
      lockedUntil,
      ip,
      requestPath: '/api/auth/login',
    });
    await writeAuditLog({
      userId: user.id,
      action: 'login_failed',
      resourceType: 'user',
      resourceName: username,
      requestMethod: 'POST',
      requestPath: '/api/auth/login',
      requestBody: { traceId: trace.traceId, attempts, lockedUntil },
      responseStatus: 401,
      ipAddress: ip,
      userAgent,
    });
    return jsonWithTrace(trace, { error: '用户名或密码错误' }, 401);
  }
  const token = generateToken(user.id);
  await db.update(users).set({ lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null }).where(eq(users.id, user.id));
  logTraceEvent(trace, 'auth.login.success', {
    userId: user.id,
    username,
    mustChangePassword: user.mustChangePassword,
    ip,
    requestPath: '/api/auth/login',
  });
  await writeAuditLog({
    userId: user.id,
    action: 'login',
    resourceType: 'user',
    resourceName: username,
    requestMethod: 'POST',
    requestPath: '/api/auth/login',
    requestBody: { traceId: trace.traceId },
    responseStatus: 200,
    ipAddress: ip,
    userAgent,
  });
  const res = jsonWithTrace(trace, { mustChangePassword: user.mustChangePassword }, 200);
  setSessionCookie(res, token);
  return res;
}
