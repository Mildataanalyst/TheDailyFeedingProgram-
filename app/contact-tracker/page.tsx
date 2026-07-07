'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import AdminUndoRedo from '@/components/AdminUndoRedo';
import { BACKEND, safeJSON } from '@/lib/backendClient';
import { safeExternalUrl } from '@/lib/urlSafety';

type Row = Record<string, any>;
type Filter = 'all' | 'not_started' | 'connected' | 'meeting_scheduled' | 'meeting_done' | 'follow_up_needed' | 'on_hold';

const statusOptions = [
  ['not_started', 'Not Started'],
  ['contacted', 'Contacted'],
  ['connected', 'Connected'],
  ['not_connected', 'Not Connected'],
  ['meeting_scheduled', 'Meeting Scheduled'],
  ['meeting_done', 'Meeting Done'],
  ['follow_up_needed', 'Follow-up Needed'],
  ['not_interested', 'Not Interested'],
  ['on_hold', 'On Hold'],
];

const states = ['Karnataka', 'Tamil Nadu', 'Telangana', 'Andhra Pradesh', 'Maharashtra'];
const labelOf = (value: any) => statusOptions.find(([k]) => k === String(value || ''))?.[1] || 'Not Started';
const safeUrl = (value: any) => safeExternalUrl(value);

function Stat({ label, value }: { label: string; value: any }) {
  return <div className="tracker-stat"><strong>{value ?? 0}</strong><span>{label}</span></div>;
}

function RowDetails({ row, onSave, saving }: { row: Row; onSave: (patch: Row) => void; saving: boolean }) {
  const [draft, setDraft] = useState<Row>({});
  useEffect(() => { setDraft({
    poc_name: row.poc_name || '',
    contact_number: row.contact_number || '',
    outreach_owner: row.outreach_owner || '',
    meeting_date: row.meeting_date || '',
    meeting_time: row.meeting_time || '',
    meeting_notes: row.meeting_notes || '',
    next_follow_up_date: row.next_follow_up_date || '',
    tracker_comment: row.tracker_comment || '',
  }); }, [row]);
  return <div className="tracker-details">
    <div className="tracker-detail-grid">
      <label><span>POC</span><input value={draft.poc_name || ''} onChange={e => setDraft({ ...draft, poc_name: e.target.value })} /></label>
      <label><span>Contact</span><input value={draft.contact_number || ''} onChange={e => setDraft({ ...draft, contact_number: e.target.value })} /></label>
      <label><span>Owner</span><input value={draft.outreach_owner || ''} onChange={e => setDraft({ ...draft, outreach_owner: e.target.value })} /></label>
      <label><span>Meeting date</span><input type="date" value={draft.meeting_date || ''} onChange={e => setDraft({ ...draft, meeting_date: e.target.value })} /></label>
      <label><span>Meeting time</span><input type="time" value={draft.meeting_time || ''} onChange={e => setDraft({ ...draft, meeting_time: e.target.value })} /></label>
      <label><span>Next follow-up</span><input type="date" value={draft.next_follow_up_date || ''} onChange={e => setDraft({ ...draft, next_follow_up_date: e.target.value })} /></label>
    </div>
    <label className="tracker-wide"><span>Meeting notes</span><textarea value={draft.meeting_notes || ''} onChange={e => setDraft({ ...draft, meeting_notes: e.target.value })} /></label>
    <label className="tracker-wide"><span>Tracker comment</span><textarea value={draft.tracker_comment || ''} onChange={e => setDraft({ ...draft, tracker_comment: e.target.value })} /></label>
    <div className="tracker-context">
      <p><b>PM</b> {row.pm_reviewer || '—'} · {row.pm_rating || '—'}</p>
      <p><b>PM comment</b> {row.pm_comment || '—'}</p>
      <p><b>Background</b> {row.one_line_understanding || row.background || '—'}</p>
      {row.referred_by && <p><b>Referred by</b> {row.referred_by}</p>}
    </div>
    <button className="tracker-primary small" disabled={saving} onClick={() => onSave(draft)}>{saving ? 'Saving…' : 'Save details'}</button>
  </div>;
}

