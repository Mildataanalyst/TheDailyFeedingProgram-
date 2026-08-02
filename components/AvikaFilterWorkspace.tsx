'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { safeJSON, safeSearchJSON, isFailureStatus, isTerminalReady } from '@/lib/backendClient';
import { safeExternalUrl } from '@/lib/urlSafety';

type AnyRow = Record<string, any>;

export type AvikaSeed = {
  key: string;
  url?: string;
  filename?: string;
  label?: string;
  file?: File | null;
  runId?: string;
};

type Props = {
  region: string;
  onOpenPool?: () => void;
  seed?: AvikaSeed | null;
  onSeedConsumed?: () => void;
};

const POLL_MS = 2500;
const PAGE_SIZE = 80;

function field(row: AnyRow, ...keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return '';
}

function rowName(row: AnyRow) { return String(field(row, 'NGO Name', 'ngo_name', 'name') || 'Unnamed NGO'); }
function rowNgoId(row: AnyRow) { return String(field(row, 'NGO ID', 'ngo_id', 'DFP NGO ID') || ''); }
function rowSourceId(row: AnyRow) { return String(field(row, 'Source Record ID', 'source_record_id') || ''); }
function rowWebsite(row: AnyRow) { return String(field(row, 'Website', 'website', 'url') || ''); }
function rowDecision(row: AnyRow) { return String(field(row, 'Avika Decision', 'avika_decision', 'decision', 'Final Action') || '').toLowerCase(); }
function rowConfidence(row: AnyRow) { return String(field(row, 'Avika Confidence', 'AI Confidence', 'Confidence', 'confidence') || ''); }
function rowReason(row: AnyRow) { return String(field(row, 'Avika Reason Code', 'Internal Reason Code', 'reason_code') || ''); }
function rowSummary(row: AnyRow) { return String(field(row, 'Brief Description', 'avika_summary', 'summary', 'Notes', 'Internal Reason') || 'No brief description was generated.'); }
function rowLocation(row: AnyRow) { return String(field(row, 'Location', 'District', 'district', 'State', 'state') || '—'); }
function rowWebsiteMatch(row: AnyRow) { return String(field(row, 'Official Website Match', 'website_match', 'official_website_match') || ''); }
function rowKey(row: AnyRow, _index = 0) { return rowNgoId(row) || rowSourceId(row) || `${rowName(row)}|${rowWebsite(row)}`; }

function parseCsv(text: string): AnyRow[] {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"' && quoted && next === '"') { current += '"'; i += 1; continue; }
    if (ch === '"') { quoted = !quoted; continue; }
    if (ch === ',' && !quoted) { row.push(current); current = ''; continue; }
    if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && next === '\n') i += 1;
      row.push(current);
      if (row.some(cell => cell.trim())) rows.push(row);
      row = [];
      current = '';
      continue;
    }
    current += ch;
  }
  row.push(current);
  if (row.some(cell => cell.trim())) rows.push(row);
  if (!rows.length) return [];
  const headers = rows[0].map(value => value.trim());
  return rows.slice(1).map(cells => {
    const result: AnyRow = {};
    headers.forEach((header, index) => { result[header] = String(cells[index] || '').trim(); });
    return result;
  }).filter(row => rowName(row));
}

function compactReason(value: string) {
  return value ? value.replaceAll('_', ' ') : 'Review required';
}

async function csvExport(runId: string, kind: 'repository' | 'rejected'): Promise<AnyRow[]> {
  const response = await fetch(`/api/dfp-proxy/search/repository/export/${encodeURIComponent(runId)}/${kind}`, { cache: 'no-store' });
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`Could not load ${kind} CSV (${response.status}).`);
  }
  return parseCsv(await response.text());
}

function statusCopy(status: AnyRow | null) {
  if (!status) return 'Ready to run';
  const processed = Number(status.processed ?? status.done ?? 0).toLocaleString();
  const total = Number(status.total ?? 0).toLocaleString();
  const stage = String(status.stage || status.run_status || 'running').replaceAll('_', ' ');
  return `${processed} / ${total} · ${stage}`;
}

