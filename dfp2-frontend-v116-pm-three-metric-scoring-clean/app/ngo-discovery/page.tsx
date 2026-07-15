'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import AdminUndoRedo from '@/components/AdminUndoRedo';
import { safeExternalUrl } from '@/lib/urlSafety';
import { BACKEND, SEARCH_BACKEND, STORY_BACKEND, BACKEND_CONFIG_ERROR, SEARCH_BACKEND_CONFIG_ERROR, STORY_BACKEND_CONFIG_ERROR, safeJSON, isFailureStatus, isTerminalReady } from '@/lib/backendClient';

type AnyRow = Record<string, any>;
type View = 'source' | 'internet' | 'referrals' | 'leadpool';
type Tab = 'general' | 'bulk';

const POLL_MS = 2500;
const BULK_MAX = 10000;
const MAX_DISCOVERY_BUDGET = 5500;
const states = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir','Ladakh','Lakshadweep','Puducherry'
];
const PM_NAMES = ['Milan','Avika','Piyush','Kamran','Ipshita','Rachit','Tanishq'];

const runModes = [
  { key: 'test', label: 'Test Run', budget: 200, note: 'Small run to check the search logic.' },
  { key: 'standard', label: 'Standard Run', budget: 1500, note: 'Serious pass without using the full balance.' },
  { key: 'full', label: 'Full Karnataka Run', budget: 4000, note: 'Deep Karnataka discovery.' },
  { key: 'extended', label: 'Extended Run', budget: 5500, note: 'Maximum Karnataka discovery.' },
  { key: 'custom', label: 'Custom', budget: 200, note: 'Set your own query budget.' },
];

const pathwayOptions = [
  { key: 'residential_life_system', label: 'Residential / life-system', note: 'Residential schools, hostels, children’s homes, and full-life support institutions.' },
  { key: 'full_day_alternative', label: 'Whole-child / alternative education', note: 'Full-day learning models, bridge schools, alternate schools, and deep education pathways.' },
  { key: 'child_protection_rehab', label: 'Child protection / rehabilitation', note: 'Child labour, street children, rescue, rehabilitation, shelter, and protection pathways.' },
  { key: 'disability_special_needs', label: 'Disability / special needs', note: 'Special schools, therapy-linked education, inclusive support, and disability-focused institutions.' },
  { key: 'sports_arts_stem_vocational', label: 'Sports / arts / STEM / niche pathways', note: 'Distinctive sports, music, arts, STEM, vocational, or talent-building programs.' },
  { key: 'exceptional_community_pathway', label: 'Exceptional community pathway', note: 'Unusual community institutions with credible child outcomes and strong local signal.' },
];
const defaultPathways = pathwayOptions.slice(0, 5).map(p => p.key);

function field(row: AnyRow, ...keys: string[]) {
  for (const k of keys) if (row?.[k] !== undefined && row?.[k] !== null && row?.[k] !== '') return row[k];
  return '';
}
const rowName = (r: AnyRow) => field(r, 'ngo_name', 'NGO Name', 'Organisation', 'organization', 'name', 'input_name');
const rowWebsite = (r: AnyRow) => field(r, 'website', 'Website', 'url', 'Website / Source', 'Source URL');
const rowSource = (r: AnyRow) => field(r, 'source_type', 'Source', 'module', 'Website / Source', 'Source URL', 'Article URL');
const rowLocation = (r: AnyRow) => field(r, 'district', 'District', 'Location', 'Traced Place', 'state', 'State', 'location');
const rowPathway = (r: AnyRow) => field(r, 'Pathway', 'Story Category', 'Story Type', 'pathway');
const rowWhy = (r: AnyRow) => field(r, 'evidence_summary', 'Why It Belongs', 'Why NGO Is Interesting', 'Story Summary', 'Notes', 'note', 'notes');
const rowConfidence = (r: AnyRow) => field(r, 'confidence', 'Confidence', 'AI Confidence', 'conf');
const rowStatus = (r: AnyRow) => field(r, 'curation_status', 'Curation Status', 'information_status', 'Information Status', 'Output Tier', 'Status', 'Repository Status', 'status');
const rowInfoStatus = (r: AnyRow) => field(r, 'information_status', 'Information Status', 'Output Tier', 'Status', 'Repository Status', 'status');
const rowOneLine = (r: AnyRow) => field(r, 'one_line_understanding', 'One-line Understanding', 'background_summary', 'Background', 'evidence_summary', 'Why It Belongs', 'notes');
const rowNote = (r: AnyRow) => field(r, 'reviewer_comments', 'comments', 'Comments', 'notes', 'Notes', 'note', 'reason');
const rowContact = (r: AnyRow) => field(r, 'contact_number', 'Contact Number', 'phone', 'Phone');
const rowReferredBy = (r: AnyRow) => field(r, 'referred_by', 'Referred By', 'referral_source');
const rowSourceTag = (r: AnyRow) => field(r, 'source_tag', 'Source Tag', 'source_mix', 'source_type', 'Source', 'source');
const rowShortlistingComment = (r: AnyRow) => field(r, 'shortlisting_comment', 'Shortlisting Comment', 'curation_comment', 'Curation Comment', 'reviewer_comments', 'comments', 'Comments', 'notes', 'Notes');
function isTruthyCell(value: unknown){ return ['1','true','yes','y','send','sent','approve','approved','shortlist','shortlisted','x','✓','✔'].includes(String(value||'').trim().toLowerCase()); }

function ExternalLink({ value, children }: { value: unknown; children: ReactNode }) {
  const url = safeExternalUrl(value);
  if (!url) return <>—</>;
  return <a href={url} target="_blank" rel="noopener noreferrer">{children}</a>;
}
function StatBox({label,value}:{label:string;value:any}){return <div className="statbox"><strong>{value ?? '—'}</strong><span>{label}</span></div>;}
function DownloadButton({ href, ready, children }: { href: string; ready: boolean; children: ReactNode }) {return <a className={ready?'dark-download ready':'dark-download off'} href={ready?href:'#'} onClick={e=>{if(!ready)e.preventDefault();}}>{children}</a>;}
function downloadText(name:string,text:string){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([text],{type:'text/csv'})); a.download=name; a.click(); URL.revokeObjectURL(a.href); }
function discoveryDownload(runId: string, kind: string) { return STORY_BACKEND ? `${STORY_BACKEND}/discovery/export/${encodeURIComponent(runId)}/${kind}` : '#'; }
function repositoryDownload(runId: string, kind: string) { return SEARCH_BACKEND ? `${SEARCH_BACKEND}/repository/export/${encodeURIComponent(runId)}/${kind}` : '#'; }
function recheckDownload(runId: string, kind: string) { return SEARCH_BACKEND ? `${SEARCH_BACKEND}/repository/recheck/export/${encodeURIComponent(runId)}/${kind}` : '#'; }
function presenceDownload(runId: string, kind: string) { return SEARCH_BACKEND ? `${SEARCH_BACKEND}/repository/presence/export/${encodeURIComponent(runId)}/${kind}` : '#'; }
function archiveDownload(row: AnyRow, kind: string) { const id=String(row?.run_id||''); const moduleName=String(row?.module||''); return moduleName === 'ngo_presence_check' ? presenceDownload(id, kind) : moduleName === 'no_website_recheck' ? recheckDownload(id, kind) : repositoryDownload(id, kind); }
function statusText(data: any) { return String(data?.run_status || data?.process_state || data?.stage || '').toLowerCase(); }
function discoveryResultsReady(data: any) { return isTerminalReady(data); }
function repositoryResultsReady(data: any) { return isTerminalReady(data); }
function confidenceClass(value: unknown){ const s=String(value||'').toLowerCase(); if(s.includes('high'))return 'tag good'; if(s.includes('low'))return 'tag bad'; return 'tag'; }
async function countCsvRows(file: File) { const text = await file.text(); const lines = text.split(/\r?\n/).map(x => x.trim()).filter(Boolean); if (!lines.length) return 0; const first = lines[0].toLowerCase(); return first.includes('name') ? Math.max(0, lines.length - 1) : lines.length; }

function parseCsv(text: string): AnyRow[] {
  const rows: string[][] = [];
  let cur = '';
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"' && quoted && next === '"') { cur += '"'; i += 1; continue; }
    if (ch === '"') { quoted = !quoted; continue; }
    if (ch === ',' && !quoted) { row.push(cur.trim()); cur = ''; continue; }
    if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && next === '\n') i += 1;
      row.push(cur.trim());
      if (row.some(cell => cell.trim())) rows.push(row);
      row = []; cur = '';
      continue;
    }
    cur += ch;
  }
  row.push(cur.trim());
  if (row.some(cell => cell.trim())) rows.push(row);
  if (!rows.length) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(cells => {
    const out: AnyRow = {};
    headers.forEach((h, i) => { out[h] = cells[i] || ''; });
    return out;
  }).filter(row => rowName(row) || row.ngo_name || row.name);
}

