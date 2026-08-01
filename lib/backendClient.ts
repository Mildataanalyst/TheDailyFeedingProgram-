export type SafeResponse = { ok: boolean; status: number; data: any; error: string | null };

type BackendService = 'core' | 'search' | 'story';

export const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');
export const SEARCH_BACKEND = (process.env.NEXT_PUBLIC_SEARCH_BACKEND_URL || process.env.NEXT_PUBLIC_WORKER_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');
export const STORY_BACKEND = (process.env.NEXT_PUBLIC_STORY_BACKEND_URL || process.env.NEXT_PUBLIC_AI_BACKEND_URL || process.env.NEXT_PUBLIC_SEARCH_BACKEND_URL || process.env.NEXT_PUBLIC_WORKER_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');
export const BACKEND_CONFIG_ERROR = 'Core backend URL is not configured. Add NEXT_PUBLIC_BACKEND_URL in Railway Variables, then redeploy.';
export const SEARCH_BACKEND_CONFIG_ERROR = 'Search worker URL is not configured. Add NEXT_PUBLIC_SEARCH_BACKEND_URL in Railway Variables, then redeploy.';
export const STORY_BACKEND_CONFIG_ERROR = 'Story/AI worker URL is not configured. Add NEXT_PUBLIC_STORY_BACKEND_URL or NEXT_PUBLIC_SEARCH_BACKEND_URL in Railway Variables, then redeploy.';

function inferService(defaultService: BackendService, url: string): BackendService {
  if (!/^https?:\/\//i.test(url)) return defaultService;
  const clean = url.replace(/\/+$/, '');
  if (SEARCH_BACKEND && (clean === SEARCH_BACKEND || clean.startsWith(`${SEARCH_BACKEND}/`))) return 'search';
  if (STORY_BACKEND && (clean === STORY_BACKEND || clean.startsWith(`${STORY_BACKEND}/`))) return 'story';
  if (BACKEND && (clean === BACKEND || clean.startsWith(`${BACKEND}/`))) return 'core';
  return defaultService;
}

function servicePath(url: string): string {
  if (!/^https?:\/\//i.test(url)) return `/${url.replace(/^\/+/, '')}`;
  try {
    const parsed = new URL(url);
    return `${parsed.pathname || '/'}${parsed.search || ''}`;
  } catch {
    return `/${url.replace(/^\/+/, '')}`;
  }
}

function proxyUrl(service: BackendService, url: string): string {
  const path = servicePath(url);
  return `/api/dfp-proxy/${service}${path.startsWith('/') ? path : `/${path}`}`;
}

async function safeServiceJSON(
  defaultService: BackendService,
  configError: string,
  url: string,
  opts?: RequestInit,
): Promise<SafeResponse> {
  const service = inferService(defaultService, url);
  const requiredBase = service === 'core' ? BACKEND : service === 'search' ? SEARCH_BACKEND : STORY_BACKEND;
  if (!requiredBase) return { ok: false, status: 0, data: null, error: configError };

  try {
    const res = await fetch(proxyUrl(service, url), { ...opts, cache: opts?.cache || 'no-store' });
    const text = await res.text();
    let data: any = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      return {
        ok: false,
        status: res.status,
        data: null,
        error: 'Server did not return JSON' + (text ? ' — ' + text.slice(0, 120) : ''),
      };
    }

    return {
      ok: res.ok,
      status: res.status,
      data,
      error: res.ok ? null : (data?.error || data?.detail || `Server error ${res.status}`),
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: 'Could not reach the server — ' + (err?.message || 'network error'),
    };
  }
}

/** Call the core backend through the server-side password proxy. */
export async function safeJSON(url: string, opts?: RequestInit): Promise<SafeResponse> {
  return safeServiceJSON('core', BACKEND_CONFIG_ERROR, url, opts);
}

/** Call the search worker through the server-side password proxy. */
export async function safeSearchJSON(url: string, opts?: RequestInit): Promise<SafeResponse> {
  return safeServiceJSON('search', SEARCH_BACKEND_CONFIG_ERROR, url, opts);
}

/** Call the story/AI worker through the server-side password proxy. */
export async function safeStoryJSON(url: string, opts?: RequestInit): Promise<SafeResponse> {
  return safeServiceJSON('story', STORY_BACKEND_CONFIG_ERROR, url, opts);
}

export async function backendFetch(url: string, opts?: RequestInit): Promise<Response> {
  const service = inferService('core', url);
  return fetch(proxyUrl(service, url), { ...opts, cache: opts?.cache || 'no-store' });
}

export function isTerminalReady(data: any) {
  const stage = String(data?.stage || '').toLowerCase();
  const runStatus = String(data?.run_status || data?.process_state || '').toLowerCase();
  return ['results_ready', 'partial_results_ready', 'completed', 'complete', 'done', 'finished'].includes(stage)
    || ['completed', 'complete', 'done', 'finished', 'success'].includes(runStatus);
}

export function isFailureStatus(data: any) {
  const s = String(data?.run_status || data?.process_state || data?.stage || '').toLowerCase();
  return ['error', 'failed', 'cancelled', 'canceled'].includes(s);
}
