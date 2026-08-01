'use client';

import { useEffect, useMemo, useState } from 'react';
import { safeJSON, BACKEND } from '@/lib/backendClient';
import { safeExternalUrl } from '@/lib/urlSafety';

type AnyRow = Record<string, any>;
type Props = { region: string };
type Bucket = 'pending' | 'approved' | 'followup' | 'hold' | 'sent' | 'all';

const PM_NAMES = ['Milan', 'Avika', 'Piyush', 'Kamran', 'Ipshita', 'Rachit', 'Tanishq'];

function field(row: AnyRow, ...keys: string[]) {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return '';
}
function nameOf(row: AnyRow) { return String(field(row, 'ngo_name', 'NGO Name', 'name') || 'Unnamed NGO'); }
function locationOf(row: AnyRow) { return String(field(row, 'district', 'District', 'Location', 'region') || '—'); }
function websiteOf(row: AnyRow) { return String(field(row, 'website', 'Website', 'url') || ''); }
function idOf(row: AnyRow) { return String(field(row, 'ngo_id', 'NGO ID') || ''); }
function leadId(row: AnyRow) { return String(row.lead_id || ''); }
function statusOf(row: AnyRow) { return String(field(row, 'curation_status', 'ranking_status', 'status') || 'pending_review').toLowerCase(); }
function fitOf(row: AnyRow) {
  const raw = String(field(row, 'fit_status', 'DFP Fit', 'avika_decision') || 'Unknown');
  if (raw.toLowerCase() === 'yes') return 'Strong fit';
  if (raw.toLowerCase() === 'maybe') return 'Needs review';
  if (raw.toLowerCase() === 'no') return 'Not fit';
  return raw;
}
function summaryOf(row: AnyRow) { return String(field(row, 'avika_summary', 'one_line_understanding', 'background_summary', 'evidence_summary', 'notes') || 'No one-line understanding yet.'); }
function reasonOf(row: AnyRow) { return String(field(row, 'avika_reason_code', 'Avika Reason Code') || ''); }
function sourceOf(row: AnyRow) { return String(field(row, 'source_tag', 'source_type', 'source_mix') || 'Historical / Manual'); }
function batchKeyOf(row: AnyRow) {
  const explicit = String(field(row, 'batch_id', 'source_run_id', 'source_run') || '');
  if (explicit && explicit !== 'manual_output') return explicit;
  const date = String(field(row, 'source_run_date', 'created_at', 'updated_at') || '').slice(0, 10);
  return `${sourceOf(row)}|${date || 'historical'}`;
}
function batchLabelOf(row: AnyRow) {
  const explicit = String(field(row, 'batch_label', 'Batch Label') || '');
  if (explicit) return explicit;
  const run = String(field(row, 'source_run_id', 'source_run') || '');
  const date = String(field(row, 'source_run_date', 'created_at', 'updated_at') || '').slice(0, 10);
  if (run && run !== 'manual_output') return `${sourceOf(row)} · ${run.slice(-12)}`;
  return `${sourceOf(row)} · ${date || 'Historical'}`;
}
function updatedOf(row: AnyRow) { return String(field(row, 'updated_at', 'created_at') || ''); }
function compact(value: string) { return value ? value.replaceAll('_', ' ') : ''; }

function bucketOf(row: AnyRow): Exclude<Bucket, 'all'> {
  const status = statusOf(row);
  const ranking = String(row.ranking_status || '').toLowerCase();
  if (ranking.includes('sent to ranking') || ranking.includes('already rated') || ranking.includes('already assigned') || status === 'already_rated') return 'sent';
  if (status.includes('approved')) return 'approved';
  if (status === 'needs_follow_up') return 'followup';
  if (status === 'hold' || status === 'sent_back_to_pool') return 'hold';
  return 'pending';
}

