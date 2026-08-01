function serverAdminPassword() {
  return (process.env.ADMIN_PASSWORD || '').trim();
}

export function backendServerHeaders(init?: HeadersInit, method = 'GET'): Headers {
  const headers = new Headers(init || {});
  const password = serverAdminPassword();
  if (password && !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
    headers.set('X-Admin-Password', password);
  }
  return headers;
}

export async function backendServerFetch(url: string, opts?: RequestInit): Promise<Response> {
  const method = (opts?.method || 'GET').toUpperCase();
  const headers = backendServerHeaders(opts?.headers, method);
  return fetch(url, { ...opts, headers, cache: opts?.cache || 'no-store' });
}