function safeCsvValue(value: unknown) {
  let text = String(value || '').replace(/\u0000/g, '');
  if (/^[=+\-@]/.test(text.trimStart())) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}

async function bulkCsvWithImplicitState(file: File, selectedState: string) {
  const text = await file.text();
  const rows = parseCsv(text);
  if (!rows.length) throw new Error('CSV is empty.');
  const first = rows[0] || {};
  const keys = Object.keys(first).map(k => k.toLowerCase());
  const hasName = keys.some(x => ['name', 'ngo_name', 'ngo name', 'organisation', 'organization'].includes(x));
  const hasDistrict = keys.includes('district');
  if (!hasName) throw new Error('CSV must include name.');
  if (!hasDistrict) throw new Error('CSV must include district.');
  const headers = ['name', 'district', 'website', 'source', 'notes', 'state'];
  const out = [headers.join(',')];
  for (const row of rows) {
    const values = [
      field(row, 'name', 'ngo_name', 'NGO Name', 'Organisation', 'organization'),
      field(row, 'district', 'District'),
      field(row, 'website', 'Website', 'url'),
      field(row, 'source', 'Source'),
      field(row, 'notes', 'Notes', 'comments', 'Comments'),
      field(row, 'state', 'State') || selectedState,
    ];
    out.push(values.map(safeCsvValue).join(','));
  }
  return new File([out.join('\n') + '\n'], file.name || 'bulk_discovery.csv', { type: 'text/csv' });
}

function referralRowsToCsv(rows: AnyRow[], selectedState: string) {
  const headers = ['name', 'district', 'website', 'source', 'notes', 'state'];
  const out = [headers.join(',')];
  for (const row of rows) {
    const values = [rowName(row), field(row, 'district', 'District'), rowWebsite(row), 'Referral', rowNote(row), selectedState];
    out.push(values.map(safeCsvValue).join(','));
  }
  return out.join('\n') + '\n';
}

function DiscoveryRow({ row }: { row: AnyRow }) {
  return <tr>
    <td>{rowName(row) || 'Needs review'}</td>
    <td><ExternalLink value={rowWebsite(row) || rowSource(row)}>open</ExternalLink></td>
    <td>{rowLocation(row) || '—'}</td>
    <td><span className="tag">{rowPathway(row) || '—'}</span></td>
    <td>{rowWhy(row) || 'Potential child pathway institution. Verify manually.'}</td>
    <td><span className="tag">{rowStatus(row) || 'Ready for Ranking'}</span></td>
    <td><span className={confidenceClass(rowConfidence(row))}>{rowConfidence(row) || '—'}</span></td>
  </tr>;
}

function VerifyRow({ row }: { row: AnyRow }) {
  return <tr>
    <td>{rowName(row) || '—'}</td>
    <td><ExternalLink value={rowWebsite(row)}>open</ExternalLink></td>
    <td>{rowLocation(row) || '—'}</td>
    <td>{rowConfidence(row) || '—'}</td>
    <td>{field(row, 'Official Website Match', 'Website Match', 'match_status', 'status') || '—'}</td>
    <td>{rowNote(row) || '—'}</td>
  </tr>;
}

