import { stripBasePath, withBasePath } from '@/lib/base-path';
/**
 * 带错误提示的 fetch 包装
 * 非 2xx 响应由调用方通过 App.useApp() 的 message 处理
 */
export async function request(url: string, options?: RequestInit): Promise<Response> {
  const targetUrl = withBasePath(url);
  const res = await fetch(targetUrl, { ...options, credentials: 'include' });

  if (!res.ok) {
    // 401 跳登录页, 403 不跳（禁用用户由页面处理）
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        const currentPath = stripBasePath(window.location.pathname);
        if (!currentPath.startsWith('/login')) {
          window.location.href = withBasePath('/login');
        }
      }
    }
  }

  return res;
}
