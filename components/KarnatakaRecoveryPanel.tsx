'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BACKEND, BACKEND_CONFIG_ERROR, SEARCH_BACKEND, SEARCH_BACKEND_CONFIG_ERROR, safeJSON, safeSearchJSON } from '@/lib/backendClient';

type AnyRow = Record<string, any>;

type ModeKey =
  | 'regression_test'
  | 'known_url_identity'
  | 'saved_candidate_fetch'
  | 'missing_query_only'
  | 'enhanced_search'
  | 'new_unlinked'
  | 'identity_collision'
  | 'firecrawl_retry';

type ModeSpec = {
  label: string;
  description: string;
  maxQueries: number;
  defaultConcurrency: number;
  fileHint: string;
  sequence: string;
  tone: 'test' | 'zero' | 'search' | 'review' | 'firecrawl';
};

const MODE_SPECS: Record<ModeKey, ModeSpec> = {
  regression_test: {
    label: 'Optional technical audit',
    description: 'Optional audit lane for the historical 44-NGO cohort. Production stages are not gated by this file; the worker now runs a built-in ownership self-test before every run.',
    maxQueries: 4,
    defaultConcurrency: 4,
    fileHint: 'TEST_05_all_partner_recommendations_44.csv',
    sequence: 'Optional — not required',
    tone: 'test',
  },
  known_url_identity: {
    label: '1. Verify known URLs / saved candidates',
    description: 'Zero-query recovery for all retained URLs and saved candidates. It fetches and verifies identity without spending Serper credits.',
    maxQueries: 0,
    defaultConcurrency: 12,
    fileHint: 'RUN_01_zero_query_known_urls_6091.csv',
    sequence: 'Start here — zero Serper queries',
    tone: 'zero',
  },
  saved_candidate_fetch: {
    label: '3. Verify saved candidates',
    description: 'Zero-query recovery for saved candidates and timeout rows. Existing candidates are verified before any fresh search is considered.',
    maxQueries: 0,
    defaultConcurrency: 12,
    fileHint: '03A / 03B_SAVED_CANDIDATE_FETCH.csv',
    sequence: 'Run before any search queue',
    tone: 'zero',
  },
  missing_query_only: {
    label: '2. Run the missing query only',
    description: 'Runs exactly one missing logical query per source record. Temporary provider retries do not consume another logical query; exhausted credits pause the run safely.',
    maxQueries: 1,
    defaultConcurrency: 12,
    fileHint: 'RUN_02_missing_query_only_10138.csv',
    sequence: 'Lowest-cost search queue',
    tone: 'search',
  },
  new_unlinked: {
    label: '4. New / unlinked Darpan records',
    description: 'Full staged discovery for source rows that could not be defensibly linked to a historical run. Every source record remains separate.',
    maxQueries: 4,
    defaultConcurrency: 12,
    fileHint: 'RUN_04_new_unlinked_2035.csv',
    sequence: 'Run after missing-query files',
    tone: 'search',
  },
  enhanced_search: {
    label: '3. Enhanced historical recovery',
    description: 'Uses legal name, referral/public name, acronym, spelling variants, address, pincode and project-parent links. Directories remain evidence only.',
    maxQueries: 3,
    defaultConcurrency: 12,
    fileHint: 'RUN_03A_enhanced_recovery_part1_10102.csv, then RUN_03B_part2_10102.csv',
    sequence: 'Largest search queue',
    tone: 'search',
  },
  identity_collision: {
    label: '5. Same-name identity collisions',
    description: 'Processes same-name and same-district source rows independently. Registration and address evidence are used to distinguish the real entities.',
    maxQueries: 3,
    defaultConcurrency: 6,
    fileHint: 'RUN_05_identity_collisions_search_376.csv',
    sequence: 'Run after the normal queues',
    tone: 'review',
  },
  firecrawl_retry: {
    label: '6. Firecrawl retry — optional',
    description: 'No Serper. Direct HTTP is tried first; Firecrawl is spent only on blocked, SSL or JavaScript-heavy candidates. Use the retry CSV produced by a prior run.',
    maxQueries: 0,
    defaultConcurrency: 4,
    fileHint: '08_FIRECRAWL_RETRY_SEED.csv or a generated retry CSV',
    sequence: 'Only for unresolved fetch failures',
    tone: 'firecrawl',
  },
};