export default function NgoDiscoveryPage(){
  const [view,setView]=useState<View>('source');
  const [tab,setTab]=useState<Tab>('general');
  const [state,setState]=useState('Karnataka');
  const [runMode,setRunMode]=useState('test');
  const [budget,setBudget]=useState(200);
  const [pathways,setPathways]=useState<string[]>(defaultPathways);
  const [advancedOpen,setAdvancedOpen]=useState(false);

  const [discRunId,setDiscRunId]=useState('');
  const [discPolling,setDiscPolling]=useState(false);
  const [discStarting,setDiscStarting]=useState(false);
  const [discStatus,setDiscStatus]=useState<any>(null);
  const [discResults,setDiscResults]=useState<any>(null);
  const [discArchive,setDiscArchive]=useState<AnyRow[]>([]);
  const [discError,setDiscError]=useState('');
  const discTimer=useRef<any>(null);

  const [bulkCSV,setBulkCSV]=useState<File|null>(null);
  const bulkRef=useRef<HTMLInputElement|null>(null);
  const [repoRunId,setRepoRunId]=useState('');
  const [repoPolling,setRepoPolling]=useState(false);
  const [repoStarting,setRepoStarting]=useState(false);
  const [repoStatus,setRepoStatus]=useState<any>(null);
  const [repoResults,setRepoResults]=useState<any>(null);
  const [repoArchive,setRepoArchive]=useState<AnyRow[]>([]);
  const [repoError,setRepoError]=useState('');
  const repoTimer=useRef<any>(null);

  const [historyOpen,setHistoryOpen]=useState(true);
  const [recoveryCSV,setRecoveryCSV]=useState<File|null>(null);
  const recoveryRef=useRef<HTMLInputElement|null>(null);
  const [recoveryRunId,setRecoveryRunId]=useState('');
  const [recoveryStatus,setRecoveryStatus]=useState<any>(null);
  const [recoveryBusy,setRecoveryBusy]=useState(false);
  const [recoveryError,setRecoveryError]=useState('');
  const recoveryTimer=useRef<any>(null);

  const [presenceCSV,setPresenceCSV]=useState<File|null>(null);
  const presenceRef=useRef<HTMLInputElement|null>(null);
  const [presenceRunId,setPresenceRunId]=useState('');
  const [presenceStatus,setPresenceStatus]=useState<any>(null);
  const [presenceResults,setPresenceResults]=useState<any>(null);
  const [presenceBusy,setPresenceBusy]=useState(false);
  const [presenceError,setPresenceError]=useState('');
  const presenceTimer=useRef<any>(null);

  const referralRef=useRef<HTMLInputElement|null>(null);
  const [referralFile,setReferralFile]=useState<File|null>(null);
  const [referralRows,setReferralRows]=useState<AnyRow[]>([]);
  const [referralSelected,setReferralSelected]=useState<Record<number, boolean>>({});
  const [referralMessage,setReferralMessage]=useState('');
  const [referralError,setReferralError]=useState('');
  const [referralSearching,setReferralSearching]=useState(false);

  const [leadPool,setLeadPool]=useState<AnyRow[]>([]);
  const [poolMessage,setPoolMessage]=useState('');
  const [poolBusy,setPoolBusy]=useState(false);
  const [sentRunIds,setSentRunIds]=useState<Record<string, boolean>>({});
  const [poolView,setPoolView]=useState<'pending'|'approved'|'followup'|'all'>('pending');
  const leadImportRef=useRef<HTMLInputElement|null>(null);
  const shortlistImportRef=useRef<HTMLInputElement|null>(null);
  const [rankingTarget,setRankingTarget]=useState('everyone');
  const [rankingPassword,setRankingPassword]=useState('');

  function onModeChange(modeKey:string){ setRunMode(modeKey); const m=runModes.find(x=>x.key===modeKey); if(m && modeKey!=='custom') setBudget(m.budget); }
  function togglePathway(key:string){ setPathways(prev=>prev.includes(key)?prev.filter(x=>x!==key):[...prev,key]); }
  const loadDiscoveryArchive = useCallback(async()=>{ if(!STORY_BACKEND)return; const r=await safeJSON(`${STORY_BACKEND}/discovery/archive?limit=120`); if(r.ok&&r.data)setDiscArchive(r.data.rows||[]); },[]);
  const loadRepositoryArchive = useCallback(async()=>{ if(!SEARCH_BACKEND)return; const r=await safeJSON(`${SEARCH_BACKEND}/repository/archive?limit=120`); if(r.ok&&r.data)setRepoArchive(r.data.rows||r.data.runs||[]); },[]);
  const loadLeadPool = useCallback(async()=>{ if(!BACKEND)return; const r=await safeJSON(`${BACKEND}/workspace/${encodeURIComponent(state)}/lead-pool`); if(r.ok&&r.data)setLeadPool(r.data.rows||[]); },[state]);
  useEffect(()=>{loadDiscoveryArchive(); loadRepositoryArchive(); loadLeadPool();},[loadDiscoveryArchive, loadRepositoryArchive, loadLeadPool]);
  useEffect(()=>{
    try {
      const raw = window.localStorage.getItem('dfp2_sent_archive_runs');
      if (raw) setSentRunIds(JSON.parse(raw) || {});
    } catch {}
  },[]);
  function markRunSent(runId:string){
    setSentRunIds(prev=>{
      const next={...prev,[runId]:true};
      try { window.localStorage.setItem('dfp2_sent_archive_runs', JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function leadPoolImportCopy(data:any){
    const added = Number(data?.added || 0);
    const existing = Number(data?.already_existing_count ?? data?.not_added_existing_count ?? data?.merged ?? data?.updated ?? 0);
    const alreadyRated = Number(data?.already_rated_marked || 0);
    const copy = `Lead Pool updated: ${added} added. ${existing} already there, so not duplicated.${alreadyRated ? ` ${alreadyRated} marked already rated.` : ''}`;
    return copy;
  }

  function rankingResultCopy(data:any){
    const tasks = Number(data?.new_tasks || 0);
    const leads = Number(data?.new_leads ?? data?.sent_count ?? 0);
    const skipped = Number(data?.not_sent_existing_count ?? data?.skipped_duplicate_count ?? 0);
    const assignments = data?.assignments && typeof data.assignments === 'object'
      ? Object.entries(data.assignments).filter(([,v])=>Number(v)>0).map(([k,v])=>`${k}: ${v}`).join(' · ')
      : '';
    return `Sent to ranking: ${tasks} PM task(s) from ${leads} lead(s). ${skipped} already there, so not sent again.${assignments ? ` ${assignments}` : ''}`;
  }

  async function sendRowsToLeadPool(rows: AnyRow[], sourceType: string){
    if(!BACKEND||!rows.length)return;
    setPoolBusy(true); setPoolMessage('');
    const r=await safeJSON(`${BACKEND}/workspace/${encodeURIComponent(state)}/lead-pool/import`,{
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({source_type:sourceType, rows})
    });
    setPoolBusy(false);
    if(!r.ok){setPoolMessage(r.error||'Could not send to Lead Pool.'); return;}
    setLeadPool(r.data?.rows||[]);
    const copy = leadPoolImportCopy(r.data);
    setPoolMessage(copy);
    window.alert(copy);
  }

  async function sendRunToLeadPool(runId:string, moduleName:string, sourceType='Archive Import'){
    if(!BACKEND||!runId)return;
    const mod = String(moduleName || '').toLowerCase();
    const exportUrl = mod === 'discovery' || mod === 'legacy_story'
      ? (STORY_BACKEND ? `${STORY_BACKEND}/discovery/export/${encodeURIComponent(runId)}/leads` : '')
      : mod === 'no_website_recheck'
        ? (SEARCH_BACKEND ? `${SEARCH_BACKEND}/repository/recheck/export/${encodeURIComponent(runId)}/results` : '')
        : (SEARCH_BACKEND ? `${SEARCH_BACKEND}/repository/export/${encodeURIComponent(runId)}/repository` : '');
    if(!exportUrl){ setPoolMessage('Worker backend URL is not configured for this run.'); return; }
    setPoolBusy(true); setPoolMessage('');
    try {
      const exportRes = await fetch(exportUrl);
      if(!exportRes.ok){ throw new Error(`Could not fetch worker export (${exportRes.status}). Download the CSV and import manually if needed.`); }
      const rows = parseCsv(await exportRes.text()).map(row => ({...row, source_type:sourceType, source_run_id:runId}));
      if(!rows.length){ throw new Error('Worker export had no importable NGO rows.'); }
      const r=await safeJSON(`${BACKEND}/workspace/${encodeURIComponent(state)}/lead-pool/import`,{
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({source_type:sourceType, source_run_id:runId, rows})
      });
      if(!r.ok){setPoolMessage(r.error||'Could not send run to Lead Pool.'); return;}
      const copy = leadPoolImportCopy(r.data);
      setPoolMessage(copy);
      window.alert(copy);
      markRunSent(runId);
      setLeadPool(r.data?.rows||[]);
    } catch (err:any) {
      setPoolMessage(err?.message || 'Could not send run to Lead Pool.');
    } finally {
      setPoolBusy(false);
    }
  }

  function downloadManualLeadSampleCsv(){
    const csv = [
      ['ngo_name','website','district','source_tag','shortlisting_comment','contact_number','referred_by','comments'].join(','),
      ['Example Child Foundation','https://example.org','Bengaluru','Human Referral','Recommended by regional partner; review for child-focused fit.','9876543210','Avika','Known through local network'].map(safeCsvValue).join(','),
      ['Example Residential School','','Mysuru','Internet Discovery','Residential education model; check website evidence and DFP relevance.','','','Found during internet search'].map(safeCsvValue).join(','),
    ].join('\n') + '\n';
    downloadText('manual_leads_sample.csv', csv);
  }

  function downloadShortlistDecisionCsv(){
    const headers = ['lead_id','send_for_shortlisting','source_tag','shortlisting_comment','ngo_name','website','district','current_status','source_mix'];
    const rows = leadPool.map(row => [
      row.lead_id || '',
      isTruthyCell(row.send_for_shortlisting) || ['approved_for_ranking','approved_with_comment'].includes(curationOf(row)) ? 'TRUE' : '',
      rowSourceTag(row) || '',
      rowShortlistingComment(row) || '',
      rowName(row) || '',
      rowWebsite(row) || '',
      rowLocation(row) || '',
      rowStatus(row) || '',
      field(row,'source_mix','source_type','Source') || '',
    ]);
    const csv = [headers.join(','), ...rows.map(values => values.map(safeCsvValue).join(','))].join('\n') + '\n';
    downloadText(`${state.replace(/\s+/g,'_').toLowerCase()}_lead_pool_shortlisting_decisions.csv`, csv);
  }

  async function importShortlistDecisionCsv(file?: File | null){
    if(!file) return;
    setPoolMessage('');
    try {
      const rows = parseCsv(await file.text());
      if(!rows.length){ setPoolMessage('No valid decision rows found in CSV.'); return; }
      const r=await safeJSON(`${BACKEND}/workspace/${encodeURIComponent(state)}/lead-pool/import-decisions`,{
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({rows, actor:'Excel Import'})
      });
      if(!r.ok){
        const blocked = Number(r.data?.blocked_count || r.data?.blocked?.length || 0);
        setPoolMessage(r.error + (blocked ? ` ${blocked} row(s) are missing source tag or comment.` : ''));
        return;
      }
      setLeadPool(r.data?.rows||[]);
      const copy = r.data?.message || `Excel decisions applied.`;
      setPoolMessage(copy);
      window.alert(copy);
    } catch (err:any) {
      setPoolMessage(err?.message || 'Could not read decision CSV.');
    } finally {
      if(shortlistImportRef.current) shortlistImportRef.current.value = '';
    }
  }

  async function importLeadPoolCsv(file?: File | null){
    if(!file) return;
    setPoolMessage('');
    try {
      const rows = parseCsv(await file.text()).map(row => ({
        ...row,
        source_type: field(row, 'source_type', 'source', 'Source') || 'Manual Add',
        curation_status: field(row, 'curation_status', 'Curation Status') || 'pending_review',
      }));
      if(!rows.length){ setPoolMessage('No valid rows found in CSV.'); return; }
      await sendRowsToLeadPool(rows, 'Manual Add');
    } catch (err:any) {
      setPoolMessage(err?.message || 'Could not read CSV.');
    } finally {
      if(leadImportRef.current) leadImportRef.current.value = '';
    }
  }

  async function editLead(row: AnyRow){
    const ngo_name = window.prompt('NGO name', String(rowName(row)||''));
    if(ngo_name === null) return;
    const website = window.prompt('Website', String(rowWebsite(row)||''));
    if(website === null) return;
    const one_line_understanding = window.prompt('One-line understanding', String(rowOneLine(row)||''));
    if(one_line_understanding === null) return;
    const contact_number = window.prompt('Contact number', String(rowContact(row)||''));
    if(contact_number === null) return;
    const source_tag = window.prompt('Source tag', String(rowSourceTag(row)||rowSource(row)||''));
    if(source_tag === null) return;
    const curation_comment = window.prompt('Shortlisting comment', String(rowShortlistingComment(row)||rowNote(row)||''));
    if(curation_comment === null) return;
    await updateLead(row, {ngo_name, website, one_line_understanding, contact_number, source_tag, shortlisting_comment: curation_comment, curation_comment, reviewer_comments: curation_comment, notes: curation_comment});
  }

  async function updateLead(row: AnyRow, patch: AnyRow){
    if(!BACKEND||!row.lead_id)return;
    setPoolBusy(true); setPoolMessage('');
    const r=await safeJSON(`${BACKEND}/workspace/${encodeURIComponent(state)}/lead-pool/update`,{
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({lead_id:row.lead_id, ...patch})
    });
    setPoolBusy(false);
    if(!r.ok){setPoolMessage(r.error||'Could not update lead.'); return;}
    setLeadPool(r.data?.rows||[]);
    setPoolMessage('Lead updated.');
  }

  async function sendForShortlisting(row: AnyRow){
    if(!BACKEND||!row.lead_id)return;
    const defaultTag = String(rowSourceTag(row)||rowSource(row)||'').trim();
    const source_tag = window.prompt('Source tag (example: Internet Discovery or Human Referral)', defaultTag);
    if(source_tag === null) return;
    const shortlisting_comment = window.prompt('Shortlisting comment for PM review', String(rowShortlistingComment(row)||rowNote(row)||''));
    if(shortlisting_comment === null) return;
    if(!source_tag.trim() || !shortlisting_comment.trim()){
      setPoolMessage('Source tag and shortlisting comment are required before sending for shortlisting.');
      return;
    }
    setPoolBusy(true); setPoolMessage('');
    const r=await safeJSON(`${BACKEND}/workspace/${encodeURIComponent(state)}/lead-pool/curate`,{
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({lead_id:row.lead_id, curation_status:'approved_with_comment', source_tag, shortlisting_comment, curation_comment:shortlisting_comment, actor:'Admin'})
    });
    setPoolBusy(false);
    if(!r.ok){setPoolMessage(r.error||'Could not send for shortlisting.'); return;}
    setLeadPool(r.data?.rows||[]);
    setPoolMessage('Lead marked for shortlisting.');
  }

  async function curateLead(row: AnyRow, status: string, needsComment = false){
    if(!BACKEND||!row.lead_id)return;
    let comment = rowNote(row) || '';
    if(needsComment || status === 'approved_with_comment' || status === 'needs_follow_up' || status === 'sent_back_to_pool'){
      const entered = window.prompt(status === 'approved_with_comment' ? 'Comment for PM reviewer' : 'Add comment', comment);
      if(entered === null) return;
      comment = entered;
      if(status === 'approved_with_comment' && !comment.trim()){ setPoolMessage('Add a comment before approving insufficient leads.'); return; }
    }
    setPoolBusy(true); setPoolMessage('');
    const r=await safeJSON(`${BACKEND}/workspace/${encodeURIComponent(state)}/lead-pool/curate`,{
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({lead_id:row.lead_id, curation_status:status, curation_comment:comment, actor:'Admin'})
    });
    setPoolBusy(false);
    if(!r.ok){setPoolMessage(r.error||'Could not update curation.'); return;}
    setLeadPool(r.data?.rows||[]);
    setPoolMessage('Lead updated.');
  }

  async function deleteLeads(payload: AnyRow){
    if(!BACKEND)return;
    const n = Array.isArray(payload?.lead_ids) ? payload.lead_ids.length : (payload?.all ? leadPool.length : 0);
    if(!window.confirm(`Delete ${n || 'selected'} lead(s) from Lead Pool? This cannot be undone.`)) return;
    setPoolBusy(true); setPoolMessage('');
    const r=await safeJSON(`${BACKEND}/workspace/${encodeURIComponent(state)}/lead-pool/delete`,{
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)
    });
    setPoolBusy(false);
    if(!r.ok){setPoolMessage(r.error||'Could not delete.'); return;}
    setLeadPool(r.data?.rows||[]);
    setPoolMessage(`Deleted ${r.data?.deleted || 0}.`);
  }

  async function deleteAllApprovedLeads(){
    if(!BACKEND)return;
    if(!approvedLeads.length){ setPoolMessage('No approved leads to delete.'); return; }
    if(!rankingPassword.trim()){ setPoolMessage('Enter admin password before deleting all approved leads.'); return; }
    const ok = window.confirm(`Delete ALL ${approvedLeads.length} approved lead(s) from Lead Pool memory? This will not delete PM ranking submissions. You can still use Admin Undo immediately if this was a mistake.`);
    if(!ok) return;
    setPoolBusy(true); setPoolMessage('');
    const r=await safeJSON(`${BACKEND}/workspace/${encodeURIComponent(state)}/approved-leads/delete-all`,{
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({password:rankingPassword, confirm:true})
    });
    setPoolBusy(false);
    if(!r.ok){setPoolMessage(r.error||'Could not delete approved leads.'); return;}
    setLeadPool(r.data?.rows||[]);
    setPoolMessage(`Deleted ${r.data?.deleted || 0} approved lead(s).`);
  }

  async function sendLeadPoolToRanking(){
    if(!BACKEND)return;
    if(!approvedLeads.length){ setPoolMessage('No approved leads to send.'); return; }
    if(!rankingPassword.trim()){ setPoolMessage('Enter admin password before sending to ranking.'); return; }
    const ok = window.confirm(`Send ${approvedLeads.length} approved lead(s) to ranking? Existing assigned/rated NGOs will be skipped and nothing already submitted will be overwritten.`);
    if(!ok) return;
    const allPm = PM_NAMES.filter(Boolean);
    let pms = allPm;
    let distribution = 'assign_to_each';
    if(rankingTarget === 'split'){
      distribution = 'split_evenly';
    } else if(rankingTarget !== 'everyone'){
      pms = [rankingTarget];
      distribution = 'specific_pm';
    }
    setPoolBusy(true); setPoolMessage('');
    const r=await safeJSON(`${BACKEND}/workspace/${encodeURIComponent(state)}/send-to-ranking`,{
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({password:rankingPassword,pms,distribution,lead_ids:approvedLeads.map(r=>r.lead_id).filter(Boolean)})
    });
    setPoolBusy(false);
    if(!r.ok){
      const blocked = Number(r.data?.blocked_missing_metadata_count || r.data?.blocked_not_approved_count || r.data?.blocked?.length || 0);
      setPoolMessage((r.error||'Could not send to ranking.') + (blocked ? ` ${blocked} lead(s) need source tag/comment or approval first.` : ''));
      return;
    }
    const copy = rankingResultCopy(r.data);
    setPoolMessage(copy);
    window.alert(copy);
    loadLeadPool();
  }


  async function startDiscovery(){
    setDiscError(''); setDiscResults(null); setDiscStatus(null);
    if(!STORY_BACKEND){setDiscError(STORY_BACKEND_CONFIG_ERROR); return;}
    if(!pathways.length){setDiscError('Select at least one pathway.'); return;}
    const safeBudget=Math.max(1,Math.min(MAX_DISCOVERY_BUDGET,Number(budget||200)));
    if(safeBudget>4000 && !window.confirm('This can use almost your full Serper balance. Continue?')) return;
    setDiscStarting(true);
    const url=`${STORY_BACKEND}/discovery/start?state=${encodeURIComponent(state)}&budget=${safeBudget}&run_mode=${encodeURIComponent(runMode)}&pathways=${encodeURIComponent(pathways.join(','))}`;
    const r=await safeJSON(url,{method:'POST'});
    setDiscStarting(false);
    if(!r.ok||!r.data){setDiscError(r.error||'Could not start General Discovery.'); return;}
    setDiscRunId(r.data.run_id); setDiscPolling(true); loadDiscoveryArchive();
  }
  async function pauseDiscovery(){ if(!STORY_BACKEND||!discRunId)return; const r=await safeJSON(`${STORY_BACKEND}/discovery/pause/${encodeURIComponent(discRunId)}`,{method:'POST'}); if(!r.ok)setDiscError(r.error||'Could not pause run.'); else setDiscPolling(false); }
  async function resumeDiscovery(id=discRunId){ if(!STORY_BACKEND||!id)return; const r=await safeJSON(`${STORY_BACKEND}/discovery/resume/${encodeURIComponent(id)}`,{method:'POST'}); if(!r.ok){setDiscError(r.error||'Could not resume run.'); return;} setDiscRunId(id); setDiscPolling(true); }
  async function cancelDiscovery(){ if(!STORY_BACKEND||!discRunId)return; await safeJSON(`${STORY_BACKEND}/discovery/cancel/${encodeURIComponent(discRunId)}`,{method:'POST'}); setDiscPolling(false); loadDiscoveryArchive(); }

  useEffect(()=>{ if(!discPolling||!discRunId)return; let stopped=false; async function tick(){ if(stopped)return; const s=await safeJSON(`${STORY_BACKEND}/discovery/status/${encodeURIComponent(discRunId)}`); if(s.ok&&s.data)setDiscStatus(s.data); else if(s.error)setDiscError(s.error); const rr=await safeJSON(`${STORY_BACKEND}/discovery/results/${encodeURIComponent(discRunId)}?limit=120`); if(rr.ok&&rr.data){setDiscResults(rr.data); if(discoveryResultsReady(rr.data)){setDiscPolling(false); loadDiscoveryArchive(); return;}} if(isFailureStatus(s.data)||String(s.data?.stage||'').toLowerCase().includes('paused')){setDiscPolling(false); loadDiscoveryArchive(); return;} discTimer.current=setTimeout(tick,POLL_MS);} tick(); return()=>{stopped=true; if(discTimer.current)clearTimeout(discTimer.current);};},[discPolling,discRunId,loadDiscoveryArchive]);

  async function startRepository(mode:'bulk'){
    setRepoError(''); setRepoResults(null); setRepoStatus(null);
    if(!SEARCH_BACKEND){setRepoError(SEARCH_BACKEND_CONFIG_ERROR);return;}
    if(!bulkCSV){setRepoError('Upload a CSV first.');return;}
    const count=await countCsvRows(bulkCSV); if(count>BULK_MAX){setRepoError(`Bulk Discovery allows up to ${BULK_MAX} rows. This file appears to have ${count}.`);return;}
    const fd=new FormData();
    try { fd.append('file', await bulkCsvWithImplicitState(bulkCSV, state || 'Karnataka')); }
    catch (err:any) { setRepoError(err?.message || 'CSV must include name and district.'); return; }
    setRepoStarting(true);
    const r=await safeJSON(`${SEARCH_BACKEND}/repository/start?mode=${mode}`,{method:'POST',body:fd});
    setRepoStarting(false);
    if(!r.ok||!r.data){setRepoError(r.error||'Could not start Bulk Discovery.');return;}
    setRepoRunId(r.data.run_id); setRepoPolling(true); loadRepositoryArchive();
  }
  async function stopRepository(){ if(!SEARCH_BACKEND||!repoRunId)return; await safeJSON(`${SEARCH_BACKEND}/repository/cancel/${encodeURIComponent(repoRunId)}`,{method:'POST'}); setRepoPolling(false); loadRepositoryArchive(); }
  useEffect(()=>{ if(!repoPolling||!repoRunId)return; let stopped=false; async function tick(){ if(stopped)return; const s=await safeJSON(`${SEARCH_BACKEND}/repository/status/${encodeURIComponent(repoRunId)}`); if(s.ok&&s.data)setRepoStatus(s.data); else if(s.error)setRepoError(s.error); const rr=await safeJSON(`${SEARCH_BACKEND}/repository/results/${encodeURIComponent(repoRunId)}?limit=80`); if(rr.ok&&rr.data){setRepoResults(rr.data); if(repositoryResultsReady(rr.data)){setRepoPolling(false); loadRepositoryArchive(); return;}} if(isFailureStatus(s.data)){setRepoPolling(false); return;} repoTimer.current=setTimeout(tick,POLL_MS);} tick(); return()=>{stopped=true; if(repoTimer.current)clearTimeout(repoTimer.current);};},[repoPolling,repoRunId,loadRepositoryArchive]);

  async function startRecovery(){
    setRecoveryError(''); setRecoveryStatus(null);
    if(!SEARCH_BACKEND){setRecoveryError(SEARCH_BACKEND_CONFIG_ERROR); return;}
    if(!recoveryCSV){setRecoveryError('Upload a CSV first.'); return;}
    const fd = new FormData();
    fd.append('file', recoveryCSV);
    setRecoveryBusy(true);
    const r=await safeJSON(`${SEARCH_BACKEND}/repository/recheck/start?strategy=smart`,{method:'POST',body:fd});
    setRecoveryBusy(false);
    if(!r.ok||!r.data){setRecoveryError(r.error||'Could not start rerun.'); return;}
    setRecoveryRunId(r.data.run_id);
  }
  useEffect(()=>{ if(!recoveryRunId)return; let stopped=false; async function tick(){ if(stopped)return; const s=await safeJSON(`${SEARCH_BACKEND}/repository/recheck/status/${encodeURIComponent(recoveryRunId)}`); if(s.ok&&s.data)setRecoveryStatus(s.data); else if(s.error)setRecoveryError(s.error); if(isFailureStatus(s.data)||String(s.data?.stage||'').toLowerCase().startsWith('results_ready')||String(s.data?.run_status||'').toLowerCase()==='completed'){loadRepositoryArchive(); return;} recoveryTimer.current=setTimeout(tick,POLL_MS);} tick(); return()=>{stopped=true; if(recoveryTimer.current)clearTimeout(recoveryTimer.current);};},[recoveryRunId,loadRepositoryArchive]);

  function downloadPresenceSampleCsv(){
    downloadText('ngo_presence_check_sample.csv', 'ngo_name,state,center_name\nHumana People to People India,Delhi,Learning Centre 1\nHumana People to People India,Delhi,Learning Centre 2\nSparsha Trust,Karnataka,\n');
  }

  async function startPresenceCheck(){
    setPresenceError(''); setPresenceStatus(null); setPresenceResults(null);
    if(!SEARCH_BACKEND){setPresenceError(SEARCH_BACKEND_CONFIG_ERROR); return;}
    if(!presenceCSV){setPresenceError('Upload a CSV first.'); return;}
    const count=await countCsvRows(presenceCSV);
    if(count>BULK_MAX){setPresenceError(`NGO Presence Check allows up to ${BULK_MAX} rows. This file appears to have ${count}.`); return;}
    const fd = new FormData();
    fd.append('file', presenceCSV);
    setPresenceBusy(true);
    const r=await safeJSON(`${SEARCH_BACKEND}/repository/presence/start`,{method:'POST',body:fd});
    setPresenceBusy(false);
    if(!r.ok||!r.data){setPresenceError(r.error||'Could not start NGO Presence Check.'); return;}
    setPresenceRunId(r.data.run_id);
    loadRepositoryArchive();
  }

  async function cancelPresenceCheck(){
    if(!SEARCH_BACKEND||!presenceRunId)return;
    await safeJSON(`${SEARCH_BACKEND}/repository/presence/cancel/${encodeURIComponent(presenceRunId)}`,{method:'POST'});
    loadRepositoryArchive();
  }

  useEffect(()=>{ if(!presenceRunId)return; let stopped=false; async function tick(){ if(stopped)return; const s=await safeJSON(`${SEARCH_BACKEND}/repository/presence/status/${encodeURIComponent(presenceRunId)}`); if(s.ok&&s.data)setPresenceStatus(s.data); else if(s.error)setPresenceError(s.error); const rr=await safeJSON(`${SEARCH_BACKEND}/repository/presence/results/${encodeURIComponent(presenceRunId)}?limit=80`); if(rr.ok&&rr.data)setPresenceResults(rr.data); if(isFailureStatus(s.data)||String(s.data?.stage||'').toLowerCase().startsWith('results_ready')||String(s.data?.run_status||'').toLowerCase()==='completed'){loadRepositoryArchive(); return;} presenceTimer.current=setTimeout(tick,POLL_MS);} tick(); return()=>{stopped=true; if(presenceTimer.current)clearTimeout(presenceTimer.current);};},[presenceRunId,loadRepositoryArchive]);

  async function handleReferralFile(file: File){
    setReferralFile(file); setReferralError(''); setReferralMessage('');
    const text = await file.text();
    const rows = parseCsv(text).map(row => ({
      ngo_name: field(row, 'ngo_name', 'NGO Name', 'name', 'Organisation', 'organization'),
      district: field(row, 'district', 'District'),
      contact_number: field(row, 'contact_number', 'Contact Number', 'phone', 'Phone'),
      website: field(row, 'website', 'Website', 'url'),
      referred_by: field(row, 'referred_by', 'Referred By', 'referral_source', 'source'),
      comments: field(row, 'comments', 'Comments', 'notes', 'Notes'),
      information_status: field(row, 'website', 'Website', 'url') ? 'Sufficient' : 'Needs Follow-up',
      curation_status: 'pending_review',
    })).filter(row => row.ngo_name);
    if(!rows.length){setReferralRows([]); setReferralSelected({}); setReferralError('CSV must include ngo_name/name.'); return;}
    setReferralRows(rows);
    setReferralSelected(Object.fromEntries(rows.map((_,i)=>[i,true])));
  }
  function updateReferralRow(idx:number, patch:AnyRow){
    setReferralRows(rows => rows.map((row,i)=>i===idx?{...row,...patch}:row));
  }
  function selectedReferralRows(){
    return referralRows.filter((_,i)=>referralSelected[i] !== false);
  }
  async function saveReferrals(){
    const rows = selectedReferralRows();
    if(!rows.length){ setReferralMessage('Select at least one referral row.'); return; }
    await sendRowsToLeadPool(rows.map(row => ({...row, source_type:'Human Referral', notes: row.comments, reviewer_comments: row.comments})), 'Human Referral');
  }
  async function searchReferralWebsites(){
    if(!SEARCH_BACKEND||!referralRows.length)return;
    setReferralSearching(true); setReferralError('');
    const fd = new FormData();
    fd.append('file', new File([referralRowsToCsv(referralRows, state)], 'referral_website_search.csv', {type:'text/csv'}));
    const r=await safeJSON(`${SEARCH_BACKEND}/repository/start?mode=bulk`,{method:'POST',body:fd});
    setReferralSearching(false);
    if(!r.ok||!r.data){setReferralError(r.error||'Could not start website search.'); return;}
    setRepoRunId(r.data.run_id); setRepoPolling(true); setView('internet'); setTab('bulk'); loadRepositoryArchive();
  }

  const discRows:AnyRow[]=discResults?.stories||discResults?.rows||[];
  const discDownloads=discResults?.downloads||discStatus?.downloads||{};
  const repoRows:AnyRow[]=repoResults?.rows||[];
  const repoDownloads=repoResults?.downloads||repoStatus?.downloads||{};
  const presenceRows:AnyRow[]=presenceResults?.rows||[];
  const presenceDownloads=presenceResults?.downloads||presenceStatus?.downloads||{};
  const currentDisc=discStatus?.current_search||discStatus?.current_url||discStatus?.current_item||'Waiting to start';
  const currentRepo=repoStatus?.current_search||repoStatus?.current_url||repoStatus?.current_item||'Waiting to start';
  const curationOf = (r:AnyRow) => String(field(r,'curation_status','Curation Status') || 'pending_review').toLowerCase();
  const approvedLeads = leadPool.filter(r => ['approved_for_ranking','approved_with_comment'].includes(curationOf(r)));
  const pendingLeads = leadPool.filter(r => !['approved_for_ranking','approved_with_comment','needs_follow_up'].includes(curationOf(r)));
  const followupLeads = leadPool.filter(r => curationOf(r)==='needs_follow_up');
  const visibleLeads = poolView==='approved' ? approvedLeads : poolView==='followup' ? followupLeads : poolView==='all' ? leadPool : pendingLeads;

  function renderHistory(){
    return <div className="collapse-body advanced-history">
      <div className="archive-toolbar"><button className="quiet-btn" onClick={()=>{loadDiscoveryArchive(); loadRepositoryArchive();}}>Refresh</button>{SEARCH_BACKEND&&<a className="dark-download ready" href={`${SEARCH_BACKEND}/repository/export/global/history`}>Global history</a>}</div>
      <div className="history-subtitle">General Discovery</div>
      <div className="archive-list">
        {discArchive.length===0&&<div className="muted-empty">No discovery runs found yet.</div>}
        {discArchive.slice(0,100).map((r,i)=>{const id=String(r.run_id||''); const dl=r.downloads||{}; const legacy=r.module==='legacy_story'; return <div className="archive-row" key={id||i}><div><b>{sentRunIds[id]&&<span className="sent-star" title="Sent to Lead Pool">★</span>}{legacy?'Legacy Story Discovery':'General Discovery'} — {r.state||'Statewide'}</b><small>{r.updated_at||'—'} · {r.run_mode||'run'} · {r.processed||0}/{r.total||0} queries · surfaced {r.stories_found||0}</small></div><div className="archive-links">{dl.stories&&<a href={discoveryDownload(id,'leads')}>{legacy?'Output':'Clean output'}</a>}<button disabled={poolBusy} onClick={()=>sendRunToLeadPool(id,legacy?'legacy_story':'discovery','Archive Import')}>Send to Lead Pool</button>{dl.audit&&<a href={discoveryDownload(id,'audit')}>Audit</a>}{dl.rejected&&<a href={discoveryDownload(id,'rejected')}>Rejected</a>}{dl.candidates&&<a href={discoveryDownload(id,'candidates')}>Reviewed</a>}{dl.raw_candidates&&<a href={discoveryDownload(id,'raw_candidates')}>Raw</a>}{dl.queries&&<a href={discoveryDownload(id,'queries')}>Queries</a>}{dl.errors&&<a href={discoveryDownload(id,'errors')}>Errors</a>}{(r.stage==='paused'||r.run_status==='paused')&&<button onClick={()=>resumeDiscovery(id)}>Resume</button>}</div></div>;})}
      </div>
      <div className="history-subtitle">Bulk / Recovery</div>
      <div className="archive-list">
        {repoArchive.length===0&&<div className="muted-empty">No bulk runs found yet.</div>}
        {repoArchive.slice(0,100).map((r,i)=>{const id=String(r.run_id||''); const dl=r.downloads||{}; const moduleName=String(r.module||''); const isPresence=moduleName==='ngo_presence_check'; const title=isPresence?'NGO Presence Check':moduleName==='no_website_recheck'?'Recovery rerun':(r.run_type==='dedupe_recheck'?'Deduped NGO re-check':'Bulk Discovery'); return <div className="archive-row" key={id||i}><div><b>{sentRunIds[id]&&<span className="sent-star" title="Sent to Lead Pool">★</span>}{title}</b><small>{r.updated_at||'—'} · {id} · {r.stage||r.run_status||'—'} · rows {r.results_count||r.repository_count||0} · audit {r.audit_count||0} · rejected {r.rejected_count||0}</small></div><div className="archive-links">{dl.repository&&<a href={archiveDownload(r,'repository')}>Shortlist</a>}{dl.results&&<a href={archiveDownload(r,'results')}>{isPresence?'Presence CSV':'Results'}</a>}{!isPresence&&<button disabled={poolBusy} onClick={()=>sendRunToLeadPool(id,moduleName==='no_website_recheck'?'no_website_recheck':'repository','Archive Import')}>Send to Lead Pool</button>}{dl.summary&&<a href={archiveDownload(r,'summary')}>Summary</a>}{dl.skipped&&<a href={archiveDownload(r,'skipped')}>Skipped</a>}{dl.audit&&<a href={archiveDownload(r,'audit')}>Audit</a>}{dl.rejected&&<a href={archiveDownload(r,'rejected')}>Rejected</a>}{dl.duplicates&&<a href={archiveDownload(r,'duplicates')}>Dedupe audit</a>}{dl.errors&&<a href={archiveDownload(r,'errors')}>Errors</a>}{dl.history&&<a href={archiveDownload(r,'history')}>History</a>}</div></div>;})}
      </div>
    </div>;
  }

  function renderLeadPool(){
    return <section className="table-card lead-pool-card">
      <div className="table-title"><b>Lead Pool</b><span>{approvedLeads.length} approved · {pendingLeads.length} pending · {followupLeads.length} follow-up</span></div>
      <div className="lead-pool-actions">
        <button className={poolView==='pending'?'quiet-btn active':'quiet-btn'} onClick={()=>setPoolView('pending')}>Pending</button>
        <button className={poolView==='approved'?'quiet-btn active':'quiet-btn'} onClick={()=>setPoolView('approved')}>Approved Leads</button>
        <button className={poolView==='followup'?'quiet-btn active':'quiet-btn'} onClick={()=>setPoolView('followup')}>Follow-up</button>
        <button className={poolView==='all'?'quiet-btn active':'quiet-btn'} onClick={()=>setPoolView('all')}>All</button>
        <button className="quiet-btn" onClick={loadLeadPool}>Refresh</button>
        <button className="quiet-btn" onClick={downloadManualLeadSampleCsv}>Sample New Leads CSV</button>
        <input ref={leadImportRef} type="file" accept=".csv" hidden onChange={e=>importLeadPoolCsv(e.target.files?.[0]||null)} />
        <button className="quiet-btn" onClick={()=>leadImportRef.current?.click()}>Import New Leads CSV</button>
        <button className="quiet-btn" onClick={downloadShortlistDecisionCsv}>Download Shortlisting CSV</button>
        <input ref={shortlistImportRef} type="file" accept=".csv" hidden onChange={e=>importShortlistDecisionCsv(e.target.files?.[0]||null)} />
        <button className="quiet-btn" onClick={()=>shortlistImportRef.current?.click()}>Import Shortlisting CSV</button>
        {BACKEND&&<a className="dark-download ready" href={`${BACKEND}/workspace/${encodeURIComponent(state)}/lead-pool/export.csv`}>Download CSV</a>}
        <select className="lead-ranking-select" value={rankingTarget} onChange={e=>setRankingTarget(e.target.value)} title="Ranking assignment">
          <option value="everyone">Send to everyone</option>
          <option value="split">Split across PMs</option>
          {PM_NAMES.map(pm=><option key={pm} value={pm}>Send to {pm}</option>)}
        </select>
        <input className="lead-admin-password" type="password" value={rankingPassword} onChange={e=>setRankingPassword(e.target.value)} placeholder="Admin password" />
        <button className="primary-red small-red" disabled={poolBusy||!approvedLeads.length||!rankingPassword.trim()} onClick={sendLeadPoolToRanking}>Send for PM Shortlisting</button>
        {poolView==='approved'&&<button className="danger-btn" disabled={poolBusy||!approvedLeads.length||!rankingPassword.trim()} onClick={deleteAllApprovedLeads}>Delete all approved</button>}
        <button className="danger-btn" disabled={poolBusy||!visibleLeads.length} onClick={()=>deleteLeads({lead_ids: visibleLeads.map(r => r.lead_id).filter(Boolean)})}>Delete visible</button>
      </div>
      <AdminUndoRedo region={state} context="Lead Pool recovery" onRestored={loadLeadPool} />
      <div className="pool-helper">Old PM shortlist work is protected. Tags and shortlisting comments are required only for new leads moving forward; already assigned or reviewed NGOs are skipped, not overwritten. Use undo if a lead is sent forward, deleted, or imported by mistake.</div>
      {poolMessage&&<div className="pool-message">{poolMessage}</div>}
      <div className="scroll-table compact-pool"><table><thead><tr><th>NGO</th><th>Source</th><th>Source tag</th><th>Status</th><th>Website</th><th>Understanding</th><th>Contact</th><th>Shortlisting comment</th><th>Actions</th></tr></thead><tbody>{visibleLeads.length?visibleLeads.slice(0,120).map((r,i)=><tr key={r.lead_id||i}><td><b>{rowName(r)}</b><small>{rowLocation(r)||'—'}</small></td><td><span className="tag">{field(r,'source_mix','source_type','Source')||'—'}</span></td><td><span className="tag">{rowSourceTag(r)||'—'}</span></td><td><span className="tag">{rowStatus(r)||'pending_review'}</span><small>{rowInfoStatus(r)||''}</small></td><td><ExternalLink value={rowWebsite(r)}>open</ExternalLink></td><td>{rowOneLine(r)||'—'}</td><td>{rowContact(r)||'—'}</td><td>{rowShortlistingComment(r)||'—'}</td><td className="lead-actions"><button onClick={()=>sendForShortlisting(r)}>Send for shortlisting</button><button onClick={()=>curateLead(r,'needs_follow_up',true)}>Follow-up</button><button onClick={()=>curateLead(r,'sent_back_to_pool',true)}>Send back</button><button onClick={()=>editLead(r)}>Edit</button><button onClick={()=>{const comments=window.prompt('Add shortlisting comment', rowShortlistingComment(r)||rowNote(r)||''); if(comments!==null)updateLead(r,{shortlisting_comment:comments, curation_comment:comments,reviewer_comments:comments, notes: comments});}}>Comment</button><button onClick={()=>deleteLeads({lead_ids:[r.lead_id]})}>Delete</button></td></tr>):<tr><td colSpan={9}>No leads in this bucket.</td></tr>}</tbody></table></div>
    </section>;
  }

  return <><Header active="repository"/><main className="dfp-wrap page-stack discovery-revamp">
    <section className="module-hero discovery-hero"><div className="red-kicker">NGO Discovery Module</div><h1>Find the best <span>NGOs</span></h1><p>For internal use only</p><div className="hero-dots"/></section>

    {view==='source'&&<>
      <section className="state-gate-card">
        <div>
          <span className="red-kicker compact-kicker">Select region</span>
          <h2>{state}</h2>
        </div>
        <label>
          <span>State / UT</span>
          <select value={state} onChange={e=>setState(e.target.value)}>
            {states.map(s=><option key={s}>{s}</option>)}
          </select>
        </label>
      </section>
      <section className="source-choice-grid three-choice">
        <button className="source-choice-card" onClick={()=>setView('internet')}><span>01</span><b>Internet Leads</b><small>General Discovery, Bulk Discovery, History</small></button>
        <button className="source-choice-card" onClick={()=>setView('referrals')}><span>02</span><b>Referrals</b><small>Upload referral CSV, enrich, comment, save selected</small></button>
        <button className="source-choice-card leadpool-entry" onClick={()=>setView('leadpool')}><span>03</span><b>Go to Lead Pool</b><small>Approve leads, follow-ups, and send approved leads to ranking</small></button>
      </section>
    </>}

    {view==='internet'&&<>
      <div className="source-topline"><button className="quiet-btn" onClick={()=>setView('source')}>← Back</button><span>Internet Leads</span><button className="gear-btn" onClick={()=>setAdvancedOpen(!advancedOpen)}>⚙ Advanced</button></div>
      <section className="discover-card">
        <div className="mode-tabs"><button className={tab==='general'?'active':''} onClick={()=>setTab('general')}>General Discovery <small>find new</small></button><button className={tab==='bulk'?'active':''} onClick={()=>setTab('bulk')}>Bulk Discovery <small>csv</small></button></div>
        {tab==='general'&&<>
          <div className="story-top-controls no-state-control"><div className="selected-state-chip"><span>Selected State</span><b>{state}</b></div><label><span>Run mode</span><select value={runMode} onChange={e=>onModeChange(e.target.value)}>{runModes.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}</select></label><label><span>Query budget</span><input type="number" min={1} max={MAX_DISCOVERY_BUDGET} value={budget} onChange={e=>{setRunMode('custom');setBudget(Math.max(1,Math.min(MAX_DISCOVERY_BUDGET,Number(e.target.value||1))));}}/></label><button className="primary-red" disabled={discStarting||discPolling} onClick={startDiscovery}>{discStarting?'Starting…':'Start General Discovery'}</button>{discRunId&&discPolling&&<button className="ghost-btn" onClick={pauseDiscovery}>Pause</button>}{discRunId&&discPolling&&<button className="ghost-btn" onClick={cancelDiscovery}>Cancel</button>}</div>
          <div className="budget-strip"><b>{Number(budget||0).toLocaleString()} / {MAX_DISCOVERY_BUDGET.toLocaleString()} query cap</b><span>{runModes.find(m=>m.key===runMode)?.note || 'Manual query budget'}</span></div>
          <div className="category-grid-dark compact-categories">{pathwayOptions.map(p=><button key={p.key} className={pathways.includes(p.key)?'active':''} onClick={()=>togglePathway(p.key)}><i>{pathways.includes(p.key)?'✓':'+'}</i><span><b>{p.label}</b><small>{p.note}</small></span></button>)}</div>
          {discError&&<div className="error-box">{discError}</div>}
        </>}
        {tab==='bulk'&&<>
          <div className="form-card minimal-upload"><label>Upload NGO CSV</label><div className="upload-box" onClick={()=>bulkRef.current?.click()}><strong>{bulkCSV?bulkCSV.name:'Upload NGO CSV'}</strong><span>Required: name, district</span><small>{state} is applied from selected region.</small></div><input ref={bulkRef} type="file" accept=".csv" hidden onChange={e=>setBulkCSV(e.target.files?.[0]||null)}/><button className="sample-btn" onClick={()=>downloadText('bulk_discovery_sample.csv','name,district\nShanti Bhavan,Bengaluru\nMahesh Foundation,Belagavi\n')}>Sample Human Leads CSV</button><div className="action-row" style={{padding:'14px 0 0'}}><button className="primary-red" disabled={repoStarting||repoPolling} onClick={()=>startRepository('bulk')}>{repoStarting?'Starting…':'Run Bulk Discovery'}</button>{repoRunId&&repoPolling&&<button className="ghost-btn" onClick={stopRepository}>Stop</button>}</div></div>
          {repoError&&<div className="error-box">{repoError}</div>}
        </>}
      </section>

      {advancedOpen&&<section className="advanced-shell"><div className="advanced-head"><b>Advanced settings</b><button className="quiet-btn" onClick={()=>setHistoryOpen(!historyOpen)}>{historyOpen?'Hide History':'History'}</button></div>
        <div className="recovery-panel"><b>Smart Recovery rerun</b><input ref={recoveryRef} type="file" accept=".csv" hidden onChange={e=>setRecoveryCSV(e.target.files?.[0]||null)}/><button className="ghost-btn" onClick={()=>recoveryRef.current?.click()}>{recoveryCSV?recoveryCSV.name:'Upload CSV'}</button><button className="primary-red small-red" disabled={recoveryBusy||!recoveryCSV} onClick={startRecovery}>{recoveryBusy?'Starting…':'Run Smart Recovery'}</button>{recoveryRunId&&<button className="dark-download ready" disabled={poolBusy} onClick={()=>sendRunToLeadPool(recoveryRunId,'no_website_recheck','Smart Recovery')}>Send to Lead Pool</button>}{recoveryRunId&&<a className="dark-download ready" href={recheckDownload(recoveryRunId,'results')}>Results</a>}{recoveryRunId&&<a className="dark-download ready" href={recheckDownload(recoveryRunId,'summary')}>Summary</a>}{recoveryRunId&&<a className="dark-download ready" href={recheckDownload(recoveryRunId,'skipped')}>Skipped</a>}{recoveryRunId&&SEARCH_BACKEND&&<a className="dark-download ready" href={`${SEARCH_BACKEND}/repository/recheck/remaining/${encodeURIComponent(recoveryRunId)}`}>Remaining</a>}{recoveryStatus&&<small>{recoveryStatus.stage||recoveryStatus.run_status} · {recoveryStatus.processed||0}/{recoveryStatus.total||0} · queries {recoveryStatus.queries_used||0}</small>}{recoveryError&&<span className="mini-error">{recoveryError}</span>}</div>
        <div className="recovery-panel"><b>NGO Presence Check</b><span className="advanced-help">CSV columns: ngo_name, state, center_name optional. Checks only correct official website identity + digital presence strength. No child/program-fit scoring.</span><input ref={presenceRef} type="file" accept=".csv" hidden onChange={e=>setPresenceCSV(e.target.files?.[0]||null)}/><button className="ghost-btn" onClick={()=>presenceRef.current?.click()}>{presenceCSV?presenceCSV.name:'Upload CSV'}</button><button className="ghost-btn" onClick={downloadPresenceSampleCsv}>Sample CSV</button><button className="primary-red small-red" disabled={presenceBusy||!presenceCSV} onClick={startPresenceCheck}>{presenceBusy?'Starting…':'Run Presence Check'}</button>{presenceRunId&&<button className="ghost-btn" onClick={cancelPresenceCheck}>Cancel</button>}{presenceRunId&&<a className="dark-download ready" href={presenceDownload(presenceRunId,'results')}>Presence CSV</a>}{presenceRunId&&<a className="dark-download ready" href={presenceDownload(presenceRunId,'summary')}>Summary</a>}{presenceRunId&&<a className="dark-download ready" href={presenceDownload(presenceRunId,'audit')}>Audit</a>}{presenceStatus&&<small>{presenceStatus.stage||presenceStatus.run_status} · {presenceStatus.processed||0}/{presenceStatus.total||0} NGOs · rows {presenceStatus.rows_ready||presenceRows.length||0} · queries {presenceStatus.queries_used||0}</small>}{presenceError&&<span className="mini-error">{presenceError}</span>}</div>
        {presenceRows.length>0&&<div className="scroll-table presence-preview-table"><table><thead><tr><th>NGO</th><th>Center</th><th>State</th><th>Website</th><th>Confidence</th><th>Strength</th><th>Assessment</th></tr></thead><tbody>{presenceRows.slice(0,30).map((r,i)=><tr key={i}><td>{rowName(r)||field(r,'NGO Name')}</td><td>{field(r,'Center Name')||'—'}</td><td>{field(r,'State')||'—'}</td><td><ExternalLink value={field(r,'Official Website','Website')}>open</ExternalLink></td><td><span className={confidenceClass(field(r,'Website Confidence'))}>{field(r,'Website Confidence')||'—'}</span></td><td>{field(r,'Website Strength')||'—'}</td><td>{field(r,'Digital Presence Assessment')||'—'}</td></tr>)}</tbody></table></div>}
        {historyOpen&&renderHistory()}
      </section>}

      {(discStatus||discPolling)&&tab==='general'&&<section className="status-card"><div className="status-dot"/><div><b>{discStatus?.stage||(discPolling?'Starting…':'Waiting')}</b><p>{currentDisc}</p></div><div className="status-grid"><StatBox label="State" value={state}/><StatBox label="Queries used" value={discStatus?.processed??0}/><StatBox label="Budget" value={discStatus?.total??budget}/><StatBox label="Sources" value={discStatus?.links_found??'—'}/><StatBox label="Organisations" value={discStatus?.stories_found??discRows.length}/></div></section>}
      {(repoStatus||repoPolling)&&tab==='bulk'&&<section className="status-card"><div className="status-dot"/><div><b>{repoStatus?.stage||(repoPolling?'Starting…':'Waiting')}</b><p>{currentRepo}</p></div><div className="status-grid"><StatBox label="Mode" value="bulk"/><StatBox label="Processed" value={repoStatus?.processed??0}/><StatBox label="Total" value={repoStatus?.total??'—'}/><StatBox label="Ready for AI" value={repoStatus?.ready_for_ai??'—'}/><StatBox label="Errors" value={repoStatus?.errors??'—'}/></div></section>}
      {tab==='general'&&discRunId&&<div className="download-row"><DownloadButton ready={!!discDownloads.stories||!!discDownloads.story_csv} href={discoveryDownload(discRunId,'leads')}>Clean output CSV</DownloadButton><button className="dark-download ready" disabled={poolBusy} onClick={()=>sendRunToLeadPool(discRunId,'discovery','Internet Discovery')}>Send to Lead Pool</button><DownloadButton ready={!!discDownloads.audit} href={discoveryDownload(discRunId,'audit')}>Audit</DownloadButton><DownloadButton ready={!!discDownloads.rejected} href={discoveryDownload(discRunId,'rejected')}>Rejected</DownloadButton><DownloadButton ready={!!discDownloads.queries} href={discoveryDownload(discRunId,'queries')}>Query plan</DownloadButton></div>}
      {tab==='bulk'&&repoRunId&&<div className="download-row"><DownloadButton ready={!!repoDownloads.repository} href={repositoryDownload(repoRunId,'repository')}>Verified CSV</DownloadButton><button className="dark-download ready" disabled={poolBusy} onClick={()=>sendRunToLeadPool(repoRunId,'repository','Bulk Discovery')}>Send to Lead Pool</button><DownloadButton ready={!!repoDownloads.audit} href={repositoryDownload(repoRunId,'audit')}>Audit</DownloadButton><DownloadButton ready={!!repoDownloads.rejected} href={repositoryDownload(repoRunId,'rejected')}>Rejected</DownloadButton><DownloadButton ready={!!repoDownloads.errors} href={repositoryDownload(repoRunId,'errors')}>Errors</DownloadButton></div>}
      {tab==='general'&&!!discRows.length&&<section className="table-card"><div className="table-title"><b>General Discovery output</b><span>{discRows.length} surfaced leads</span></div><div className="scroll-table"><table><thead><tr><th>Organisation</th><th>Source</th><th>Location</th><th>Pathway</th><th>Why it belongs</th><th>Status</th><th>Confidence</th></tr></thead><tbody>{discRows.slice(0,120).map((r,i)=><DiscoveryRow row={r} key={i}/>)}</tbody></table></div></section>}
      {tab==='bulk'&&!!repoRows.length&&<section className="table-card"><div className="table-title"><b>Bulk Discovery output</b><span>{repoRows.length} rows</span></div><div className="scroll-table"><table><thead><tr><th>Input / NGO</th><th>Website</th><th>Location</th><th>Confidence</th><th>Match</th><th>Note</th></tr></thead><tbody>{repoRows.slice(0,80).map((r,i)=><VerifyRow row={r} key={i}/>)}</tbody></table></div></section>}
    </>}

    {view==='referrals'&&<>
      <div className="source-topline"><button className="quiet-btn" onClick={()=>setView('source')}>← Back</button><span>Referrals</span></div>
      <section className="discover-card referral-card">
        <div className="form-card minimal-upload"><label>Upload Referral CSV</label><div className="upload-box" onClick={()=>referralRef.current?.click()}><strong>{referralFile?referralFile.name:'Upload Referral CSV'}</strong><span>Required: ngo_name, contact_number, referred_by</span><small>Optional: district, website, comments</small></div><input ref={referralRef} type="file" accept=".csv" hidden onChange={e=>{const file=e.target.files?.[0]; if(file)handleReferralFile(file);}}/><button className="sample-btn" onClick={()=>downloadText('referral_sample.csv','ngo_name,contact_number,referred_by,district,website,comments\nExample NGO,9876543210,Avika,Bengaluru,,Spoken to founder\n')}>Sample Human Leads CSV</button></div>
        {referralError&&<div className="error-box">{referralError}</div>}
        {referralRows.length>0&&<><div className="referral-actions"><button className="primary-red" disabled={poolBusy} onClick={saveReferrals}>Save selected</button><button className="ghost-btn" disabled={referralSearching} onClick={searchReferralWebsites}>{referralSearching?'Starting…':'Run enrichment'}</button><button className="dark-download ready" onClick={()=>downloadText('referral_clean_preview.csv', referralRowsToCsv(referralRows, state))}>Export clean CSV</button></div>{referralMessage&&<div className="pool-message">{referralMessage}</div>}<div className="scroll-table referral-preview-table"><table><thead><tr><th>Send</th><th>NGO</th><th>District</th><th>Website</th><th>Contact</th><th>Referred by</th><th>Comment</th><th>Status</th></tr></thead><tbody>{referralRows.map((r,i)=><tr key={i}><td><input type="checkbox" checked={referralSelected[i] !== false} onChange={e=>setReferralSelected(old=>({...old,[i]:e.target.checked}))}/></td><td>{rowName(r)}</td><td>{rowLocation(r)||'—'}</td><td><ExternalLink value={rowWebsite(r)}>open</ExternalLink></td><td>{rowContact(r)||'—'}</td><td>{rowReferredBy(r)||'—'}</td><td><input className="mini-comment-input" value={String(rowNote(r)||'')} onChange={e=>updateReferralRow(i,{comments:e.target.value,notes:e.target.value})} placeholder="Add context"/></td><td><span className="tag">{rowStatus(r)||'preview'}</span></td></tr>)}</tbody></table></div></>}
      </section>
    </>}


    {view==='leadpool'&&<>
      <div className="source-topline"><button className="quiet-btn" onClick={()=>setView('source')}>← Back</button><span>Lead Pool</span><div className="topline-actions"><button className="quiet-btn" onClick={loadLeadPool}>Refresh</button><Link className="primary-red small-red nav-action-link" href="/progress">Go to Rankings</Link></div></div>
      {renderLeadPool()}
    </>}

    <footer className="page-foot">For internal use only</footer>
  </main></>;
}
