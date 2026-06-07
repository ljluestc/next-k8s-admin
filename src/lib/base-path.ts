const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export function normalizeBasePath(input?: string | null): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (!trimmed || trimmed === '/') return '';
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
}

export const APP_BASE_PATH = normalizeBasePath(rawBasePath);

function isAbsoluteUrl(url: string): boolean {
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url) || url.startsWith('//');
}

export function withBasePath(path: string): string {
  if (!path || !APP_BASE_PATH) return path;
  if (isAbsoluteUrl(path) || !path.startsWith('/')) return path;
  if (path === APP_BASE_PATH || path.startsWith(`${APP_BASE_PATH}/`)) return path;
  return `${APP_BASE_PATH}${path}`;
}

export function stripBasePath(pathname: string): string {
  if (!APP_BASE_PATH || !pathname.startsWith('/')) return pathname;
  if (pathname === APP_BASE_PATH) return '/';
  if (pathname.startsWith(`${APP_BASE_PATH}/`)) return pathname.slice(APP_BASE_PATH.length);
  return pathname;
}
