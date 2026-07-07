import { NextResponse } from 'next/server';
import { setDashboardData } from '@/lib/dashboardStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isObj(v: unknown): v is Record<string, any> { return !!v && typeof v === 'object' && !Array.isArray(v); }
function str(v: unknown, max = 3000) { return typeof v === 'string' ? v.slice(0, max) : ''; }
function num(v: unknown) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function cleanNgo(v: any) { const o = isObj(v) ? v : {}; return { name: str(o.name, 120), location: str(o.location, 120), type: str(o.type, 120), summary: str(o.summary, 500), url: str(o.url, 1500) }; }
function cleanState(v: any) {
  const o = isObj(v) ? v : {};
  const s = isObj(o.sector) ? o.sector : {};
  const ngos = Array.isArray(o.ngos) ? o.ngos.slice(0, 6).map(cleanNgo) : [];
  while (ngos.length < 6) ngos.push(cleanNgo({}));
  return {
    sheetLink: str(o.sheetLink, 1500),
    totalScanned: num(o.totalScanned),
    shortlisted: num(o.shortlisted),
    finalShortlist: num(o.finalShortlist),
    rejected: num(o.rejected),
    funnelScanned: num(o.funnelScanned),
    funnelReview: num(o.funnelReview),
    funnelFinal: num(o.funnelFinal),
    sector: {
      registeredScanned: num(s.registeredScanned),
      noOfficialWebsite: num(s.noOfficialWebsite),
      noOfficialWebsitePct: num(s.noOfficialWebsitePct),
      wrongWebsite: num(s.wrongWebsite),
      wrongWebsitePct: num(s.wrongWebsitePct),
      unreachable: num(s.unreachable),
      unreachablePct: num(s.unreachablePct),
      enoughPublicInfo: num(s.enoughPublicInfo),
      enoughPublicInfoPct: num(s.enoughPublicInfoPct),
      metroSkewText: str(s.metroSkewText, 800),
    },
    ngos,
  };
}
function normalizeDashboardData(input: unknown) {
  if (!isObj(input)) throw new Error('Invalid dashboard data.');
  const statesRaw = isObj(input.states) ? input.states : {};
  const states: Record<string, any> = {};
  for (const [state, value] of Object.entries(statesRaw).slice(0, 20)) {
    const key = str(state, 80) || 'Karnataka';
    states[key] = cleanState(value);
  }
  return { lastUpdated: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }), states, pmStats: isObj(input.pmStats) ? input.pmStats : {} };
}

export async function POST(req: Request) {
  try {
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > 1_500_000) return NextResponse.json({ ok: false, error: 'Update payload is too large.' }, { status: 413 });
    const { password, data } = await req.json();
    if (!process.env.ADMIN_PASSWORD) return NextResponse.json({ ok: false, error: 'Admin publishing is not configured.' }, { status: 500 });
    if (password !== process.env.ADMIN_PASSWORD) return NextResponse.json({ ok: false, error: 'Wrong password.' }, { status: 401 });
    const cleaned = normalizeDashboardData(data);
    const saved = await setDashboardData(cleaned, password);
    return NextResponse.json({ ok: true, data: saved || cleaned }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Could not update dashboard.' }, { status: 500 });
  }
}
