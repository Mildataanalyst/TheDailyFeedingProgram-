'use client';

import { useEffect, useMemo, useState } from 'react';
import { SEARCH_BACKEND, SEARCH_BACKEND_CONFIG_ERROR, safeSearchJSON } from '@/lib/backendClient';
import { safeExternalUrl } from '@/lib/urlSafety';

export type EnrichmentCandidate = {
  id: string;
  ngo_name: string;
  website: string;
  pm_reviewer: string;
  pm_rating: number | null;
  pm_comment: string;
  one_line_understanding: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  region: string;
  rows: EnrichmentCandidate[];
};

const TERMINAL_STAGES = new Set(['results_ready', 'partial_results_ready', 'cancelled', 'error']);

function exportUrl(runId: string, kind: string) {
  return `${SEARCH_BACKEND}/enrichment/export/${encodeURIComponent(runId)}/${encodeURIComponent(kind)}`;
}

export default function DeepEnrichmentModal({ open, onClose, region, rows }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [maxPages, setMaxPages] = useState(50);
  const [queryDepth, setQueryDepth] = useState(35);
  const [useHaiku, setUseHaiku] = useState(true);
  const [runId, setRunId] = useState('');
  const [status, setStatus] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [starting, setStarting] = useState(false);

  const ratingCounts = useMemo(() => {
    const counts: Record<string, number> = { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
    rows.forEach(row => {
      const key = String(row.pm_rating || '');
      if (counts[key] !== undefined) counts[key] += 1;
    });
    return counts;
  }, [rows]);

  const selectedRows = useMemo(() => rows.filter(row => selected.has(row.id)), [rows, selected]);
  const estimatedCredits = selectedRows.length * (maxPages + 5);
  const isActive = status && !TERMINAL_STAGES.has(String(status.stage || '').toLowerCase());
  const canDownload = status && ['results_ready', 'partial_results_ready'].includes(String(status.stage || '').toLowerCase());

  useEffect(() => {
    if (!open) return;
    try {
      const saved = window.localStorage.getItem('dfp2_deep_enrichment_run_id') || '';
      if (saved && !runId) setRunId(saved);
    } catch {}
  }, [open, runId]);

  useEffect(() => {
    if (!open || !runId || !SEARCH_BACKEND) return;
    let stopped = false;
    async function refresh() {
      const res = await safeSearchJSON(`${SEARCH_BACKEND}/enrichment/status/${encodeURIComponent(runId)}`);
      if (stopped) return;
      if (res.ok) {
        setStatus(res.data);
        setMessage('');
      } else if (res.status !== 404) {
        setMessage(res.error || 'Could not load enrichment status.');
      }
    }
    refresh();
    if (TERMINAL_STAGES.has(String(status?.stage || '').toLowerCase())) {
      return () => { stopped = true; };
    }
    const timer = window.setInterval(refresh, 3500);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [open, runId, status?.stage]);

  function toggleRow(id: string) {
    setSelected(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleRating(rating: number) {
    const ids = rows.filter(row => row.pm_rating === rating).map(row => row.id);
    const allSelected = ids.length > 0 && ids.every(id => selected.has(id));
    setSelected(current => {
      const next = new Set(current);
      ids.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  }

  function selectAllRated() {
    const ids = rows.filter(row => row.pm_rating && row.pm_rating >= 1).map(row => row.id);
    const allSelected = ids.length > 0 && ids.every(id => selected.has(id));
    setSelected(allSelected ? new Set() : new Set(ids));
  }

  async function startRun() {
    if (!SEARCH_BACKEND) { setMessage(SEARCH_BACKEND_CONFIG_ERROR); return; }
    if (!selectedRows.length) { setMessage('Select at least one NGO.'); return; }
    setStarting(true);
    setMessage('Starting Deep Enrichment…');
    const res = await safeSearchJSON(`${SEARCH_BACKEND}/enrichment/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        region,
        ngos: selectedRows,
        options: {
          max_pages_per_site: maxPages,
          serper_queries_per_ngo: queryDepth,
          serper_results_per_query: 5,
          max_external_sources: 30,
          external_firecrawl_fallbacks: 5,
          use_haiku: useHaiku,
        },
      }),
    });
    setStarting(false);
    if (!res.ok) { setMessage(res.error || 'Could not start Deep Enrichment.'); return; }
    const id = String(res.data?.run_id || '');
    setRunId(id);
    setStatus(res.data);
    setMessage('Run started. It will continue on Railway even if this window is closed.');
    try { window.localStorage.setItem('dfp2_deep_enrichment_run_id', id); } catch {}
  }

  async function cancelRun() {
    if (!runId) return;
    const res = await safeSearchJSON(`${SEARCH_BACKEND}/enrichment/cancel/${encodeURIComponent(runId)}`, { method: 'POST' });
    setMessage(res.ok ? 'Cancellation requested. Completed dossiers will be preserved.' : (res.error || 'Could not cancel run.'));
  }

  async function resumeRun() {
    if (!runId) return;
    const res = await safeSearchJSON(`${SEARCH_BACKEND}/enrichment/resume/${encodeURIComponent(runId)}`, { method: 'POST' });
    setMessage(res.ok ? 'Resuming incomplete NGOs.' : (res.error || 'Could not resume run.'));
    if (res.ok) setStatus({ ...(status || {}), stage: 'resuming', run_status: 'resuming' });
  }

  function openExport(kind: string) {
    if (!runId || !SEARCH_BACKEND) return;
    window.open(exportUrl(runId, kind), '_blank', 'noopener,noreferrer');
  }

  function resetRunView() {
    setRunId('');
    setStatus(null);
    setMessage('');
    try { window.localStorage.removeItem('dfp2_deep_enrichment_run_id'); } catch {}
  }

  if (!open) return null;

  const processed = Number(status?.processed || 0);
  const total = Number(status?.total || selectedRows.length || 0);
  const progress = total ? Math.min(100, Math.round((processed / total) * 100)) : 0;

  return <div className="deep-enrichment-scrim" onClick={onClose}>
    <section className="deep-enrichment-modal" onClick={event => event.stopPropagation()}>
      <header className="deep-enrichment-head">
        <div>
          <span className="deep-enrichment-kicker">Evidence collection</span>
          <h2>Deep Enrichment</h2>
          <p>Crawl official websites, search external media through Serper, and build model-ready dossiers. This does not change PM ratings.</p>
        </div>
        <button className="deep-enrichment-close" onClick={onClose} aria-label="Close">×</button>
      </header>

      {!runId ? <>
        <div className="deep-enrichment-quickbar">
          <button onClick={selectAllRated}>All rated <b>{rows.filter(row => row.pm_rating).length}</b></button>
          {[5,4,3,2,1].map(rating => {
            const ids = rows.filter(row => row.pm_rating === rating).map(row => row.id);
            const active = ids.length > 0 && ids.every(id => selected.has(id));
            return <button className={active ? 'active' : ''} key={rating} onClick={() => toggleRating(rating)}>
              Rating {rating} <b>{ratingCounts[String(rating)]}</b>
            </button>;
          })}
          <button onClick={() => setSelected(new Set())}>Clear</button>
        </div>

        <div className="deep-enrichment-body-grid">
          <div className="deep-enrichment-table-wrap">
            <div className="deep-enrichment-table-head">
              <span>{selectedRows.length} selected</span>
              <small>Maximum 100 NGOs per run</small>
            </div>
            <div className="deep-enrichment-table">
              {rows.map(row => {
                const website = safeExternalUrl(row.website);
                return <label className={selected.has(row.id) ? 'selected' : ''} key={row.id}>
                  <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleRow(row.id)} />
                  <span className="deep-enrichment-ngo-copy">
                    <b>{row.ngo_name}</b>
                    <small>{row.pm_reviewer || 'Unknown PM'} · Rating {row.pm_rating ?? '—'}</small>
                    <em>{row.pm_comment || 'No PM comment.'}</em>
                  </span>
                  <span className={website ? 'website-ready' : 'website-missing'}>{website ? 'Website ready' : 'Find website'}</span>
                </label>;
              })}
            </div>
          </div>

          <aside className="deep-enrichment-config">
            <h3>Research depth</h3>
            <label><span>Official-site page ceiling</span><select value={maxPages} onChange={event => setMaxPages(Number(event.target.value))}><option value={30}>30 pages</option><option value={50}>50 pages</option><option value={70}>70 pages</option><option value={100}>100 pages</option></select></label>
            <label><span>Serper searches per NGO</span><select value={queryDepth} onChange={event => setQueryDepth(Number(event.target.value))}><option value={22}>Focused · 22</option><option value={35}>Deep · 35</option><option value={50}>Exhaustive · 50</option><option value={60}>Maximum · 60</option></select></label>
            <label className="deep-enrichment-check"><input type="checkbox" checked={useHaiku} onChange={event => setUseHaiku(event.target.checked)} /><span><b>Preliminary Haiku pass</b><small>Suggests model categories and separate non-final signals. Skips automatically when no Anthropic key is configured.</small></span></label>
            <div className="deep-enrichment-estimate"><span>Maximum Firecrawl ceiling</span><b>{estimatedCredits.toLocaleString('en-IN')} credits</b><small>Actual use should be lower. External pages use direct fetching first.</small></div>
            <div className="deep-enrichment-output-note"><b>Output</b><p>Full ZIP, GPT/Fable Markdown packets, JSONL dossiers, master CSV, and individual source ledgers.</p></div>
          </aside>
        </div>

        {message && <p className="deep-enrichment-message">{message}</p>}
        <footer className="deep-enrichment-foot">
          <button className="quiet-btn" onClick={onClose}>Cancel</button>
          <button className="primary-red" onClick={startRun} disabled={starting || !selectedRows.length}>{starting ? 'Starting…' : `Start enrichment · ${selectedRows.length}`}</button>
        </footer>
      </> : <>
        <div className="deep-enrichment-progress-card">
          <div className="deep-enrichment-progress-top"><span>{String(status?.stage || 'Loading status').replaceAll('_', ' ')}</span><b>{processed} / {total || '—'} NGOs</b></div>
          <div className="deep-enrichment-progress-track"><i style={{ width: `${progress}%` }} /></div>
          <div className="deep-enrichment-current">
            <b>{status?.current_ngo || (canDownload ? 'Research pack ready' : 'Preparing run')}</b>
            <span>{status?.current_step || status?.message || 'Waiting for worker'}</span>
          </div>
          <div className="deep-enrichment-metrics">
            <div><span>Firecrawl</span><b>{Number(status?.firecrawl_credits_used || 0).toLocaleString('en-IN')}</b><small>credits used</small></div>
            <div><span>Serper</span><b>{Number(status?.serper_queries_used || 0).toLocaleString('en-IN')}</b><small>queries used</small></div>
            <div><span>Official site</span><b>{Number(status?.official_pages_collected || 0).toLocaleString('en-IN')}</b><small>pages collected</small></div>
            <div><span>External</span><b>{Number(status?.external_sources_collected || 0).toLocaleString('en-IN')}</b><small>sources collected</small></div>
          </div>
          {status?.error && <div className="error-box">{status.error}</div>}
        </div>

        {message && <p className="deep-enrichment-message">{message}</p>}

        {canDownload && <div className="deep-enrichment-downloads">
          <button onClick={() => openExport('packet')}><b>GPT / Fable packet</b><small>Model-ready Markdown</small></button>
          <button onClick={() => openExport('zip')}><b>Full research ZIP</b><small>All dossiers and source ledgers</small></button>
          <button onClick={() => openExport('jsonl')}><b>JSONL dossiers</b><small>Structured machine-readable output</small></button>
          <button onClick={() => openExport('csv')}><b>Master CSV</b><small>Filter and track the full pool</small></button>
        </div>}

        <footer className="deep-enrichment-foot">
          <button className="quiet-btn" onClick={resetRunView}>New run</button>
          <div>
            {isActive && <button className="quiet-btn" onClick={cancelRun}>Cancel run</button>}
            {['cancelled', 'error', 'interrupted'].includes(String(status?.run_status || '').toLowerCase()) && <button className="quiet-btn" onClick={resumeRun}>Resume</button>}
            <button className="primary-red" onClick={onClose}>{canDownload ? 'Done' : 'Close — keep running'}</button>
          </div>
        </footer>
      </>}
    </section>
  </div>;
}
