import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Service = 'core' | 'search' | 'story';

type RouteContext = {
  params: { service: string; path?: string[] };
};

function cleanBase(value: string | undefined): string {
  return (value || '').trim().replace(/\/+$/, '');
}

function unique(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.map(cleanBase).filter(Boolean)));
}

function baseCandidates(service: Service): string[] {
  if (service === 'core') {
    return unique([
      process.env.BACKEND_URL,
      process.env.NEXT_PUBLIC_BACKEND_URL,
    ]);
  }
  if (service === 'search') {
    // Prefer the browser-visible worker URL first. A stale SEARCH_BACKEND_URL
    // previously pointed at the core service and caused misleading 401s.
    return unique([
      process.env.NEXT_PUBLIC_SEARCH_BACKEND_URL,
      process.env.SEARCH_BACKEND_URL,
      process.env.NEXT_PUBLIC_WORKER_BACKEND_URL,
      process.env.NEXT_PUBLIC_STORY_BACKEND_URL,
      process.env.STORY_BACKEND_URL,
    ]);
  }
  return unique([
    process.env.NEXT_PUBLIC_STORY_BACKEND_URL,
    process.env.STORY_BACKEND_URL,
    process.env.NEXT_PUBLIC_SEARCH_BACKEND_URL,
    process.env.SEARCH_BACKEND_URL,
  ]);
}

function copyRequestHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  const allowed = ['accept', 'content-type', 'range', 'if-none-match', 'if-modified-since'];
  for (const name of allowed) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  // Kept only for unrelated legacy protected endpoints. Avika and discovery
  // routes are password-free in Worker v85.
  const password = (process.env.ADMIN_PASSWORD || '').trim();
  if (password && !['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())) {
    headers.set('X-Admin-Password', password);
  }
  return headers;
}

async function healthMatches(base: string, service: Service): Promise<boolean> {
  if (service === 'core') return true;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(`${base}/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) return false;
    const data: any = await response.json().catch(() => ({}));
    const role = String(data?.service_role || '').toLowerCase();
    const capabilities = data?.capabilities || {};
    if (service === 'search') {
      return role === 'full' || role === 'all' || role === 'search' || capabilities.repository === true || capabilities.avika_filter === true;
    }
    return role === 'full' || role === 'all' || role === 'story' || role === 'ai' || role === 'story_ai';
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveBase(service: Service): Promise<{ base: string; checked: string[] }> {
  const candidates = baseCandidates(service);
  if (!candidates.length) return { base: '', checked: [] };
  if (service === 'core') return { base: candidates[0], checked: candidates };
  for (const base of candidates) {
    if (await healthMatches(base, service)) return { base, checked: candidates };
  }
  // Preserve backward compatibility with older workers whose /health does not
  // yet expose a service role, while still preferring the public worker URL.
  return { base: candidates[0], checked: candidates };
}

async function proxy(request: NextRequest, context: RouteContext): Promise<Response> {
  const service = context.params.service as Service;
  if (!['core', 'search', 'story'].includes(service)) {
    return Response.json({ ok: false, error: 'Unknown backend service.' }, { status: 404 });
  }
  const resolved = await resolveBase(service);
  const base = resolved.base;
  if (!base) {
    return Response.json({ ok: false, error: `Backend URL for ${service} is not configured.` }, { status: 503 });
  }

  const segments = context.params.path || [];
  const upstreamUrl = `${base}/${segments.map(encodeURIComponent).join('/')}${request.nextUrl.search}`;
  const method = request.method.toUpperCase();
  const hasBody = !['GET', 'HEAD', 'OPTIONS'].includes(method);
  const init: RequestInit & { duplex?: 'half' } = {
    method,
    headers: copyRequestHeaders(request),
    redirect: 'follow',
    cache: 'no-store',
  };
  if (hasBody && request.body) {
    init.body = request.body as any;
    init.duplex = 'half';
  }

  try {
    const upstream = await fetch(upstreamUrl, init);
    const responseHeaders = new Headers();
    for (const name of ['content-type', 'content-disposition', 'cache-control', 'etag', 'last-modified', 'accept-ranges']) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    responseHeaders.set('X-DFP-Proxy-Service', service);
    responseHeaders.set('X-DFP-Upstream-Host', new URL(base).host);
    responseHeaders.set('X-DFP-Proxy-Version', 'v164');
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        stage: 'frontend_backend_proxy',
        error: error?.message || 'Could not reach backend.',
        checked_backends: resolved.checked.map(value => {
          try { return new URL(value).host; } catch { return value; }
        }),
      },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