export default function AvikaFilterWorkspace({ region, onOpenPool, seed, onSeedConsumed }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pollRef = useRef<any>(null);
  const loadedSeedRef = useRef('');
  const [file, setFile] = useState<File | null>(null);
  const [batchLabel, setBatchLabel] = useState('');
  const [runId, setRunId] = useState('');
  const [status, setStatus] = useState<AnyRow | null>(null);
  const [reviewable, setReviewable] = useState<AnyRow[]>([]);
  const [rejected, setRejected] = useState<AnyRow[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<'yes' | 'maybe' | 'no'>('yes');
  const [page, setPage] = useState(0);
  const [starting, setStarting] = useState(false);
  const [polling, setPolling] = useState(false);
  const [loadingSeed, setLoadingSeed] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [recent, setRecent] = useState<AnyRow[]>([]);

  const strong = useMemo(() => reviewable.filter(row => rowDecision(row) === 'yes' || String(field(row, 'DFP Fit')).toLowerCase().includes('strong')), [reviewable]);
  const maybe = useMemo(() => reviewable.filter(row => !(rowDecision(row) === 'yes' || String(field(row, 'DFP Fit')).toLowerCase().includes('strong'))), [reviewable]);
  const visible = tab === 'yes' ? strong : tab === 'maybe' ? maybe : rejected;
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const paged = visible.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const selectedRows = reviewable.filter((row, index) => selected[rowKey(row, index)]);

  async function loadRecent() {
    const response = await safeSearchJSON('/repository/archive?limit=80');
    const rows = Array.isArray(response.data?.rows) ? response.data.rows : [];
    setRecent(rows.filter((row: AnyRow) => String(row.run_type || row.module || '').toLowerCase() === 'avika_filter').slice(0, 12));
  }

  useEffect(() => { loadRecent(); }, []);
  useEffect(() => { setPage(0); }, [tab]);

  useEffect(() => {
    if (!seed?.key || seed.key === loadedSeedRef.current) return;
    loadedSeedRef.current = seed.key;
    let cancelled = false;
    async function loadSeed() {
      setError('');
      setMessage('');
      setLoadingSeed(true);
      try {
        if (seed?.runId) {
          if (cancelled) return;
          setBatchLabel(seed.label || `Avika Fit Review · ${seed.runId.slice(-10)}`);
          await openRecent(seed.runId);
          onSeedConsumed?.();
          return;
        }
        let nextFile = seed?.file || null;
        if (!nextFile && seed?.url) {
          const response = await fetch(seed.url, { cache: 'no-store' });
          if (!response.ok) throw new Error(`Could not load prepared CSV (${response.status}).`);
          const blob = await response.blob();
          nextFile = new File([blob], seed.filename || 'avika_input.csv', { type: 'text/csv' });
        }
        if (!nextFile) throw new Error('The selected source did not provide a CSV.');
        if (cancelled) return;
        setFile(nextFile);
        setBatchLabel(seed?.label || `Avika · ${nextFile.name.replace(/\.csv$/i, '')}`);
        setMessage(`${nextFile.name} is ready for Avika Fit Review.`);
        onSeedConsumed?.();
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Could not prepare the CSV for Avika.');
      } finally {
        if (!cancelled) setLoadingSeed(false);
      }
    }
    loadSeed();
    return () => { cancelled = true; };
  }, [seed?.key]);

  async function loadOutputs(id: string) {
    setLoadingResults(true);
    setError('');
    try {
      const [goodRows, noRows] = await Promise.all([csvExport(id, 'repository'), csvExport(id, 'rejected')]);
      setReviewable(goodRows);
      setRejected(noRows);
      const defaults: Record<string, boolean> = {};
      goodRows.forEach((row, index) => {
        if (rowDecision(row) === 'yes' || String(field(row, 'DFP Fit')).toLowerCase().includes('strong')) defaults[rowKey(row, index)] = true;
      });
      setSelected(defaults);
      const yesCount = goodRows.filter(row => rowDecision(row) === 'yes' || String(field(row, 'DFP Fit')).toLowerCase().includes('strong')).length;
      setMessage(`${yesCount} strong fit · ${goodRows.length - yesCount} needs review · ${noRows.length} not fit.`);
    } catch (err: any) {
      setError(err?.message || 'Could not load Avika outputs.');
    } finally {
      setLoadingResults(false);
    }
  }

  useEffect(() => {
    if (!polling || !runId) return;
    let stopped = false;
    async function tick() {
      if (stopped) return;
      const response = await safeSearchJSON(`/repository/status/${encodeURIComponent(runId)}`);
      if (response.ok && response.data) setStatus(response.data);
      else if (response.error) setError(response.error);
      if (response.data && isTerminalReady(response.data)) {
        setPolling(false);
        await loadOutputs(runId);
        await loadRecent();
        return;
      }
      if (response.data && isFailureStatus(response.data)) {
        setPolling(false);
        setError(response.data?.error || 'Avika run failed.');
        return;
      }
      pollRef.current = setTimeout(tick, POLL_MS);
    }
    tick();
    return () => { stopped = true; if (pollRef.current) clearTimeout(pollRef.current); };
  }, [polling, runId]);

  async function start() {
    setError('');
    setMessage('');
    if (!file) { setError('Upload a CSV containing NGO name and website.'); return; }
    if (file.size > 100_000_000) { setError('CSV exceeds the 100 MB Avika upload limit.'); return; }
    const fd = new FormData();
    fd.append('file', file);
    setStarting(true);
    const response = await safeSearchJSON('/repository/start?mode=avika&run_type=avika_filter', { method: 'POST', body: fd });
    setStarting(false);
    if (!response.ok || !response.data?.run_id) {
      const rawError = response.error || 'Could not start Avika filter.';
      setError(response.status === 401
        ? 'Avika reached the wrong or outdated backend service. Deploy Worker v85 and Frontend v164; no password is required.'
        : rawError);
      return;
    }
    setRunId(String(response.data.run_id));
    setStatus(response.data);
    setReviewable([]);
    setRejected([]);
    setSelected({});
    setPolling(true);
  }

  async function openRecent(id: string) {
    setRunId(id);
    const response = await safeSearchJSON(`/repository/status/${encodeURIComponent(id)}`);
    if (response.ok && response.data) setStatus(response.data);
    if (response.data && isTerminalReady(response.data)) await loadOutputs(id);
    else setPolling(true);
  }

  function toggle(row: AnyRow, absoluteIndex: number) {
    const key = rowKey(row, absoluteIndex);
    setSelected(old => ({ ...old, [key]: !old[key] }));
  }

  function selectBucket(rows: AnyRow[], value: boolean) {
    setSelected(old => {
      const next = { ...old };
      rows.forEach((row, index) => { next[rowKey(row, index)] = value; });
      return next;
    });
  }

  async function sendSelectedToPool() {
    if (!selectedRows.length) { setError('Select at least one Strong fit or Needs review NGO.'); return; }
    const label = batchLabel.trim() || `Avika Fit Review · ${file?.name || runId.slice(-10)}`;
    const batchId = `avika_${runId || Date.now()}`;
    const enriched = selectedRows.map(row => {
      const decision = rowDecision(row) === 'yes' ? 'yes' : 'maybe';
      const summary = rowSummary(row);
      const reason = rowReason(row);
      return {
        ...row,
        ngo_id: rowNgoId(row),
        source_record_id: rowSourceId(row),
        ngo_name: rowName(row),
        district: field(row, 'Location', 'District', 'district'),
        state: field(row, 'State', 'state') || region,
        website: rowWebsite(row),
        source_type: 'Avika Filter',
        source_module: 'avika_filter',
        source_run: runId,
        source_run_id: runId,
        batch_id: batchId,
        batch_label: label,
        avika_decision: decision,
        avika_reason_code: reason,
        avika_summary: summary,
        avika_confidence: rowConfidence(row),
        website_match: rowWebsiteMatch(row),
        fit_status: decision === 'yes' ? 'Strong fit' : 'Needs review',
        one_line_understanding: summary,
        evidence_summary: summary,
        source_tag: 'Avika Filter',
        shortlisting_comment: `Avika ${decision.toUpperCase()}: ${summary}${reason ? ` Reason: ${compactReason(reason)}.` : ''}`,
        curation_status: 'pending_review',
      };
    });
    setSending(true);
    setError('');
    let added = 0;
    let existing = 0;
    try {
      for (let offset = 0; offset < enriched.length; offset += 200) {
        const chunk = enriched.slice(offset, offset + 200);
        const response = await safeJSON(`/workspace/${encodeURIComponent(region)}/lead-pool/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ source_type: 'Avika Filter', rows: chunk }),
        });
        if (!response.ok) throw new Error(response.error || 'Could not import selected NGOs.');
        added += Number(response.data?.added || 0);
        existing += Number(response.data?.already_existing_count || response.data?.updated || 0);
      }
      setMessage(`${added} added to the Shortlisting Pool. ${existing} already existed and were updated without duplication.`);
      if (onOpenPool) onOpenPool();
    } catch (err: any) {
      setError(err?.message || 'Could not send selected NGOs to the Shortlisting Pool.');
    } finally {
      setSending(false);
    }
  }

  return <section className="avika-workspace">
    <div className="avika-hero-row">
      <div>
        <span className="red-kicker compact-kicker">No Serper searches</span>
        <h2>Avika Fit Review</h2>
        <p>Upload verified-website CSVs. The worker fetches each supplied site, removes obvious non-fits with deterministic rules, and uses compact Haiku classification for DFP fit plus one brief description.</p>
      </div>
      <div className="avika-cost-card"><b>Low-cost mode · routing v164</b><span>YES / MAYBE / NO</span><small>20–35 word description · no partner/story enrichment</small></div>
    </div>

    <div className="avika-upload-card">
      <div className={`avika-upload-box ${loadingSeed ? 'loading' : ''}`} onClick={() => inputRef.current?.click()}>
        <span>Verified websites CSV</span>
        <b>{loadingSeed ? 'Preparing CSV…' : file?.name || 'Choose CSV'}</b>
        <small>Required: name or NGO Name, website. Keep NGO ID and Source Record ID when available.</small>
      </div>
      <input ref={inputRef} type="file" accept=".csv" hidden onChange={event => {
        const next = event.target.files?.[0] || null;
        setFile(next);
        setError('');
        setMessage('');
        if (next) setBatchLabel(`Avika · ${next.name.replace(/\.csv$/i, '')}`);
      }} />
      <label className="avika-batch-label"><span>Batch name</span><input value={batchLabel} onChange={event => setBatchLabel(event.target.value)} placeholder="Example: Karnataka Recovery · Stage 1" /></label>
      <a className="quiet-btn avika-sample-link" href="/avika_fit_sample.csv" download>Sample CSV</a>
      <button className="primary-red" disabled={starting || polling || loadingSeed || !file} onClick={start}>{starting ? 'Starting…' : polling ? 'Avika running…' : 'Run Avika Filter'}</button>
    </div>

    {(status || runId) && <div className="avika-run-strip">
      <div><span>Current run</span><b>{statusCopy(status)}</b><small>{runId}</small></div>
      <div className="avika-run-counts"><span><b>{Number(status?.shortlisted || 0).toLocaleString()}</b> strong</span><span><b>{Number(status?.maybe || 0).toLocaleString()}</b> maybe</span><span><b>{Number(status?.rejected || status?.rejected_rows || 0).toLocaleString()}</b> no</span></div>
      {runId && isTerminalReady(status) && <button className="quiet-btn" onClick={() => loadOutputs(runId)}>{loadingResults ? 'Loading…' : 'Reload results'}</button>}
    </div>}

    {error && <div className="error-box">{error}</div>}
    {message && <div className="pool-message">{message}</div>}

    {(reviewable.length > 0 || rejected.length > 0) && <>
      <div className="avika-review-toolbar">
        <div className="avika-review-tabs">
          <button className={tab === 'yes' ? 'active' : ''} onClick={() => setTab('yes')}>Strong fit <b>{strong.length}</b></button>
          <button className={tab === 'maybe' ? 'active' : ''} onClick={() => setTab('maybe')}>Needs review <b>{maybe.length}</b></button>
          <button className={tab === 'no' ? 'active' : ''} onClick={() => setTab('no')}>Not fit <b>{rejected.length}</b></button>
        </div>
        <div className="avika-select-actions">
          {tab !== 'no' && <><button className="quiet-btn" onClick={() => selectBucket(visible, true)}>Select all in bucket</button><button className="quiet-btn" onClick={() => selectBucket(visible, false)}>Clear bucket</button></>}
          <button className="primary-red small-red" disabled={!selectedRows.length || sending} onClick={sendSelectedToPool}>{sending ? 'Sending…' : `Send ${selectedRows.length} selected to Shortlisting Pool`}</button>
        </div>
      </div>

      <div className="avika-result-grid">
        {paged.map((row, index) => {
          const absolute = page * PAGE_SIZE + index;
          const key = rowKey(row, absolute);
          const decision = tab === 'no' ? 'no' : rowDecision(row) === 'yes' ? 'yes' : 'maybe';
          const url = safeExternalUrl(rowWebsite(row));
          return <article className={`avika-result-card decision-${decision}`} key={key}>
            <div className="avika-result-head">
              {tab !== 'no' && <input type="checkbox" checked={Boolean(selected[key])} onChange={() => toggle(row, absolute)} aria-label={`Select ${rowName(row)}`} />}
              <div><span>{decision === 'yes' ? 'Strong DFP fit' : decision === 'maybe' ? 'Needs human review' : 'Not a DFP fit'}</span><h3>{rowName(row)}</h3><small>{rowLocation(row)}</small></div>
              <em>{rowConfidence(row) || '—'}</em>
            </div>
            <p>{rowSummary(row)}</p>
            <div className="avika-card-meta"><span>Reason: <b>{compactReason(rowReason(row))}</b></span><span>Website match: <b>{rowWebsiteMatch(row) || '—'}</b></span></div>
            <div className="avika-card-foot">{url ? <a href={url} target="_blank" rel="noopener noreferrer">Open website ↗</a> : <span>No website</span>}{rowNgoId(row) && <button title={rowNgoId(row)} onClick={() => navigator.clipboard?.writeText(rowNgoId(row))}>ID · {rowNgoId(row).slice(-6)}</button>}</div>
          </article>;
        })}
        {!paged.length && <div className="muted-empty">No rows in this bucket.</div>}
      </div>
      {pages > 1 && <div className="avika-pagination"><button disabled={page <= 0} onClick={() => setPage(value => Math.max(0, value - 1))}>← Previous</button><span>Page {page + 1} of {pages}</span><button disabled={page + 1 >= pages} onClick={() => setPage(value => Math.min(pages - 1, value + 1))}>Next →</button></div>}
    </>}

    <details className="avika-recent-runs">
      <summary>Recent Avika runs <span>{recent.length}</span></summary>
      <div>{recent.length ? recent.map(row => <button key={row.run_id} onClick={() => openRecent(String(row.run_id))}><b>{row.label || 'Avika Fit Review'}</b><small>{row.updated_at || row.run_id} · {row.processed || 0}/{row.total || 0}</small></button>) : <p>No Avika runs yet.</p>}</div>
    </details>
  </section>;
}