export default function ContactTrackerPage() {
  const [region, setRegion] = useState('Karnataka');
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Row>({});
  const [filter, setFilter] = useState<Filter>('all');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState('');
  const [saving, setSaving] = useState('');

  const load = useCallback(async () => {
    if (!BACKEND) return;
    const r = await safeJSON(`${BACKEND}/contact-tracker?region=${encodeURIComponent(region)}`);
    if (r.ok && r.data) { setRows(r.data.rows || []); setSummary(r.data.summary || {}); }
    else setMessage(r.error || 'Could not load tracker.');
  }, [region]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => rows.filter(r => filter === 'all' || String(r.contact_status || 'not_started') === filter), [rows, filter]);

  async function sendBuckets(buckets: string[]) {
    if (!BACKEND) return;
    setBusy(true); setMessage('Sending from Final Output…');
    const r = await safeJSON(`${BACKEND}/ranking/final/send-to-contact-tracker`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ region, buckets }),
    });
    setBusy(false);
    if (!r.ok) { setMessage(r.error || 'Could not send to tracker.'); return; }
    setMessage(`${r.data.sent_count || 0} added · ${r.data.skipped_existing_count || 0} already existed.`);
    await load();
  }

  async function updateRow(row: Row, patch: Row) {
    if (!BACKEND) return;
    setSaving(row.tracker_id);
    const r = await safeJSON(`${BACKEND}/contact-tracker/update`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ region, tracker_id: row.tracker_id, ...patch }),
    });
    setSaving('');
    if (!r.ok) { setMessage(r.error || 'Could not update tracker row.'); return; }
    setMessage('Saved.');
    await load();
  }

  async function removeRow(row: Row) {
    if (!BACKEND) return;
    if (!window.confirm(`Remove ${row.ngo_name || 'this NGO'} from Contact Tracker?`)) return;
    const r = await safeJSON(`${BACKEND}/contact-tracker/remove`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ region, tracker_id: row.tracker_id }),
    });
    if (!r.ok) { setMessage(r.error || 'Could not remove row.'); return; }
    setMessage('Removed from tracker.');
    await load();
  }

  return <main className="tracker-page">
    <Header active="tracker" />
    <section className="dfp-wrap tracker-shell">
      <div className="tracker-hero">
        <div>
          <p className="tracker-kicker">Contact Tracker</p>
          <h1>Track outreach</h1>
          <p>Send final-ranked NGOs here and track connection, meetings, notes, and follow-ups.</p>
        </div>
        <div className="tracker-actions">
          <select value={region} onChange={e => setRegion(e.target.value)}>{states.map(s => <option key={s}>{s}</option>)}</select>
          <button disabled={busy} onClick={() => sendBuckets(['final_shortlist'])}>Send Final Shortlist</button>
          <button disabled={busy} onClick={() => sendBuckets(['strong_maybe'])}>Send Strong Maybe</button>
          <a href={BACKEND ? `${BACKEND}/contact-tracker/export.csv?region=${encodeURIComponent(region)}` : '#'}>Export CSV</a>
        </div>
      </div>

      <AdminUndoRedo region={region} context="Contact Tracker recovery" onRestored={load} />

      <div className="tracker-stats">
        <Stat label="In tracker" value={summary.total_in_tracker} />
        <Stat label="Connected" value={summary.connected_count} />
        <Stat label="Meetings scheduled" value={summary.meeting_scheduled_count} />
        <Stat label="Meeting done" value={summary.meeting_done_count} />
        <Stat label="Follow-up" value={summary.follow_up_needed_count} />
        <Stat label="Overdue" value={summary.overdue_followups} />
      </div>

      <div className="tracker-tabs">
        {(['all','not_started','connected','meeting_scheduled','meeting_done','follow_up_needed','on_hold'] as Filter[]).map(k => <button key={k} className={filter === k ? 'active' : ''} onClick={() => setFilter(k)}>{k === 'all' ? 'All' : labelOf(k)}</button>)}
      </div>

      {message && <div className="tracker-message">{message}</div>}

      <section className="tracker-table-card">
        <div className="tracker-table-head"><span>{visible.length} NGOs</span><span>{region}</span></div>
        <div className="scroll-table tracker-table-wrap">
          <table className="tracker-table"><thead><tr><th>NGO</th><th>Bucket</th><th>Rank</th><th>Source</th><th>Status</th><th>Meeting</th><th>Owner</th><th>Actions</th></tr></thead>
          <tbody>{visible.length ? visible.map(row => {
            const url = safeUrl(row.website);
            return <tr key={row.tracker_id}>
              <td><b>{row.ngo_name || '—'}</b><small>{url ? <a href={url} target="_blank" rel="noreferrer">website</a> : 'Needs Contact'} {row.contact_number ? ` · ${row.contact_number}` : ''}</small></td>
              <td><span className="tag">{row.final_bucket || '—'}</span></td>
              <td>{row.final_rank || '—'}</td>
              <td>{row.source_mix || '—'}</td>
              <td><select value={row.contact_status || 'not_started'} onChange={e => updateRow(row, { contact_status: e.target.value })}>{statusOptions.map(([k, label]) => <option key={k} value={k}>{label}</option>)}</select></td>
              <td>{row.meeting_date || '—'}{row.meeting_time ? ` · ${row.meeting_time}` : ''}</td>
              <td>{row.outreach_owner || '—'}</td>
              <td className="tracker-row-actions"><button onClick={() => setExpanded(expanded === row.tracker_id ? '' : row.tracker_id)}>{expanded === row.tracker_id ? 'Close' : 'Open'}</button><button onClick={() => removeRow(row)}>Remove</button></td>
            </tr>;
          }) : <tr><td colSpan={8}>No tracker rows yet. Send NGOs from Final Output using the buttons above.</td></tr>}
          </tbody></table>
        </div>
        {visible.map(row => expanded === row.tracker_id ? <RowDetails key={`details-${row.tracker_id}`} row={row} saving={saving === row.tracker_id} onSave={patch => updateRow(row, patch)} /> : null)}
      </section>
    </section>
  </main>;
}