export default function ShortlistingPool({ region }: Props) {
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [bucket, setBucket] = useState<Bucket>('pending');
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [distribution, setDistribution] = useState('split');
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setError('');
    const response = await safeJSON(`/workspace/${encodeURIComponent(region)}/lead-pool`);
    if (!response.ok) { setError(response.error || 'Could not load Shortlisting Pool.'); return; }
    const next = Array.isArray(response.data?.rows) ? response.data.rows : [];
    setRows(next);
    setSelected({});
  }
  useEffect(() => { load(); }, [region]);

  const counts = useMemo(() => {
    const result: Record<Bucket, number> = { pending: 0, approved: 0, followup: 0, hold: 0, sent: 0, all: rows.length };
    rows.forEach(row => { const key = bucketOf(row); result[key] += 1; });
    return result;
  }, [rows]);

  const sources = useMemo(() => Array.from(new Set(rows.map(sourceOf))).sort(), [rows]);
  const filtered = useMemo(() => rows.filter(row => {
    if (bucket !== 'all' && bucketOf(row) !== bucket) return false;
    if (sourceFilter !== 'all' && sourceOf(row) !== sourceFilter) return false;
    if (query.trim()) {
      const blob = `${nameOf(row)} ${locationOf(row)} ${summaryOf(row)} ${sourceOf(row)} ${batchLabelOf(row)} ${idOf(row)}`.toLowerCase();
      if (!blob.includes(query.trim().toLowerCase())) return false;
    }
    return true;
  }), [rows, bucket, sourceFilter, query]);

  const groups = useMemo(() => {
    const map = new Map<string, { key: string; label: string; source: string; updated: string; rows: AnyRow[] }>();
    filtered.forEach(row => {
      const key = batchKeyOf(row);
      const current = map.get(key) || { key, label: batchLabelOf(row), source: sourceOf(row), updated: updatedOf(row), rows: [] };
      current.rows.push(row);
      if (updatedOf(row) > current.updated) current.updated = updatedOf(row);
      map.set(key, current);
    });
    return Array.from(map.values()).map(group => ({ ...group, rows: [...group.rows].sort((a, b) => nameOf(a).localeCompare(nameOf(b)))}))
      .sort((a, b) => b.updated.localeCompare(a.updated) || a.label.localeCompare(b.label));
  }, [filtered]);

  const selectedRows = rows.filter(row => selected[leadId(row)]);

  function toggleLead(row: AnyRow) {
    const id = leadId(row);
    if (!id) return;
    setSelected(old => ({ ...old, [id]: !old[id] }));
  }
  function selectRows(target: AnyRow[], value: boolean) {
    setSelected(old => {
      const next = { ...old };
      target.forEach(row => { if (leadId(row)) next[leadId(row)] = value; });
      return next;
    });
  }

  async function curate(ids: string[], status: string, comment = '') {
    if (!ids.length) return false;
    const response = await safeJSON(`/workspace/${encodeURIComponent(region)}/lead-pool/curate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_ids: ids, curation_status: status, curation_comment: comment, actor: 'Shortlisting Pool' }),
    });
    if (!response.ok) { setError(response.error || 'Could not update selected leads.'); return false; }
    setRows(response.data?.rows || []);
    return true;
  }

  async function bulkAction(status: string) {
    const ids = selectedRows.map(leadId).filter(Boolean);
    if (!ids.length) { setError('Select at least one NGO.'); return; }
    setBusy(status); setError(''); setMessage('');
    const comment = status === 'needs_follow_up' ? 'Needs additional information before PM shortlisting.' : status === 'hold' ? 'Held in Shortlisting Pool.' : '';
    const ok = await curate(ids, status, comment);
    setBusy('');
    if (ok) { setMessage(`${ids.length} NGO(s) updated.`); setSelected({}); }
  }

  async function sendSelected() {
    const ids = selectedRows.map(leadId).filter(Boolean);
    if (!ids.length) { setError('Select at least one NGO.'); return; }
    if (!window.confirm(`Approve and send ${ids.length} selected NGO(s) to PM shortlisting? Existing assigned or rated NGOs will be skipped.`)) return;
    setBusy('send'); setError(''); setMessage('');
    const approved = await curate(ids, 'approved_with_comment');
    if (!approved) { setBusy(''); return; }
    let pms = PM_NAMES;
    let assignment = 'split_evenly';
    if (distribution === 'everyone') assignment = 'assign_to_each';
    else if (distribution !== 'split') { pms = [distribution]; assignment = 'specific_pm'; }
    const response = await safeJSON(`/workspace/${encodeURIComponent(region)}/send-to-ranking`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pms, distribution: assignment, lead_ids: ids }),
    });
    setBusy('');
    if (!response.ok) { setError(response.error || 'Could not send selected NGOs to PMs.'); return; }
    setMessage(`${Number(response.data?.new_tasks || 0)} PM task(s) created from ${Number(response.data?.new_leads || 0)} NGO(s). ${Number(response.data?.not_sent_existing_count || 0)} already existed and were skipped.`);
    setSelected({});
    await load();
  }

  async function deleteSelected() {
    const ids = selectedRows.map(leadId).filter(Boolean);
    if (!ids.length) return;
    if (!window.confirm(`Remove ${ids.length} selected NGO(s) from the Shortlisting Pool? Admin Undo remains available.`)) return;
    setBusy('delete'); setError(''); setMessage('');
    const response = await safeJSON(`/workspace/${encodeURIComponent(region)}/lead-pool/delete`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_ids: ids }),
    });
    setBusy('');
    if (!response.ok) { setError(response.error || 'Could not remove selected NGOs.'); return; }
    setMessage(`${Number(response.data?.deleted || 0)} NGO(s) removed.`);
    setSelected({});
    setRows(response.data?.rows || []);
  }

  return <section className="shortlisting-pool-v2">
    <div className="shortlisting-head">
      <div><span className="red-kicker compact-kicker">One review queue</span><h2>Shortlisting Pool</h2><p>Grouped by source batch. Open only the batch you need, select NGOs, and move them to PM review in one action.</p></div>
      <div className="shortlisting-metrics"><div><b>{counts.pending}</b><span>pending</span></div><div><b>{counts.approved}</b><span>approved</span></div><div><b>{counts.followup}</b><span>follow-up</span></div><div><b>{counts.sent}</b><span>sent / rated</span></div></div>
    </div>

    <div className="shortlisting-controls">
      <div className="shortlisting-buckets">
        {(['pending', 'approved', 'followup', 'hold', 'sent', 'all'] as Bucket[]).map(value => <button key={value} className={bucket === value ? 'active' : ''} onClick={() => setBucket(value)}>{value === 'followup' ? 'Follow-up' : value === 'sent' ? 'Sent / Rated' : value[0].toUpperCase() + value.slice(1)} <b>{counts[value]}</b></button>)}
      </div>
      <input className="shortlisting-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search NGO, location, source, batch or ID" />
      <select value={sourceFilter} onChange={event => setSourceFilter(event.target.value)}><option value="all">All sources</option>{sources.map(source => <option key={source} value={source}>{source}</option>)}</select>
      <button className="quiet-btn" onClick={load}>Refresh</button>
    </div>

    <div className="shortlisting-view-actions">
      <span><b>{filtered.length}</b> NGOs in this view · <b>{groups.length}</b> source batches</span>
      <button className="quiet-btn" onClick={() => selectRows(filtered, true)}>Select visible</button>
      <button className="quiet-btn" onClick={() => selectRows(filtered, false)}>Clear visible</button>
      <button className="quiet-btn" onClick={() => setOpenGroups(Object.fromEntries(groups.map(group => [group.key, true])))}>Expand all</button>
      <button className="quiet-btn" onClick={() => setOpenGroups({})}>Collapse all</button>
    </div>

    {error && <div className="error-box">{error}</div>}
    {message && <div className="pool-message">{message}</div>}

    {selectedRows.length > 0 && <div className="shortlisting-bulk-bar">
      <b>{selectedRows.length} selected</b>
      <button disabled={Boolean(busy)} onClick={() => bulkAction('approved_with_comment')}>Approve selected</button>
      <button disabled={Boolean(busy)} onClick={() => bulkAction('needs_follow_up')}>Need follow-up</button>
      <button disabled={Boolean(busy)} onClick={() => bulkAction('hold')}>Hold</button>
      <select value={distribution} onChange={event => setDistribution(event.target.value)}><option value="split">Split evenly across PMs</option><option value="everyone">Send every NGO to every PM</option>{PM_NAMES.map(pm => <option key={pm} value={pm}>Send to {pm}</option>)}</select>
      <button className="primary-red" disabled={Boolean(busy)} onClick={sendSelected}>{busy === 'send' ? 'Sending…' : 'Approve & send to PMs'}</button>
      <button className="danger-btn" disabled={Boolean(busy)} onClick={deleteSelected}>Remove</button>
      <button className="quiet-btn" onClick={() => setSelected({})}>Clear selection</button>
    </div>}

    <div className="shortlisting-groups">
      {groups.map(group => {
        const open = Boolean(openGroups[group.key]);
        const groupCounts = group.rows.reduce((acc: Record<string, number>, row) => { const key = bucketOf(row); acc[key] = (acc[key] || 0) + 1; return acc; }, {});
        const allSelected = group.rows.length > 0 && group.rows.every(row => selected[leadId(row)]);
        return <article className={`shortlisting-group ${open ? 'open' : ''}`} key={group.key}>
          <button className="shortlisting-group-head" onClick={() => setOpenGroups(old => ({ ...old, [group.key]: !old[group.key] }))}>
            <span className="shortlisting-chevron">{open ? '−' : '+'}</span>
            <div><b>{group.label}</b><small>{group.source} · {group.updated || 'historical'}</small></div>
            <div className="shortlisting-group-counts"><span>{group.rows.length} NGOs</span>{groupCounts.pending ? <em>{groupCounts.pending} pending</em> : null}{groupCounts.approved ? <em>{groupCounts.approved} approved</em> : null}{groupCounts.followup ? <em>{groupCounts.followup} follow-up</em> : null}{groupCounts.sent ? <em>{groupCounts.sent} sent</em> : null}</div>
          </button>
          {open && <div className="shortlisting-group-body">
            <div className="shortlisting-group-tools"><label><input type="checkbox" checked={allSelected} onChange={event => selectRows(group.rows, event.target.checked)} /> Select this batch</label><button onClick={() => selectRows(group.rows, false)}>Clear batch</button></div>
            <div className="shortlisting-card-grid">{group.rows.map(row => {
              const id = leadId(row);
              const url = safeExternalUrl(websiteOf(row));
              const rowBucket = bucketOf(row);
              return <div className={`shortlisting-card status-${rowBucket}`} key={id || `${nameOf(row)}-${websiteOf(row)}`}>
                <div className="shortlisting-card-top"><input type="checkbox" checked={Boolean(selected[id])} onChange={() => toggleLead(row)} /><div><h3>{nameOf(row)}</h3><span>{locationOf(row)}</span></div><i>{fitOf(row)}</i></div>
                <p>{summaryOf(row)}</p>
                <div className="shortlisting-card-tags"><span>{sourceOf(row)}</span>{reasonOf(row) && <span>{compact(reasonOf(row))}</span>}<span>{rowBucket.replaceAll('_', ' ')}</span></div>
                <div className="shortlisting-card-actions">{url ? <a href={url} target="_blank" rel="noopener noreferrer">Website ↗</a> : <span>No website</span>}<button title={idOf(row)} onClick={() => navigator.clipboard?.writeText(idOf(row))}>{idOf(row) ? `ID · ${idOf(row).slice(-6)}` : 'No ID'}</button><button onClick={async () => { if (await curate([id], 'approved_with_comment')) setMessage(`${nameOf(row)} approved.`); }}>Approve</button><button onClick={async () => { if (await curate([id], 'needs_follow_up', 'Needs additional information before PM shortlisting.')) setMessage(`${nameOf(row)} moved to follow-up.`); }}>Follow-up</button></div>
                <details><summary>Details</summary><dl><dt>Full NGO ID</dt><dd>{idOf(row) || '—'}</dd><dt>Batch</dt><dd>{batchLabelOf(row)}</dd><dt>Source run</dt><dd>{field(row, 'source_run_id', 'source_run') || '—'}</dd><dt>Website match</dt><dd>{field(row, 'website_match') || '—'}</dd><dt>Shortlisting note</dt><dd>{field(row, 'shortlisting_comment') || '—'}</dd></dl></details>
              </div>;
            })}</div>
          </div>}
        </article>;
      })}
      {!groups.length && <div className="muted-empty">No NGOs match this view.</div>}
    </div>

    <details className="shortlisting-utilities"><summary>CSV utilities</summary><div>{BACKEND && <a className="dark-download ready" href={`/api/dfp-proxy/core/workspace/${encodeURIComponent(region)}/lead-pool/export.csv`}>Download full Shortlisting Pool CSV</a>}<span>Historical records remain available; new discovery batches should enter through Avika Fit Review.</span></div></details>
  </section>;
}
