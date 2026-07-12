'use client';

import { useEffect, useMemo, useState } from 'react';
import { SEARCH_BACKEND, SEARCH_BACKEND_CONFIG_ERROR, safeSearchJSON } from '@/lib/backendClient';

type Props = {
  open: boolean;
  onClose: () => void;
};

type ArchiveRun = {
  run_id: string;
  created_at?: string;
  updated_at?: string;
  run_status?: string;
  stage?: string;
  mode?: string;
  processed?: number;
  total?: number;
  source_total?: number;
  already_complete?: number;
  repair_required?: number;
  repair_eligible?: boolean;
  firecrawl_credits_used?: number;
  serper_queries_used?: number;
  serper_queries_reused?: number;
  external_sources_reused?: number;
};

const TERMINAL_STAGES = new Set(['results_ready', 'partial_results_ready', 'cancelled', 'error']);

function exportUrl(runId: string, kind: string) {
  return `${SEARCH_BACKEND}/enrichment/export/${encodeURIComponent(runId)}/${encodeURIComponent(kind)}`;
}

function dateLabel(value: string | undefined) {
  if (!value) return 'Stored run';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function DeepEnrichmentRepairModal({ open, onClose }: Props) {
  const [archive, setArchive] = useState<ArchiveRun[]>([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [maxPages, setMaxPages] = useState(50);
  const [useHaiku, setUseHaiku] = useState(true);
  const [cleanSources, setCleanSources] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [runId, setRunId] = useState('');
  const [status, setStatus] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [starting, setStarting] = useState(false);

  const eligibleRuns = useMemo(() => archive.filter(run =>
    String(run.mode || 'enrichment').toLowerCase() !== 'repair'
    && (Boolean(run.repair_eligible) || Number(run.repair_required || 0) > 0)
  ), [archive]);

  const isActive = status && !TERMINAL_STAGES.has(String(status.stage || '').toLowerCase());
  const canDownload = status && ['results_ready', 'partial_results_ready'].includes(String(status.stage || '').toLowerCase());

  useEffect(() => {
    if (!open) return;
    try {
      const saved = window.localStorage.getItem('dfp2_deep_enrichment_repair_run_id') || '';
      if (saved && !runId) setRunId(saved);
    } catch {}
  }, [open, runId]);

  useEffect(() => {
    if (!open || runId || !SEARCH_BACKEND) return;
    let stopped = false;
    async function loadArchive() {
      setArchiveLoading(true);
      const res = await safeSearchJSON(`${SEARCH_BACKEND}/enrichment/archive?limit=100`);
      if (stopped) return;
      setArchiveLoading(false);
      if (!res.ok) {
        setMessage(res.error || 'Could not load stored enrichment runs.');
        return;
      }
      const rows = Array.isArray(res.data?.rows) ? res.data.rows : [];
      setArchive(rows);
      const firstEligible = rows.find((row: ArchiveRun) => String(row.mode || 'enrichment') !== 'repair' && (row.repair_eligible || Number(row.repair_required || 0) > 0));
      if (firstEligible && !selectedRunId) setSelectedRunId(String(firstEligible.run_id || ''));
      setMessage('');
    }
    loadArchive();
    return () => { stopped = true; };
  }, [open, runId, selectedRunId]);

  useEffect(() => {
    if (!open || runId || !selectedRunId || !SEARCH_BACKEND) {
      if (!selectedRunId) setPreview(null);
      return;
    }
    let stopped = false;
    async function loadPreview() {
      setPreview(null);
      const res = await safeSearchJSON(`${SEARCH_BACKEND}/enrichment/repair-preview/${encodeURIComponent(selectedRunId)}`);
      if (stopped) return;
      if (res.ok) {
        setPreview(res.data);
        setMessage('');
      } else {
        setMessage(res.error || 'Could not inspect this run.');
      }
    }
    loadPreview();
    return () => { stopped = true; };
  }, [open, runId, selectedRunId]);

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
        setMessage(res.error || 'Could not load repair status.');
      }
    }
    refresh();
    if (TERMINAL_STAGES.has(String(status?.stage || '').toLowerCase())) {
      return () => { stopped = true; };
    }
    const timer = window.setInterval(refresh, 3500);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [open, runId, status?.stage]);

  async function startRepair() {
    if (!SEARCH_BACKEND) { setMessage(SEARCH_BACKEND_CONFIG_ERROR); return; }
    if (!selectedRunId) { setMessage('Select a completed Deep Enrichment run.'); return; }
    setStarting(true);
    setMessage('Starting evidence repair…');
    const res = await safeSearchJSON(`${SEARCH_BACKEND}/enrichment/repair/${encodeURIComponent(selectedRunId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        options: {
          max_pages_per_site: maxPages,
          use_haiku: useHaiku,
          blind_haiku: true,
          clean_existing_sources: cleanSources,
        },
      }),
    });
    setStarting(false);
    if (!res.ok) { setMessage(res.error || 'Could not start evidence repair.'); return; }
    const id = String(res.data?.run_id || '');
    setRunId(id);
    setStatus(res.data);
    setMessage('Repair started. Existing Serper research is being reused; no new Serper searches will run.');
    try { window.localStorage.setItem('dfp2_deep_enrichment_repair_run_id', id); } catch {}
  }

  async function cancelRun() {
    if (!runId) return;
    const res = await safeSearchJSON(`${SEARCH_BACKEND}/enrichment/cancel/${encodeURIComponent(runId)}`, { method: 'POST' });
    setMessage(res.ok ? 'Cancellation requested. Completed repairs will be preserved.' : (res.error || 'Could not cancel repair.'));
  }

  async function resumeRun() {
    if (!runId) return;
    const res = await safeSearchJSON(`${SEARCH_BACKEND}/enrichment/resume/${encodeURIComponent(runId)}`, { method: 'POST' });
    setMessage(res.ok ? 'Resuming evidence repair.' : (res.error || 'Could not resume repair.'));
    if (res.ok) setStatus({ ...(status || {}), stage: 'resuming', run_status: 'resuming' });
  }

  function openExport(kind: string) {
    if (!runId || !SEARCH_BACKEND) return;
    window.open(exportUrl(runId, kind), '_blank', 'noopener,noreferrer');
  }

  function resetRunView() {
    setRunId('');
    setStatus(null);
    setPreview(null);
    setMessage('');
    try { window.localStorage.removeItem('dfp2_deep_enrichment_repair_run_id'); } catch {}
  }

  if (!open) return null;

  const processed = Number(status?.processed || 0);
  const total = Number(status?.total || preview?.repair_required || 0);
  const progress = total ? Math.min(100, Math.round((processed / total) * 100)) : 0;
  const estimatedCredits = Number(preview?.repair_required || 0) * maxPages;

  return <div className="deep-enrichment-scrim" onClick={onClose}>
    <section className="deep-enrichment-modal repair-enrichment-modal" onClick={event => event.stopPropagation()}>
      <header className="deep-enrichment-head">
        <div>
          <span className="deep-enrichment-kicker">Existing evidence</span>
          <h2>Repair an enrichment run</h2>
          <p>Recover missing official-site evidence from a stored run. Existing Serper queries, source URLs, PM context and completed dossiers are preserved.</p>
        </div>
        <button className="deep-enrichment-close" onClick={onClose} aria-label="Close">×</button>
      </header>

      {!runId ? <>
        <div className="repair-enrichment-grid">
          <section className="repair-run-picker">
            <div className="repair-run-picker-head">
              <div><span>Stored runs</span><b>Select the run that needs repair</b></div>
              <button onClick={() => { setSelectedRunId(''); setArchive([]); setMessage(''); }}>Refresh</button>
            </div>
            {archiveLoading && <div className="repair-empty">Loading persistent runs…</div>}
            {!archiveLoading && !eligibleRuns.length && <div className="repair-empty"><b>No repairable run found.</b><span>Completed runs with missing official-site evidence will appear here.</span></div>}
            <div className="repair-run-list">
              {eligibleRuns.map(run => {
                const selected = selectedRunId === run.run_id;
                return <button className={selected ? 'selected' : ''} key={run.run_id} onClick={() => setSelectedRunId(run.run_id)}>
                  <span className="repair-run-radio">{selected ? '●' : '○'}</span>
                  <span className="repair-run-copy">
                    <b>{Number(run.source_total || run.total || 0).toLocaleString('en-IN')} NGOs · Deep Enrichment</b>
                    <small>{dateLabel(run.updated_at || run.created_at)}</small>
                    <em>{Number(run.already_complete || 0)} complete · {Number(run.repair_required || 0)} need official-site repair</em>
                  </span>
                  <span className="repair-run-pill">Stored</span>
                </button>;
              })}
            </div>
          </section>

          <aside className="deep-enrichment-config repair-config">
            <h3>Repair plan</h3>
            {preview ? <>
              <div className="repair-stat-grid">
                <div><span>Total NGOs</span><b>{Number(preview.source_total || 0).toLocaleString('en-IN')}</b></div>
                <div><span>Already complete</span><b>{Number(preview.already_complete || 0).toLocaleString('en-IN')}</b></div>
                <div className="attention"><span>To repair</span><b>{Number(preview.repair_required || 0).toLocaleString('en-IN')}</b></div>
                <div><span>New Serper</span><b>0</b></div>
              </div>
              <div className="repair-reuse-note"><b>{Number(preview.serper_queries_reused || 0).toLocaleString('en-IN')} stored Serper queries reused</b><small>{Number(preview.external_sources_reused || 0).toLocaleString('en-IN')} existing external sources preserved.</small></div>
            </> : <div className="repair-preview-loading">Select a run to inspect it.</div>}

            <label><span>Official-site page ceiling</span><select value={maxPages} onChange={event => setMaxPages(Number(event.target.value))}><option value={30}>30 pages</option><option value={50}>50 pages</option><option value={70}>70 pages</option><option value={100}>100 pages</option></select></label>
            <div className="deep-enrichment-estimate"><span>Maximum repair ceiling</span><b>{estimatedCredits.toLocaleString('en-IN')} credits</b><small>Only missing official websites are crawled. Already-complete NGOs are not recrawled.</small></div>

            <button className="repair-advanced-toggle" onClick={() => setAdvancedOpen(value => !value)}>{advancedOpen ? 'Hide' : 'Advanced settings'} <span>{advancedOpen ? '−' : '+'}</span></button>
            {advancedOpen && <div className="repair-advanced-panel">
              <label className="deep-enrichment-check"><input type="checkbox" checked={cleanSources} onChange={event => setCleanSources(event.target.checked)} /><span><b>Clean existing external matches</b><small>Flags clearly unrelated sources without rerunning Serper or deleting the raw source ledger.</small></span></label>
              <label className="deep-enrichment-check"><input type="checkbox" checked={useHaiku} onChange={event => setUseHaiku(event.target.checked)} /><span><b>Rebuild preliminary synthesis</b><small>Runs a blind Haiku pass after website evidence is repaired. PM rating and comment are hidden from this pass.</small></span></label>
            </div>}
          </aside>
        </div>

        {message && <p className="deep-enrichment-message">{message}</p>}
        <footer className="deep-enrichment-foot">
          <button className="quiet-btn" onClick={onClose}>Cancel</button>
          <button className="primary-red" onClick={startRepair} disabled={starting || !selectedRunId || !preview?.repair_required}>{starting ? 'Starting…' : `Start repair · ${Number(preview?.repair_required || 0)}`}</button>
        </footer>
      </> : <>
        <div className="deep-enrichment-progress-card repair-progress-card">
          <div className="deep-enrichment-progress-top"><span>{String(status?.stage || 'Loading status').replaceAll('_', ' ')}</span><b>{processed} / {total || '—'} websites</b></div>
          <div className="deep-enrichment-progress-track"><i style={{ width: `${progress}%` }} /></div>
          <div className="deep-enrichment-current">
            <b>{status?.current_ngo || (canDownload ? 'Repaired research pack ready' : 'Preparing repair')}</b>
            <span>{status?.current_step || status?.message || 'Waiting for worker'}</span>
          </div>
          <div className="deep-enrichment-metrics repair-metrics">
            <div><span>Repaired</span><b>{Number(status?.repaired_count || 0).toLocaleString('en-IN')}</b><small>official sites recovered</small></div>
            <div><span>Still partial</span><b>{Number(status?.still_partial_count || status?.remaining_repair_required || 0).toLocaleString('en-IN')}</b><small>need manual follow-up</small></div>
            <div><span>Firecrawl</span><b>{Number(status?.firecrawl_credits_used || 0).toLocaleString('en-IN')}</b><small>new credits used</small></div>
            <div><span>Serper</span><b>0</b><small>new queries</small></div>
            <div><span>Stored Serper</span><b>{Number(status?.serper_queries_reused || 0).toLocaleString('en-IN')}</b><small>queries reused</small></div>
            <div><span>Official pages</span><b>{Number(status?.official_pages_collected || 0).toLocaleString('en-IN')}</b><small>new pages added</small></div>
          </div>
          {String(status?.stage || '').toLowerCase() === 'waiting_for_firecrawl_credits' && <div className="repair-waiting-box"><b>Paused safely</b><span>Add Firecrawl credits or a usable key, then use Resume. No Serper queries are consumed while paused.</span></div>}
          {status?.error && <div className="error-box">{status.error}</div>}
        </div>

        {message && <p className="deep-enrichment-message">{message}</p>}

        {canDownload && <div className="deep-enrichment-downloads">
          <button onClick={() => openExport('packet')}><b>Repaired GPT / Fable packet</b><small>Cleaned Markdown evidence</small></button>
          <button onClick={() => openExport('zip')}><b>Full repaired ZIP</b><small>Original evidence + repairs</small></button>
          <button onClick={() => openExport('jsonl')}><b>Repaired JSONL</b><small>Structured dossiers</small></button>
          <button onClick={() => openExport('csv')}><b>Repair master CSV</b><small>Readiness and repair fields</small></button>
        </div>}

        <footer className="deep-enrichment-foot">
          <button className="quiet-btn" onClick={resetRunView}>Repair another run</button>
          <div>
            {isActive && String(status?.stage || '').toLowerCase() !== 'waiting_for_firecrawl_credits' && <button className="quiet-btn" onClick={cancelRun}>Cancel repair</button>}
            {['cancelled', 'error', 'interrupted', 'waiting_for_firecrawl_credits'].includes(String(status?.run_status || status?.stage || '').toLowerCase()) && <button className="quiet-btn" onClick={resumeRun}>Resume</button>}
            <button className="primary-red" onClick={onClose}>{canDownload ? 'Done' : 'Close — keep running'}</button>
          </div>
        </footer>
      </>}
    </section>
  </div>;
}
