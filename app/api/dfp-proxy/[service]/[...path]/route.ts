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

function baseFor(service: Service): string {
  if (service === 'core') {
    return cleanBase(process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL);
  }
  if (service === 'search') {
    return cleanBase(process.env.SEARCH_BACKEND_URL || process.env.NEXT_PUBLIC_SEARCH_BACKEND_URL || process.env.NEXT_PUBLIC_WORKER_BACKEND_URL);
  }
  return cleanBase(process.env.STORY_BACKEND_URL || process.env.NEXT_PUBLIC_STORY_BACKEND_URL || process.env.SEARCH_BACKEND_URL || process.env.NEXT_PUBLIC_SEARCH_BACKEND_URL);
}

function copyRequestHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  const allowed = ['accept', 'content-type', 'range', 'if-none-match', 'if-modified-since'];
  for (const name of allowed) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const password = (process.env.ADMIN_PASSWORD || '').trim();
  if (password && !['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())) {
    headers.set('X-Admin-Password', password);
  }
  return headers;
}

async function proxy(request: NextRequest, context: RouteContext): Promise<Response> {
  const service = context.params.service as Service;
  if (!['core', 'search', 'story'].includes(service)) {
    return Response.json({ ok: false, error: 'Unknown backend service.' }, { status: 404 });
  }
  const base = baseFor(service);
  if (!base) {
    return Response.json({ ok: false, error: `Backend URL for ${service} is not configured.` }, { status: 503 });
  }

  const segments = context.params.path || [];
  const upstreamUrl = `${base}/${segments.map(encodeURIComponent).join('/')}${request.nextUrl.search}`;
  const method = request.method.toUpperCase();
  const body = ['GET', 'HEAD', 'OPTIONS'].includes(method) ? undefined : await request.arrayBuffer();

  try {
    const upstream = await fetch(upstreamUrl, {
      method,
      headers: copyRequestHeaders(request),
      body,
      redirect: 'follow',
      cache: 'no-store',
    });
    const responseHeaders = new Headers();
    for (const name of ['content-type', 'content-disposition', 'cache-control', 'etag', 'last-modified', 'accept-ranges']) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    responseHeaders.set('X-DFP-Proxy-Service', service);
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    return Response.json(
      { ok: false, stage: 'frontend_backend_proxy', error: error?.message || 'Could not reach backend.' },
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
