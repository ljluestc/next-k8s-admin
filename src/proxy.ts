import { NextRequest, NextResponse } from 'next/server';
import { stripBasePath, withBasePath } from '@/lib/base-path';

const PUBLIC_PATHS = ['/login', '/change-password', '/api/auth/login', '/api/auth/send-code', '/api/auth/verify-code', '/api/auth/change-password', '/api/auth/smtp-status'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function proxy(req: NextRequest) {
  const pathname = stripBasePath(req.nextUrl.pathname);
  if (isPublicPath(pathname)) return NextResponse.next();
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) return NextResponse.next();
  const token = req.cookies.get('k8s_session')?.value;
  if (!token) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: '未登录' }, { status: 401 });
    return NextResponse.redirect(new URL(withBasePath('/login'), req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