const MODE_ORDER: ModeKey[] = [
  'known_url_identity',
  'missing_query_only',
  'enhanced_search',
  'new_unlinked',
  'identity_collision',
  'firecrawl_retry',
];

const DOWNLOADS: Array<{kind: string; label: string}> = [
  { kind: 'results', label: 'Results CSV' },
  { kind: 'repository', label: 'Avika-filtered CSV' },
  { kind: 'manual_review', label: 'Manual identity review' },
  { kind: 'no_site', label: 'No-site terminal rows' },
  { kind: 'retry', label: 'Next retry CSV' },
  { kind: 'avika_input', label: 'Avika input' },
  { kind: 'audit', label: 'Full audit' },
  { kind: 'query_plan', label: 'Query plan' },
  { kind: 'summary', label: 'Summary' },
  { kind: 'errors', label: 'Errors' },
];

function n(value: unknown): number {
  const out = Number(value);
  return Number.isFinite(out) ? out : 0;
}

function formatNumber(value: unknown): string {
  return n(value).toLocaleString();
}

function formatDuration(value: unknown): string {
  const total = Math.max(0, Math.floor(n(value)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function terminal(status: AnyRow | null): boolean {
  const state = String(status?.run_status || status?.stage || '').toLowerCase();
  return ['completed', 'complete', 'cancelled', 'canceled', 'error', 'failed', 'paused', 'interrupted'].includes(state)
    || ['results_ready', 'completed', 'cancelled', 'error', 'interrupted_restart'].includes(String(status?.stage || '').toLowerCase());
}

function live(status: AnyRow | null): boolean {
  const state = String(status?.run_status || '').toLowerCase();
  return ['starting', 'running', 'resuming', 'pause_requested', 'cancel_requested'].includes(state);
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function sampleCsv() {
  return [
    'ngo_id,source_record_id,name,district,state,registration_reference,registered_address,pincode,website,recheck_candidate_url,referral_name,public_name,project_name,parent_organisation,failed_query_passes,next_action,recovery_mode_override',
    ',sample-001,Example Education Trust,Bengaluru Urban,Karnataka,REG-001,"12 Example Road Bengaluru",560001,https://example.org,,,,,,KNOWN_URL_IDENTITY_CHECK,known_url_identity',
  ].join('\n');
}

type Props = {
  poolBusy?: boolean;
  onSendToLeadPool?: (runId: string) => void;
};

export default function KarnatakaRecoveryPanel({ poolBusy = false, onSendToLeadPool }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [mode, setMode] = useState<ModeKey>('known_url_identity');
  const [file, setFile] = useState<File | null>(null);
  const [runId, setRunId] = useState('');
  const [status, setStatus] = useState<AnyRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [controlBusy, setControlBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [concurrency, setConcurrency] = useState(MODE_SPECS.known_url_identity.defaultConcurrency);
  const [serperConcurrency, setSerperConcurrency] = useState(4);
  const [serperCreditBudget, setSerperCreditBudget] = useState(59000);
  const [preflight, setPreflight] = useState(true);
  const [useFirecrawl, setUseFirecrawl] = useState(false);
  const [firecrawlBudget, setFirecrawlBudget] = useState(5000);
  const [runAvika, setRunAvika] = useState(false);
  const [rowDeadline, setRowDeadline] = useState(90);
  const [capacityBusy, setCapacityBusy] = useState(false);
  const [capacity, setCapacity] = useState<AnyRow | null>(null);
  const [lastContact, setLastContact] = useState<number | null>(null);
  const [recentRuns, setRecentRuns] = useState<AnyRow[]>([]);
  const [runsBusy, setRunsBusy] = useState(false);
  const [idStatus, setIdStatus] = useState<AnyRow | null>(null);
  const [idBusy, setIdBusy] = useState(false);
  const [idMessage, setIdMessage] = useState('');

  const modeSpec = MODE_SPECS[mode];
  const forcedFirecrawl = mode === 'firecrawl_retry';
  const firecrawlEnabled = forcedFirecrawl || useFirecrawl;
  const progress = Math.max(0, Math.min(100, n(status?.progress_pct || (n(status?.total) ? (n(status?.processed) / n(status?.total)) * 100 : 0))));
  const ownershipSelfTest = capacity?.ownership_self_test || status?.summary?.ownership_self_test || status?.ownership_self_test;
  const canStart = !!file && !busy && !live(status) && ownershipSelfTest?.passed !== false;
  const statusDownloads = status?.downloads && typeof status.downloads === 'object' ? status.downloads : {};
  const queryUsage = `${formatNumber(status?.queries_used)} / ${formatNumber(status?.query_cap || status?.estimated_maximum_queries)}`;
  const elapsed = n(status?.elapsed_seconds || status?.active_elapsed_sec);

  const providerRows = useMemo(() => {
    const rows: Array<AnyRow & { provider: string }> = [];
    const serper = Array.isArray(status?.serper_account_stats) ? status.serper_account_stats : Array.isArray(capacity?.serper_account_stats) ? capacity.serper_account_stats : Array.isArray(status?.serper_key_stats) ? status.serper_key_stats : Array.isArray(capacity?.serper_key_stats) ? capacity.serper_key_stats : [];
    const firecrawl = Array.isArray(status?.firecrawl_key_stats) ? status.firecrawl_key_stats : Array.isArray(capacity?.firecrawl_key_stats) ? capacity.firecrawl_key_stats : [];
    serper.forEach((row: AnyRow) => rows.push({ ...row, provider: 'Serper' }));
    firecrawl.forEach((row: AnyRow) => rows.push({ ...row, provider: 'Firecrawl' }));
    return rows;
  }, [status, capacity]);

  const clearPoll = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  const loadStatus = useCallback(async (id: string, quiet = false) => {
    if (!id) return;
    const response = await safeSearchJSON(`/karnataka-recovery/status/${encodeURIComponent(id)}`);
    if (!response.ok || !response.data?.ok) {
      if (!quiet) setError(response.error || response.data?.error || 'Could not load Karnataka Recovery status.');
      return;
    }
    setStatus(response.data);
    setLastContact(Date.now());
    if (terminal(response.data) && !live(response.data)) clearPoll();
  }, [clearPoll]);

  const beginPolling = useCallback((id: string) => {
    clearPoll();
    void loadStatus(id, true);
    pollRef.current = setInterval(() => void loadStatus(id, true), 2500);
  }, [clearPoll, loadStatus]);

  const loadRecentRuns = useCallback(async () => {
    setRunsBusy(true);
    const response = await safeSearchJSON('/karnataka-recovery/runs?limit=20');
    setRunsBusy(false);
    if (response.ok && response.data?.ok && Array.isArray(response.data.runs)) setRecentRuns(response.data.runs);
  }, []);

  const loadIdStatus = useCallback(async () => {
    if (!BACKEND) return;
    setIdBusy(true);
    const response = await safeJSON('/admin/ngo-ids/status');
    setIdBusy(false);
    if (response.ok && response.data?.ok) setIdStatus(response.data);
    else setIdMessage(response.error || response.data?.error || 'Could not load the NGO ID registry.');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('dfp2:last-karnataka-recovery-run-id') || '';
    if (saved) {
      setRunId(saved);
      beginPolling(saved);
    }
    void loadRecentRuns();
    void loadIdStatus();
    return clearPoll;
  }, [beginPolling, clearPoll, loadIdStatus, loadRecentRuns]);

  function chooseMode(next: ModeKey) {
    setMode(next);
    setConcurrency(MODE_SPECS[next].defaultConcurrency);
    setUseFirecrawl(next === 'firecrawl_retry');
    setRunAvika(false);
    setFile(null);
    setError('');
    setMessage('');
    if (inputRef.current) inputRef.current.value = '';
  }

  async function checkCapacity() {
    setCapacityBusy(true);
    setError('');
    const response = await safeSearchJSON(`/karnataka-recovery/capacity?serper_concurrency=${encodeURIComponent(serperConcurrency)}&include_firecrawl=${firecrawlEnabled ? 'true' : 'false'}&firecrawl_budget=${encodeURIComponent(firecrawlBudget)}`);
    setCapacityBusy(false);
    if (!response.ok || !response.data?.ok) {
      setError(response.error || response.data?.error || 'Could not check provider capacity.');
      return;
    }
    setCapacity(response.data);
    const funded = n(response.data?.healthy_serper_accounts ?? response.data?.healthy_serper_keys);
    const effective = n(response.data?.recommended_max_concurrency);
    const ownershipOk = response.data?.ownership_self_test?.passed === true;
    setMessage(ownershipOk
      ? (funded ? `Strict ownership self-test passed. The Serper account is healthy; safe search concurrency: ${effective}.` : 'Strict ownership self-test passed. The Serper account is unavailable, but zero-query modes can still run.')
      : 'The worker ownership self-test did not pass. The backend will refuse to start a recovery run.');
  }

  async function startRun() {
    if (!file) {
      setError(`Upload ${modeSpec.fileHint} first.`);
      return;
    }
    if (!SEARCH_BACKEND) {
      setError(SEARCH_BACKEND_CONFIG_ERROR);
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    const form = new FormData();
    form.append('file', file);
    const query = new URLSearchParams({
      mode,
      concurrency: String(Math.max(1, Math.min(64, concurrency))),
      serper_concurrency: String(Math.max(1, Math.min(8, serperConcurrency))),
      serper_credit_budget: String(Math.max(0, serperCreditBudget)),
      query_cap: '0',
      preflight: String(preflight),
      use_firecrawl: String(firecrawlEnabled),
      firecrawl_budget: String(firecrawlEnabled ? Math.max(1, firecrawlBudget) : 0),
      firecrawl_proxy: 'basic',
      run_avika: String(runAvika),
      row_deadline_seconds: String(Math.max(20, Math.min(240, rowDeadline))),
    });
    const response = await safeSearchJSON(`/karnataka-recovery/start?${query.toString()}`, { method: 'POST', body: form });
    setBusy(false);
    if (!response.ok || !response.data?.ok) {
      setError(response.error || response.data?.error || 'Could not start Karnataka Recovery.');
      return;
    }
    const id = String(response.data.run_id || '');
    setRunId(id);
    setStatus({ ...response.data, run_status: 'starting', stage: 'queued' });
    if (typeof window !== 'undefined') window.localStorage.setItem('dfp2:last-karnataka-recovery-run-id', id);
    setMessage(`Started ${modeSpec.label}. The worker will checkpoint each source record.`);
    beginPolling(id);
    void loadRecentRuns();
  }

  async function backfillNgoIds() {
    if (!BACKEND) { setIdMessage(BACKEND_CONFIG_ERROR); return; }
    setIdBusy(true);
    setIdMessage('Backfilling IDs across historical shortlisting stores…');
    const response = await safeJSON('/admin/ngo-ids/backfill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    setIdBusy(false);
    if (!response.ok || !response.data?.ok) {
      setIdMessage(response.error || response.data?.error || 'NGO ID backfill failed.');
      return;
    }
    setIdStatus(response.data.inventory || null);
    const report = response.data.report || {};
    setIdMessage(`Backfill complete: ${formatNumber(report.workstream_tasks)} shortlist tasks, ${formatNumber(report.lead_pool_rows)} Lead Pool rows and ${formatNumber(report.contact_tracker_rows)} tracker rows checked.`);
  }

  async function control(action: 'pause' | 'resume' | 'cancel') {
    if (!runId) return;
    setControlBusy(true);
    setError('');
    const response = await safeSearchJSON(`/karnataka-recovery/${action}/${encodeURIComponent(runId)}`, { method: 'POST' });
    setControlBusy(false);
    if (!response.ok || !response.data?.ok) {
      setError(response.error || response.data?.error || `Could not ${action} the run.`);
      return;
    }
    setMessage(`${action[0].toUpperCase()}${action.slice(1)} requested.`);
    beginPolling(runId);
  }

  function exportUrl(kind: string) {
    return SEARCH_BACKEND && runId
      ? `/api/dfp-proxy/search/karnataka-recovery/export/${encodeURIComponent(runId)}/${encodeURIComponent(kind)}`
      : '#';
  }

  function clearActiveView() {
    clearPoll();
    setRunId('');
    setStatus(null);
    setError('');
    setMessage('');
    if (typeof window !== 'undefined') window.localStorage.removeItem('dfp2:last-karnataka-recovery-run-id');
  }

  return <div id="run-panel-karnataka-recovery" className="karnataka-recovery-panel">
    <div className="karnataka-recovery-head">
      <div>
        <span className="recovery-mode-kicker">Final source-record recovery system · UI v160</span>
        <h3>Karnataka Recovery</h3>
        <p>Start with the known-URL CSV, then run the search queues in order. Every candidate is revalidated under the same ownership rules; historical labels are not trusted, and a name mention alone can never establish an official website.</p>
      </div>
      <div className="karnataka-head-actions">
        <button className="ghost-btn" onClick={() => downloadText('karnataka_recovery_sample.csv', sampleCsv())}>Sample CSV</button>
        <button className="ghost-btn" disabled={capacityBusy} onClick={checkCapacity}>{capacityBusy ? 'Checking account…' : 'Check Serper account'}</button>
      </div>
    </div>

    <div className="karnataka-mode-grid">
      {MODE_ORDER.map(key => {
        const spec = MODE_SPECS[key];
        return <button key={key} type="button" className={`karnataka-mode-card ${spec.tone} ${mode === key ? 'active' : ''}`} onClick={() => chooseMode(key)}>
          <span>{spec.sequence}</span>
          <b>{spec.label}</b>
          <small>{spec.description}</small>
          <code>{spec.fileHint}</code>
          <em>{spec.maxQueries === 0 ? '0 Serper queries per row' : `up to ${spec.maxQueries} logical ${spec.maxQueries === 1 ? 'query' : 'queries'} per row`}</em>
        </button>;
      })}
    </div>

    {status?.mode === 'regression_test' && status?.summary && <div className={`karnataka-regression-gate ${status.summary.regression_passed ? 'passed' : 'failed'}`}>
      <b>{status.summary.regression_passed ? 'Optional audit passed' : 'Optional audit found failures'}</b>
      <span>{status.summary.regression_passed
        ? `${formatNumber(status.summary.processed_rows)} audit rows completed with no expected-outcome failures.`
        : `${formatNumber(status.summary.regression_status_counts?.fail)} expected-outcome failures. Download Results CSV and Summary for review.`}</span>
      {!status.summary.regression_passed && Array.isArray(status.summary.regression_failures) && status.summary.regression_failures.length > 0 && <small>{status.summary.regression_failures.slice(0, 5).map((row: AnyRow) => `${row.name}: ${row.reason}`).join(' · ')}</small>}
    </div>}


    <div className="karnataka-run-builder">
      <div className="karnataka-selected-mode">
        <span>Selected stage</span>
        <b>{modeSpec.label}</b>
        <small>Upload: {modeSpec.fileHint}</small>
      </div>
      <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={event => setFile(event.target.files?.[0] || null)} />
      <button className="ghost-btn karnataka-file-button" onClick={() => inputRef.current?.click()}>{file ? file.name : 'Choose prepared CSV'}</button>
      <button className="primary-red small-red" disabled={!canStart} onClick={startRun}>{busy ? 'Starting…' : `Start ${modeSpec.label.replace(/^\d+\.\s*/, '')}`}</button>
    </div>

    <div className="karnataka-settings-grid">
      <label><span>Requested row concurrency</span><input type="number" min={1} max={64} value={concurrency} onChange={event => setConcurrency(Math.max(1, Math.min(64, n(event.target.value))))}/><small>Search modes are clamped to the single Serper account limit; zero-query verification can run more rows.</small></label>
      <label><span>Serper account concurrency</span><input type="number" min={1} max={8} value={serperConcurrency} onChange={event => setSerperConcurrency(Math.max(1, Math.min(8, n(event.target.value))))}/><small>Recommended first run: 4. Raise to 6–8 only after observing stable throughput on the first production batch.</small></label>
      <label><span>Per-row deadline</span><input type="number" min={20} max={240} value={rowDeadline} onChange={event => setRowDeadline(Math.max(20, Math.min(240, n(event.target.value))))}/><small>Checkpointed on timeout; work is retained.</small></label>
      <label className="karnataka-check"><input type="checkbox" checked={preflight} onChange={event => setPreflight(event.target.checked)}/><span><b>Preflight the Serper account</b><small>One low-cost query checks that the configured account is funded before bulk work starts.</small></span></label>
      <label className="karnataka-check"><input type="checkbox" checked={firecrawlEnabled} disabled={forcedFirecrawl} onChange={event => setUseFirecrawl(event.target.checked)}/><span><b>Allow selective Firecrawl</b><small>Off by default. Direct HTTP always runs first.</small></span></label>
      <label className="karnataka-check"><input type="checkbox" checked={runAvika} onChange={event => setRunAvika(event.target.checked)}/><span><b>Run Avika / DFP-fit filter after discovery</b><small>Keep off during website recovery; run DFP-fit only on the final verified-site export.</small></span></label>
      <label className="karnataka-credit-field enabled"><span>Serper run-credit ceiling</span><input type="number" min={0} max={1000000} value={serperCreditBudget} onChange={event => setSerperCreditBudget(Math.max(0, n(event.target.value)))}/><small>Set to 59,000 for the current account. One preflight query is kept as headroom.</small></label>
      <label className={`karnataka-credit-field ${firecrawlEnabled ? 'enabled' : ''}`}><span>Firecrawl run-credit ceiling</span><input type="number" min={1} max={100000} disabled={!firecrawlEnabled} value={firecrawlBudget} onChange={event => setFirecrawlBudget(Math.max(1, n(event.target.value)))}/><small>Optional. Direct HTTP runs first; suggested maximum: 5,000.</small></label>
    </div>

    {capacity && <div className="karnataka-capacity-strip">
      <b>Preflight</b>
      <span>{ownershipSelfTest?.passed ? `Strict ownership self-test passed (${formatNumber(ownershipSelfTest.cases)} cases)` : 'Strict ownership self-test failed'}</span>
      <span>{n(capacity.healthy_serper_accounts ?? capacity.healthy_serper_keys) ? 'Serper account healthy' : 'Serper account unavailable'}</span>
      <span>recommended max concurrency {formatNumber(capacity.recommended_max_concurrency)}</span>
      {capacity.firecrawl_configured ? <span>Firecrawl configured</span> : <span>Firecrawl not configured</span>}
    </div>}

    <div className="ngo-id-registry-card">
      <div className="ngo-id-registry-copy"><span>Permanent identifier layer</span><b>DFP NGO ID Registry</b><small>Every Lead Pool, PM shortlisting, final-ranking and Contact Tracker record carries one immutable <code>DFP-NGO-XXXXXXXXXXXXXXXX</code> ID. Historical records are backfilled without deleting or deduplicating anything.</small></div>
      <div className="ngo-id-registry-stats"><div><span>Unique IDs</span><b>{idStatus ? formatNumber(idStatus.unique_ngo_ids) : '—'}</b></div><div><span>Shortlist tasks</span><b>{idStatus ? formatNumber(idStatus.workstream_tasks) : '—'}</b></div><div><span>Lead Pool rows</span><b>{idStatus ? formatNumber(idStatus.lead_pool_rows) : '—'}</b></div><div><span>Tracker rows</span><b>{idStatus ? formatNumber(idStatus.contact_tracker_rows) : '—'}</b></div></div>
      <div className="ngo-id-registry-actions"><small>No password required.</small><button className="ghost-btn" disabled={idBusy} onClick={loadIdStatus}>{idBusy ? 'Working…' : 'Refresh ID status'}</button><button className="primary-red small-red" disabled={idBusy} onClick={backfillNgoIds}>Backfill historical IDs</button>{BACKEND ? <a className="dark-download ready" href="/api/dfp-proxy/core/admin/ngo-ids/export.csv">Export ID registry</a> : null}</div>
      {idMessage && <small className="ngo-id-registry-message">{idMessage}</small>}
    </div>

    {runId && <div className="karnataka-live-run">
      <div className="karnataka-live-head">
        <div><span>{status?.mode_label || modeSpec.label}</span><code>{runId}</code></div>
        <div className="karnataka-live-actions">
          {status?.can_pause && <button className="ghost-btn" disabled={controlBusy} onClick={() => control('pause')}>Pause after in-flight rows</button>}
          {status?.can_resume && <button className="primary-red small-red" disabled={controlBusy} onClick={() => control('resume')}>Resume checkpoints</button>}
          {status?.can_cancel && <button className="ghost-btn danger" disabled={controlBusy} onClick={() => control('cancel')}>End &amp; save</button>}
          {!live(status) && <button className="ghost-btn" onClick={clearActiveView}>Clear view</button>}
        </div>
      </div>
      <div className="karnataka-progress-track"><i style={{ width: `${progress}%` }}/></div>
      <div className="karnataka-stat-grid">
        <div><span>Source records</span><b>{formatNumber(status?.processed)} / {formatNumber(status?.total)}</b><small>{formatNumber(status?.remaining)} left</small></div>
        <div><span>Logical queries</span><b>{queryUsage}</b><small>{formatNumber(status?.provider_attempts)} provider attempts</small></div>
        <div><span>Concurrency</span><b>{formatNumber(status?.effective_concurrency || 0)}</b><small>requested {formatNumber(status?.requested_concurrency)}</small></div>
        <div><span>Firecrawl</span><b>{formatNumber(status?.firecrawl_credits_used)} / {formatNumber(status?.firecrawl_budget)}</b><small>credits spent / ceiling</small></div>
        <div><span>Status</span><b>{String(status?.run_status || status?.stage || 'starting')}</b><small>{progress.toFixed(1)}% complete</small></div>
        <div><span>Elapsed</span><b>{formatDuration(elapsed)}</b><small>{lastContact ? `updated ${Math.max(0, Math.floor((Date.now() - lastContact) / 1000))}s ago` : 'waiting for worker'}</small></div>
      </div>
      {status?.message && <div className="karnataka-run-message">{String(status.message)}</div>}
      <div className="karnataka-downloads">
        {DOWNLOADS.map(item => statusDownloads[item.kind] ? <a key={item.kind} className="dark-download ready" href={exportUrl(item.kind)}>{item.label}</a> : null)}
        {statusDownloads.repository && onSendToLeadPool && <button className="dark-download ready" disabled={poolBusy} onClick={() => onSendToLeadPool(runId)}>Send verified output to Lead Pool</button>}
      </div>
    </div>}

    <div className="karnataka-recent-runs">
      <div className="karnataka-provider-head"><b>Recent Karnataka Recovery runs</b><button className="quiet-btn" disabled={runsBusy} onClick={loadRecentRuns}>{runsBusy ? 'Refreshing…' : 'Refresh'}</button></div>
      {recentRuns.length ? <div className="karnataka-run-list">{recentRuns.map((row, index) => {
        const id = String(row.run_id || '');
        return <div className="karnataka-run-row" key={`${id}-${index}`}><div><b>{String(row.mode_label || row.mode || 'Karnataka Recovery')}</b><small>{id} · {String(row.run_status || row.stage || 'saved')} · {formatNumber(row.processed)}/{formatNumber(row.total)} rows · {formatNumber(row.queries_used)} logical queries</small></div><div><button className="ghost-btn" disabled={!id} onClick={() => { setRunId(id); setStatus(row); if (typeof window !== 'undefined') window.localStorage.setItem('dfp2:last-karnataka-recovery-run-id', id); beginPolling(id); }}>Open</button>{row.downloads?.summary && id ? <a className="dark-download ready" href={`/api/dfp-proxy/search/karnataka-recovery/export/${encodeURIComponent(id)}/summary`}>Summary</a> : null}</div></div>;
      })}</div> : <small className="karnataka-safety-note">No saved Karnataka Recovery runs were returned yet.</small>}
    </div>

    {providerRows.length > 0 && <div className="karnataka-provider-table">
      <div className="karnataka-provider-head"><b>Provider-account status</b><small>The Serper key is masked. Temporary provider attempts do not consume another NGO logical query.</small></div>
      <div className="scroll-table"><table><thead><tr><th>Provider</th><th>Key</th><th>State</th><th>Requests</th><th>Successes</th><th>Failures</th><th>Credits remaining</th><th>Last error</th></tr></thead><tbody>{providerRows.map((row, index) => <tr key={`${row.provider}-${row.key}-${index}`}><td>{row.provider}</td><td><code>{String(row.key || '—')}</code></td><td><span className={`karnataka-key-state ${String(row.state || '').toLowerCase()}`}>{String(row.state || 'unknown')}</span></td><td>{formatNumber(row.requests)}</td><td>{formatNumber(row.successes)}</td><td>{formatNumber(row.failures)}</td><td>{row.remaining_credits == null ? '—' : formatNumber(row.remaining_credits)}</td><td>{String(row.last_error || '—').slice(0, 120)}</td></tr>)}</tbody></table></div>
    </div>}

    {message && <div className="pool-message">{message}</div>}
    {error && <div className="error-box">{error}</div>}
    <small className="karnataka-safety-note">Only one Karnataka Recovery batch runs at a time. The worker runs a deterministic ownership guard before accepting any upload, uses the single SERPER_API_KEY account, checkpoints each completed source record, and continues independently if this browser tab closes.</small>
  </div>;
}
