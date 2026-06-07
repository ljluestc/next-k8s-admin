import type { NextConfig } from 'next';
function normalizeBasePath(input?: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (!trimmed || trimmed === '/') return '';
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash.slice(0, -1) : withLeadingSlash;
}

const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

const nextConfig: NextConfig = {
  output: 'standalone',
  ...(basePath ? { basePath } : {}),
  serverExternalPackages: ['ws', '@kubernetes/client-node'],
  allowedDevOrigins: ['54.186.80.96'],
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_SMTP_ENABLED: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) ? 'true' : '',
  },
};

export default nextConfig;
