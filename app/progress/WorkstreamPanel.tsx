'use client';

import { backendFetch } from '@/lib/backendClient';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PM_PROFILES } from '@/lib/progressData';
import ScoringTutorial from '@/components/ScoringTutorial';
import {
  DEFAULT_METRIC_SCORES,
  EMPTY_METRIC_EVIDENCE,
  METRIC_DEFINITIONS,
  MetricEvidence,
  MetricKey,
  MetricReferenceLibraryModal,
  MetricReferenceModal,
  MetricScore,
  MetricScoringCard,
  evidenceLinksToText,
  normaliseMetricEvidence,
  normaliseMetricScores,
  parseEvidenceLinks,
} from '@/components/MetricScoring';

type GuestReferenceReview = {
  reviewer?: string;
  metric_scores?: Partial<Record<MetricKey, MetricScore>>;
  exception_override?: ExceptionOverride;
  rank?: number | string;
  decision?: number | string;
  rank_label?: string;
  reason?: string;
  submitted_at?: string;
};

type Task = {
  ngo_name: string;
  website?: string;
  background?: string;
  metric_evidence?: Partial<Record<MetricKey, MetricEvidence>>;
  guest_reference_review?: GuestReferenceReview;
  [key: string]: any;
};

type ExceptionOverride = { enabled: boolean; rank: number; reason: string };
const DEFAULT_EXCEPTION_OVERRIDE: ExceptionOverride = { enabled: false, rank: 3, reason: '' };

function normaliseExceptionOverride(value: unknown): ExceptionOverride {
  const raw = value && typeof value === 'object' ? value as Record<string, any> : {};
  const rankValue = Number(raw.rank ?? raw.score ?? raw.override_rank ?? 3);
  const rank = Number.isFinite(rankValue) ? Math.min(5, Math.max(1, Math.round(rankValue))) : 3;
  const enabled = raw.enabled === true || ['1', 'true', 'yes', 'on'].includes(String(raw.enabled ?? raw.active ?? raw.override ?? '').trim().toLowerCase());
  return { enabled, rank, reason: String(raw.reason ?? raw.override_reason ?? '') };
}

type ResponseRow = {
  decision?: string;
  rank?: number;
  rank_label?: string;
  reason?: string;
  metric_scores?: Partial<Record<MetricKey, MetricScore>>;
  metric_submitted?: boolean;
  metric_submitted_at?: string;
  metric_scoring_version?: string;
  exception_override?: ExceptionOverride;
  ngo_description?: string;
  contact_number?: string;
  referral_source?: string;
  referral_poc?: string;
  submitted?: boolean;
  submitted_at?: string;
  global_saved?: boolean;
  global_saved_at?: string;
};

type PmData = {
  name: string;
  deadline: string;
  deadline_note?: string;
  responsibility: string;
  task_type: 'shortlisting' | 'ngo_details' | string;
  tasks: Task[];
  responses: Record<string, ResponseRow>;
  last_submitted_task_index?: number | string;
  last_submitted_at?: string;
};

type WorkstreamData = {
  review_rules: string;
  scoring_reference_url?: string;
  pms: Record<string, PmData>;
  global_log?: any[];
  ai_log?: any[];
};

type AiReview = {
  headline?: string;
  quality_flags?: string[];
  suggestions?: string[];
  pace_comment?: string;
  encouragement?: string;
  source?: string;
};

type AdminEvidenceDraft = Record<MetricKey, { text: string; linksText: string; ceilingRank: string; ceilingReason: string }>;

const PM_NAMES = ['Milan', 'Rachit', 'Ipshita', 'Avika', 'Kamran', 'Piyush', 'Tanishq', 'Guest'];
const SHORTLIST_PM_NAMES = PM_NAMES;
const GUEST_SOURCE_PM_NAMES = PM_NAMES.filter(name => name !== 'Guest');
const LEADERBOARD_NAMES = SHORTLIST_PM_NAMES.filter(name => name !== 'Milan' && name !== 'Guest');
const DEFAULT_RULES = 'Review only expression quality: length, clarity, and whether the PM captured their thought process. Do not critique the NGO, the rank, the source, the pathway, or whether the PM is right. Do not ask for contact, referral, POC, source, geography, cohort, operational proof, or extra NGO facts. Hinglish, fragments, spelling mistakes, no punctuation and stream of consciousness are fine. Encourage people to type more of what went through their head.';
const DEFAULT_DEADLINE_NOTE = 'Once everyone submits, we compare rankings, identify strong cohorts, resolve overlaps, and move to human lead follow-ups. This needs to close by Wednesday so the lead list can be wrapped by the end of the week.';
const DEFAULT_TASKS: Task[] = [
  { ngo_name: 'Aina Trust', website: 'www.ainatrust.in/about-aina.html', background: 'Early childhood care centres, anganwadi strengthening, nutrition support and education programs for vulnerable young children.' },
  { ngo_name: 'Cerebloom Academy', website: 'https://cerebloom.org/', background: 'Rural science education and mentorship program for underserved students. Review regularity and depth.' },
  { ngo_name: 'Don Bosco Child Labour Mission', website: 'dbclm.org', background: 'Child labour rehabilitation, bridge schooling, open shelter and prevention work.' },
];

const RANKS: Record<number, { short: string; line: string; tone: string }> = {
  1: { short: 'Not a fit', line: 'Not useful for this shortlist.', tone: 'weak' },
  2: { short: 'Weak fit', line: 'Could fit somewhere, but not a strong use case.', tone: 'low' },
  3: { short: 'DFP fit', line: 'Can work as a regular DFP school/centre; nothing very distinctive.', tone: 'mid' },
  4: { short: 'Strong fit', line: 'More than ordinary — clear extra layer or distinctive pathway.', tone: 'high' },
  5: { short: 'Transformative', line: 'Highest potential: being part of this could change a child’s trajectory.', tone: 'top' },
};
const PM_ICONS: Record<string, string> = { Milan: '◆', Rachit: '◌', Ipshita: '✦', Avika: '★', Kamran: '▣', Piyush: '✚', Tanishq: 'T', Guest: '' };
const PM_LINES: Record<string, string[]> = {
  Milan: ['Gurgaon has produced signal. Strange but welcome.', 'Minimalist review; future people will still manage.', 'This was shorter than a meeting invite and more useful.'],
  Rachit: ['Banana chips moved one step closer.', 'Networking speed, but with actual notes.', 'More useful than a WhatsApp forward. Low bar, cleared.'],
  Ipshita: ['Green tea has been provisionally approved.', 'Rough but usable. Nutrition for the spreadsheet.', 'Adult supervision detected. Rare event.'],
  Avika: ['Orange Lays energy, but somehow productive.', 'Crisp enough. Food-sharing policy remains unresolved.', 'This shortlist has texture now. Slightly alarming.'],
  Kamran: ['Drama avoided. Historic.', 'Brutally practical. Spreadsheet warned.', 'No field visit required for this sentence.'],
  Piyush: ['Karma points credited, audit pending.', 'Angel Faridabad has filed judgement.', 'Desk helicopters have cleared this row.'],
  Tanishq: ['One more shortlist judgement saved.', 'South India desk, now with an actual score.', 'Useful review captured. Spreadsheet briefly satisfied.'],
  Guest: ['Guest assessment saved.'],
};
const PM_HALF_MILESTONE: Record<string, string> = {
  Avika: 'Avika, halfway done. Orange Lays checkpoint unlocked.',
  Ipshita: 'Ipshu, green tea has been earned. Halfway crossed.',
  Rachit: 'Rachit, banana chips have been spiritually approved.',
  Kamran: 'Kamran, may you avoid more drama. Halfway done.',
  Piyush: 'More karma points credited. Halfway done.',
  Tanishq: 'Tanishq is halfway through the shortlist.',
  Milan: 'Halfway done. The spreadsheet has not won yet.',
};

function backendBase() { return (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, ''); }
function wordCount(value?: string) { return String(value || '').trim().split(/\s+/).filter(Boolean).length; }
function safeUrl(url?: string) { const raw = String(url || '').trim(); if (!raw) return ''; return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`; }
function defaultDeadline(offsetHours = 18) { const d = new Date(Date.now() + offsetHours * 3600000); const p = (x: number) => String(x).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }
function emptyAdminEvidence(): AdminEvidenceDraft { return { child_progression: { text: '', linksText: '', ceilingRank: '', ceilingReason: '' }, learning_model: { text: '', linksText: '', ceilingRank: '', ceilingReason: '' }, development_ecosystem: { text: '', linksText: '', ceilingRank: '', ceilingReason: '' } }; }
function makeDefaultData(): WorkstreamData {
  const pms: Record<string, PmData> = {};
  PM_NAMES.forEach((name, index) => {
    pms[name] = {
      name,
      deadline: defaultDeadline(18 + index),
      deadline_note: DEFAULT_DEADLINE_NOTE,
      responsibility: name === 'Guest' ? '' : 'Review assigned NGOs and capture judgement clearly. Stream of consciousness is fine.',
      task_type: 'shortlisting',
      tasks: name === 'Guest' || name === 'Tanishq' ? [] : DEFAULT_TASKS,
      responses: {},
    };
  });
  return { review_rules: DEFAULT_RULES, scoring_reference_url: '', pms, global_log: [], ai_log: [] };
}

function normaliseWorkstreamData(value: any): WorkstreamData {
  const base = makeDefaultData();
  const next: WorkstreamData = value && typeof value === 'object' ? structuredClone(value) : base;
  next.review_rules = next.review_rules || DEFAULT_RULES;
  next.scoring_reference_url = next.scoring_reference_url || '';
  next.pms = next.pms && typeof next.pms === 'object' ? next.pms : {};
  next.global_log = Array.isArray(next.global_log) ? next.global_log : [];
  next.ai_log = Array.isArray(next.ai_log) ? next.ai_log : [];
  for (const name of PM_NAMES) {
    const fallback = base.pms[name];
    const current = next.pms[name] || structuredClone(fallback);
    current.name = name;
    current.deadline = current.deadline || fallback.deadline;
    current.deadline_note = current.deadline_note || fallback.deadline_note;
    current.responsibility = name === 'Guest' ? '' : (current.responsibility || fallback.responsibility);
    current.tasks = Array.isArray(current.tasks) ? current.tasks : [];
    current.responses = current.responses && typeof current.responses === 'object' ? current.responses : {};
    if (name === 'Tanishq' && current.task_type === 'ngo_details') {
      const migratedTasks: Task[] = [];
      current.tasks.forEach((task: Task, index: number) => {
        const oldResponse = current.responses?.[String(index)] || {};
        const placeholder = /^Referral NGO [123]$/i.test(String(task?.ngo_name || '').trim());
        const details = String(oldResponse.ngo_description || '').trim();
        const contact = String(oldResponse.contact_number || oldResponse.referral_poc || '').trim();
        const referral = String(oldResponse.referral_source || '').trim();
        if (placeholder && !details && !contact && !referral && !task?.website) return;
        const extra = [details && `NGO details: ${details}`, contact && `POC: ${contact}`, referral && `Referral source: ${referral}`].filter(Boolean).join(' | ');
        migratedTasks.push({ ...task, background: [task.background, extra].filter(Boolean).join(' | ') });
      });
      current.tasks = migratedTasks;
      current.responses = {};
    }
    current.task_type = 'shortlisting';
    next.pms[name] = current;
  }
  return next;
}
function metricResponseComplete(row?: ResponseRow) {
  if (!row) return false;
  if (row.metric_submitted) return true;
  const scores = normaliseMetricScores(row.metric_scores);
  const exception = normaliseExceptionOverride(row.exception_override);
  const metricsValid = METRIC_DEFINITIONS.every(metric => {
    const item = scores[metric.key];
    return item.rank >= 1 && item.rank <= 5 && String(item.reason || '').trim().length >= 100;
  });
  const exceptionValid = !exception.enabled || (exception.rank >= 1 && exception.rank <= 5 && String(exception.reason || '').trim().length >= 100);
  return metricsValid && exceptionValid;
}
function responseText(row?: ResponseRow) {
  if (!row) return '';
  const scores = normaliseMetricScores(row.metric_scores);
  const metricText = METRIC_DEFINITIONS.map(metric => scores[metric.key].reason).filter(Boolean).join(' ');
  const exception = normaliseExceptionOverride(row.exception_override);
  return [metricText, exception.enabled ? exception.reason : ''].filter(Boolean).join(' ') || row.reason || row.ngo_description || '';
}
function submittedRows(pm?: PmData) {
  const details = pm?.task_type === 'ngo_details';
  return Object.entries(pm?.responses || {}).filter(([, raw]) => {
    const row = raw as ResponseRow;
    return details ? Boolean(row?.submitted) : metricResponseComplete(row);
  }) as Array<[string, ResponseRow]>;
}
function submittedCount(pm?: PmData) { return submittedRows(pm).length; }
function countdown(deadline: string) { const diff = new Date(deadline).getTime() - Date.now(); if (!deadline || Number.isNaN(diff) || diff <= 0) return { hours: '0h', rest: '00m 00s' }; const sec = Math.floor(diff / 1000); const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); const s = sec % 60; return { hours: `${h}h`, rest: `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s` }; }
function niceTime(ts?: string) { if (!ts) return ''; const d = new Date(String(ts).replace(' ', 'T')); return Number.isNaN(d.getTime()) ? ts : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
function exportHref() { const base = backendBase(); return base ? `${base}/workstream/export.csv` : '#'; }
function pct(done: number, total: number) { return total ? Math.round((done / total) * 100) : 0; }
function formatDuration(seconds?: number | null) { if (!seconds) return '—'; return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`; }
function latestSubmitMs(pm?: PmData) { const times = submittedRows(pm).map(([, row]) => new Date(String(row.metric_submitted_at || row.submitted_at)).getTime()).filter(Number.isFinite); return times.length ? Math.max(...times) : 0; }
function avgPace(pm?: PmData) { const times = submittedRows(pm).map(([, row]) => new Date(String(row.metric_submitted_at || row.submitted_at)).getTime()).filter(Number.isFinite).sort((a, b) => a - b); if (times.length < 2) return '—'; const diffs = times.slice(1).map((time, index) => Math.max(1, Math.round((time - times[index]) / 1000))); const avg = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length); return formatDuration(avg); }
function latestSubmittedIndex(pm?: PmData) { const tasks = pm?.tasks || []; const preferred = pm?.task_type === 'ngo_details' ? (pm as any)?.last_submitted_task_index : (pm as any)?.last_metric_submitted_task_index; const raw = Number(preferred); if (Number.isFinite(raw) && raw >= 0 && raw < tasks.length) return raw; const rows = submittedRows(pm); if (!rows.length) return 0; let best = 0; let bestMs = -1; rows.forEach(([idx, row]) => { const ms = new Date(String(row.metric_submitted_at || row.submitted_at || row.global_saved_at || '')).getTime(); const n = Number(idx); if (Number.isFinite(n) && (Number.isFinite(ms) ? ms : 0) >= bestMs) { best = n; bestMs = Number.isFinite(ms) ? ms : 0; } }); return Math.min(Math.max(best, 0), Math.max(0, tasks.length - 1)); }
function parseCsvLine(line: string) { const cells: string[] = []; let cur = ''; let quoted = false; for (let i = 0; i < line.length; i += 1) { const ch = line[i]; if (ch === '"' && line[i + 1] === '"') { cur += '"'; i += 1; continue; } if (ch === '"') { quoted = !quoted; continue; } if (ch === ',' && !quoted) { cells.push(cur.trim()); cur = ''; continue; } cur += ch; } cells.push(cur.trim()); return cells; }
function parseTasks(value: string): Task[] { const lines = value.split(/\r?\n/).map(item => item.trim()).filter(Boolean); if (!lines.length) return []; const first = lines[0].toLowerCase(); const hasHeader = /ngo|name|website|source|description|background|details/.test(first); const headers = hasHeader ? parseCsvLine(lines[0]).map(item => item.toLowerCase().trim()) : []; const body = hasHeader ? lines.slice(1) : lines; return body.map(line => { const cells = parseCsvLine(line); let name = cells[0] || ''; let website = cells[1] || ''; let background = cells.slice(2).join(' ').trim(); if (headers.length) { const get = (patterns: RegExp[], fallback: number) => { const idx = headers.findIndex(header => patterns.some(pattern => pattern.test(header))); return (idx >= 0 ? cells[idx] : cells[fallback]) || ''; }; name = get([/ngo.*name/, /^name$/], 0); website = get([/website/, /source/, /url/, /link/], 1); background = get([/description/, /background/, /context/, /note/, /details/], 2) || cells.slice(2).join(' '); } return { ngo_name: name || 'Untitled NGO', website, background }; }).filter(task => task.ngo_name && task.ngo_name !== 'Untitled NGO'); }
function profileFor(name: string) { return Array.from(PM_PROFILES as unknown as any[]).find(pm => pm.name === name) || { name, tagline: '', role: 'PM', about: 'Details to be added.', img: '' }; }
function guestReference(value: unknown): GuestReferenceReview | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as GuestReferenceReview;
  const rawScores = raw.metric_scores && typeof raw.metric_scores === 'object' ? raw.metric_scores : undefined;
  const hasMetrics = Boolean(rawScores && METRIC_DEFINITIONS.every(metric => {
    const row = (rawScores as Partial<Record<MetricKey, MetricScore>>)[metric.key];
    const rank = Number(row?.rank || 0);
    return Number.isFinite(rank) && rank >= 1 && rank <= 5;
  }));
  const scores = hasMetrics ? normaliseMetricScores(rawScores) : undefined;
  const legacyRank = Number(raw.rank || raw.decision || 0);
  if (!hasMetrics && (!Number.isFinite(legacyRank) || legacyRank < 1 || legacyRank > 5)) return null;
  return { ...raw, metric_scores: scores };
}
function qualityLabel(text: string, isDetails: boolean) { const w = wordCount(text); if (isDetails) { if (w >= 18) return 'Clear'; if (w >= 7) return 'Usable'; return 'Short'; } if (w >= 30) return 'Deep'; if (w >= 12) return 'Clear'; if (w >= 3) return 'Usable'; return 'Short'; }
function paceBadge(delta: number) { if (!delta) return 'First'; if (delta < 35) return 'Fast'; if (delta < 90) return 'Efficient'; if (delta < 180) return 'Thoughtful'; if (delta < 360) return 'Taking time'; return 'Slow burn'; }
function countsByRank(pm?: PmData) { const rows = submittedRows(pm).map(([, row]) => Number(row.rank || row.decision || 0)); return [1, 2, 3, 4, 5].reduce((acc, rank) => ({ ...acc, [rank]: rows.filter(rowRank => rowRank === rank).length }), {} as Record<number, number>); }
function avgRank(pm?: PmData) { const rows = submittedRows(pm).map(([, row]) => Number(row.rank || row.decision || 0)).filter(Boolean); if (!rows.length) return '—'; return (rows.reduce((a, b) => a + b, 0) / rows.length).toFixed(1); }
function reviewerMode(pm?: PmData) { const rows = submittedRows(pm).map(([, row]) => row); if (!rows.length) return 'Not started'; const avgWords = Math.round(rows.reduce((sum, row) => sum + wordCount(responseText(row)), 0) / Math.max(1, rows.length)); if (avgWords >= 35) return 'Essay Department'; if (avgWords <= 3) return 'Minimalist menace'; return rows.length >= 5 ? 'Speed Reviewer' : 'Warming up'; }
function milestoneText(name: string, done: number, total: number) { const progress = pct(done, total); if (progress >= 100) return `${name} finished. Task closed.`; if (progress >= 75) return '75% done. Final stretch.'; if (progress >= 50) return PM_HALF_MILESTONE[name] || `${name} is halfway done.`; if (progress >= 25) return '25% done. Momentum exists.'; if (progress >= 10) return '10% done. Engine started.'; return ''; }
function csvSample() { const sample = 'NGO name,Website/source,Description\nExample NGO,https://example.org,Runs a regular child pathway with useful context.\nSecond NGO,https://source.org,Add the background note PMs need to review.'; const blob = new Blob([sample], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'pm_review_tasks_sample.csv'; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url); }

type TaskContextData = { facts: Array<{ label: string; value: string }>; context: string; reviewerNote: string };
function parseTaskContext(value?: string): TaskContextData {
  const raw = String(value || '').trim();
  if (!raw) return { facts: [], context: '', reviewerNote: '' };
  const segments = raw.split(/\s*\|\s*/).map(item => item.trim()).filter(Boolean);
  const facts: Array<{ label: string; value: string }> = [];
  const prose: string[] = [];
  let reviewerNote = '';
  const factLabels = new Set(['shortlisted by', 'location', 'source title', 'source', 'lead source', 'type']);
  for (const segment of segments) {
    const match = segment.match(/^([^:]{2,42}):\s*(.+)$/);
    if (!match) { prose.push(segment); continue; }
    const label = match[1].trim();
    const key = label.toLowerCase();
    const text = match[2].trim();
    if (key === 'reviewer note' || key === 'review note' || key === 'pm note') reviewerNote = text;
    else if (key === 'context' || key === 'background' || key === 'description') prose.push(text);
    else if (factLabels.has(key)) facts.push({ label, value: text });
    else prose.push(segment);
  }
  if (segments.length === 1 && facts.length === 0 && !reviewerNote) return { facts: [], context: raw, reviewerNote: '' };
  return { facts, context: prose.join(' '), reviewerNote };
}
function TaskContext({ value }: { value?: string }) {
  const parsed = parseTaskContext(value);
  if (!parsed.facts.length && !parsed.context && !parsed.reviewerNote) return null;
  return (
    <section className="ngo-context-block" aria-label="NGO context">
      {parsed.facts.length > 0 && <div className="ngo-context-chips">{parsed.facts.map((fact, index) => <span key={`${fact.label}-${index}`}><b>{fact.label}</b>{fact.value}</span>)}</div>}
      {parsed.context && <p className="ngo-context-copy">{parsed.context}</p>}
      {parsed.reviewerNote && <blockquote className="ngo-reviewer-note"><span>Reviewer note</span><p>{parsed.reviewerNote}</p></blockquote>}
    </section>
  );
}

export default function WorkstreamPanel({ stateName }: { stateName: string }) {
  const [data, setData] = useState<WorkstreamData>(() => makeDefaultData());
  const [screen, setScreen] = useState<'board' | 'workspace'>('board');
  const [selectedPM, setSelectedPM] = useState('Avika');
  const [mode, setMode] = useState<'responsibility' | 'task'>('responsibility');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rank, setRank] = useState(3);
  const [reason, setReason] = useState('');
  const [metricScores, setMetricScores] = useState<Record<MetricKey, MetricScore>>(() => structuredClone(DEFAULT_METRIC_SCORES));
  const [exceptionOverride, setExceptionOverride] = useState<ExceptionOverride>(() => ({ ...DEFAULT_EXCEPTION_OVERRIDE }));
  const [referenceMetric, setReferenceMetric] = useState<MetricKey | null>(null);
  const [referenceLibraryOpen, setReferenceLibraryOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const metricSectionRef = useRef<HTMLDivElement>(null);
  const [reranking, setReranking] = useState(false);
  const [description, setDescription] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [, setTick] = useState(0);
  const [msg, setMsg] = useState('');
  const [lastBadge, setLastBadge] = useState('');
  const [lastPaceSeconds, setLastPaceSeconds] = useState<number | null>(null);
  const [lastQuality, setLastQuality] = useState('');
  const [streak, setStreak] = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPm, setAdminPm] = useState('Avika');
  const [adminEvidenceTaskIndex, setAdminEvidenceTaskIndex] = useState('0');
  const [adminEvidence, setAdminEvidence] = useState<AdminEvidenceDraft>(() => emptyAdminEvidence());
  const [adminReferenceUrl, setAdminReferenceUrl] = useState('');
  const [transferFromPm, setTransferFromPm] = useState('Avika');
  const [transferToPm, setTransferToPm] = useState('Milan');
  const [transferStart, setTransferStart] = useState('1');
  const [transferEnd, setTransferEnd] = useState('1');
  const [transferMoveResponses, setTransferMoveResponses] = useState(true);
  const [deletePm, setDeletePm] = useState('Avika');
  const [deleteStart, setDeleteStart] = useState('1');
  const [deleteEnd, setDeleteEnd] = useState('1');
  const [adminRules, setAdminRules] = useState(DEFAULT_RULES);
  const [adminDeadline, setAdminDeadline] = useState('');
  const [adminDeadlineNote, setAdminDeadlineNote] = useState('');
  const [adminResponsibility, setAdminResponsibility] = useState('');
  const [adminTasks, setAdminTasks] = useState<Task[]>([]);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiTitle, setAiTitle] = useState('Response review');
  const [aiReview, setAiReview] = useState<AiReview | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiHelpful, setAiHelpful] = useState<string | null>(null);
  const [aiFeedbackText, setAiFeedbackText] = useState('');
  const [aboutPM, setAboutPM] = useState<any>(null);
  const [milestoneOpen, setMilestoneOpen] = useState(false);
  const [milestoneCopy, setMilestoneCopy] = useState('');
  const [guestThanks, setGuestThanks] = useState<{ reference: GuestReferenceReview | null; advance: boolean } | null>(null);
  const [guestGearOpen, setGuestGearOpen] = useState(false);
  const [guestSourcePm, setGuestSourcePm] = useState('Avika');
  const [guestTaskIndex, setGuestTaskIndex] = useState('0');
  const [guestNgoSearch, setGuestNgoSearch] = useState('');
  const [guestAdminPassword, setGuestAdminPassword] = useState('');
  const [guestCopying, setGuestCopying] = useState(false);

  const pm = data.pms?.[selectedPM] || makeDefaultData().pms[selectedPM];
  const isGuest = selectedPM === 'Guest';
  const isDetails = false;
  const task = pm.tasks?.[currentIndex] || null;
  const response = pm.responses?.[String(currentIndex)] || {};
  const metricComplete = metricResponseComplete(response);
  const hasLegacyRanking = !isGuest && Boolean(response.submitted || response.rank || response.decision || response.reason);
  const done = submittedCount(pm);
  const total = pm.tasks?.length || 0;
  const progress = pct(done, total);
  const time = countdown(pm.deadline);
  const selectedProfile = profileFor(selectedPM);
  const taskEvidence = normaliseMetricEvidence(task?.metric_evidence || EMPTY_METRIC_EVIDENCE);
  const adminTargetPm = data.pms?.[adminPm] || makeDefaultData().pms[adminPm];
  const adminTaskIndex = Math.max(0, Math.min(Number(adminEvidenceTaskIndex) || 0, Math.max(0, (adminTargetPm.tasks?.length || 1) - 1)));
  const guestSourceData = data.pms?.[guestSourcePm] || makeDefaultData().pms[guestSourcePm];
  const guestSourceTasks = guestSourceData?.tasks || [];
  const guestFilteredTasks = guestSourceTasks.map((item, index) => ({ item, index })).filter(({ item }) => {
    const query = guestNgoSearch.trim().toLowerCase();
    if (!query) return true;
    return `${item.ngo_name || ''} ${item.background || ''} ${item.website || ''}`.toLowerCase().includes(query);
  });
  const selectedGuestSourceIndex = Math.max(0, Math.min(Number(guestTaskIndex) || 0, Math.max(0, guestSourceTasks.length - 1)));
  const selectedGuestSourceTask = guestSourceTasks[selectedGuestSourceIndex] || null;
  const guestTaskAlreadyCopied = Boolean((data.pms?.Guest?.tasks || []).some(item =>
    String(item.guest_reference_source_pm || item.transferred_from || '') === guestSourcePm &&
    Number(item.guest_reference_source_task_index ?? (Number(item.original_task_index || 0) - 1)) === selectedGuestSourceIndex
  ));

  useEffect(() => { const id = window.setInterval(() => setTick(value => value + 1), 1000); return () => window.clearInterval(id); }, []);
  useEffect(() => {
    const base = backendBase();
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('dfp-workstream-fallback') : '';
    if (saved) { try { setData(normaliseWorkstreamData(JSON.parse(saved))); } catch { /* ignore bad local cache */ } }
    if (!base) return;
    backendFetch(`${base}/workstream`, { cache: 'no-store' })
      .then(result => result.json())
      .then(json => { if (json?.ok && json?.data) setData(normaliseWorkstreamData(json.data)); })
      .catch(() => setMsg('Backend not reachable. Local mode only.'));
  }, []);
  useEffect(() => { try { window.localStorage.setItem('dfp-workstream-fallback', JSON.stringify(data)); } catch { /* ignore quota */ } }, [data]);
  useEffect(() => {
    const saved = pm.responses?.[String(currentIndex)] || {};
    const stored = Number(saved.rank || saved.decision || 3);
    setRank(Number.isFinite(stored) ? Math.min(5, Math.max(1, stored)) : 3);
    setReason(saved.reason || '');
    setMetricScores(normaliseMetricScores(saved.metric_scores));
    setExceptionOverride(normaliseExceptionOverride(saved.exception_override));
    setReranking(false);
    setDescription(saved.ngo_description || '');
    setContactNumber(saved.contact_number || saved.referral_poc || '');
    setReferralSource(saved.referral_source || '');
  }, [selectedPM, currentIndex, pm.responses]);
  useEffect(() => {
    if (!showAdmin) return;
    const target = data.pms?.[adminPm] || makeDefaultData().pms[adminPm];
    setAdminRules(data.review_rules || DEFAULT_RULES);
    setAdminReferenceUrl(data.scoring_reference_url || '');
    setAdminDeadline(target.deadline || '');
    setAdminDeadlineNote(target.deadline_note || DEFAULT_DEADLINE_NOTE);
    setAdminResponsibility(target.responsibility || '');
    setAdminEvidenceTaskIndex('0');
    setAdminTasks([]);
  }, [adminPm, showAdmin, data.pms, data.review_rules, data.scoring_reference_url]);
  useEffect(() => {
    if (!showAdmin) return;
    const selectedTask = adminTargetPm.tasks?.[adminTaskIndex];
    const evidence = normaliseMetricEvidence(selectedTask?.metric_evidence || EMPTY_METRIC_EVIDENCE);
    const draft = emptyAdminEvidence();
    for (const metric of METRIC_DEFINITIONS) {
      draft[metric.key] = {
        text: evidence[metric.key].text || '',
        linksText: evidenceLinksToText(evidence[metric.key].links),
        ceilingRank: evidence[metric.key].ceiling_rank ? String(evidence[metric.key].ceiling_rank) : '',
        ceilingReason: evidence[metric.key].ceiling_reason || '',
      };
    }
    setAdminEvidence(draft);
  }, [showAdmin, adminPm, adminTaskIndex, adminTargetPm.tasks]);

  const leaderboard = useMemo(() => LEADERBOARD_NAMES.map(name => ({ name, done: submittedCount(data.pms?.[name]), total: data.pms?.[name]?.tasks?.length || 0 })).sort((a, b) => b.done - a.done || a.name.localeCompare(b.name)), [data]);

  function taskLabel(_name = selectedPM) { return 'Shortlist'; }
  function openWorkspace(name: string) { const target = data.pms?.[name]; const idx = latestSubmittedIndex(target); setSelectedPM(name); setCurrentIndex(idx); setMode('task'); setMsg(idx > 0 || target?.responses?.[String(idx)]?.submitted ? `Opened last submitted NGO #${idx + 1}.` : 'Opened first assigned NGO.'); setLastBadge(''); setLastQuality(''); setLastPaceSeconds(null); setStreak(0); setScreen('workspace'); }
  function startAdmin(name = selectedPM) { const shortlistName = SHORTLIST_PM_NAMES.includes(name) ? name : 'Avika'; setAdminPm(name); setTransferFromPm(name); setDeletePm(shortlistName); setDeleteStart(name === selectedPM ? String(currentIndex + 1) : '1'); setDeleteEnd(name === selectedPM ? String(currentIndex + 1) : '1'); if (name === transferToPm) setTransferToPm(PM_NAMES.find(pmName => pmName !== name) || 'Milan'); setAdminPassword(''); setShowAdmin(true); }
  function openGuestGear() {
    const currentTask = isGuest ? task : null;
    const taskSourcePm = String(currentTask?.guest_reference_source_pm || currentTask?.transferred_from || '').trim();
    const fallbackPm = GUEST_SOURCE_PM_NAMES.find(name => (data.pms?.[name]?.tasks?.length || 0) > 0) || 'Avika';
    const nextPm = GUEST_SOURCE_PM_NAMES.includes(taskSourcePm) ? taskSourcePm : fallbackPm;
    const sourceIndex = nextPm === taskSourcePm
      ? Number(currentTask?.guest_reference_source_task_index ?? (Number(currentTask?.original_task_index || 1) - 1))
      : 0;
    setGuestSourcePm(nextPm);
    setGuestTaskIndex(String(Number.isFinite(sourceIndex) && sourceIndex >= 0 ? sourceIndex : 0));
    setGuestNgoSearch('');
    setGuestAdminPassword('');
    setMsg('');
    setGuestGearOpen(true);
  }

  async function copySelectedNgoToGuest() {
    const base = backendBase();
    if (!guestAdminPassword.trim()) { setMsg('Enter the admin password to duplicate this NGO.'); return; }
    if (!base) { setMsg('Backend URL missing. Guest duplication needs backend memory.'); return; }
    if (!selectedGuestSourceTask) { setMsg('Select an NGO first.'); return; }
    if (guestTaskAlreadyCopied) { setMsg('This NGO is already in the Guest shortlist.'); return; }
    setGuestCopying(true);
    setMsg(`Duplicating ${selectedGuestSourceTask.ngo_name} into Guest…`);
    try {
      const result = await backendFetch(`${base}/workstream/admin/transfer-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: guestAdminPassword,
          from_pm: guestSourcePm,
          to_pm: 'Guest',
          start_index: selectedGuestSourceIndex + 1,
          end_index: selectedGuestSourceIndex + 1,
          move_responses: false,
        }),
      });
      const json = await result.json();
      if (!json?.ok) { setMsg(json?.error || 'Guest duplication failed.'); return; }
      const nextData = normaliseWorkstreamData(json.data);
      const newIndex = Math.max(0, Number(json?.moved?.[0]?.to_index || nextData.pms?.Guest?.tasks?.length || 1) - 1);
      setData(nextData);
      setSelectedPM('Guest');
      setMode('task');
      setCurrentIndex(newIndex);
      setScreen('workspace');
      setGuestGearOpen(false);
      setMsg(`${selectedGuestSourceTask.ngo_name} duplicated into Guest. The PM assignment and official ranking remain unchanged.`);
    } catch (errorValue: any) {
      setMsg(errorValue?.message || 'Guest duplication failed.');
    } finally {
      setGuestCopying(false);
    }
  }
  function patchLocalResponse(patch: Partial<ResponseRow>) { setData(old => { const next = JSON.parse(JSON.stringify(old)); next.pms[selectedPM].responses[String(currentIndex)] = { ...(next.pms[selectedPM].responses[String(currentIndex)] || {}), ...patch }; return next; }); }
  function updateMetricScore(metricKey: MetricKey, nextScore: MetricScore) { setMetricScores(old => ({ ...old, [metricKey]: nextScore })); }
  function startRerank() { setReranking(true); window.setTimeout(() => metricSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 20); }
  function validationMessage() {
    if (isDetails) return '';
    for (const metric of METRIC_DEFINITIONS) {
      const row = metricScores[metric.key];
      const ceiling = Number(taskEvidence[metric.key]?.ceiling_rank || 0);
      if (!row?.rank) return `Select a rank for ${metric.title}.`;
      if (String(row.reason || '').trim().length < 100) return `${metric.title}: rationale must be at least 100 characters.`;
      if (ceiling && row.rank > ceiling) return `${metric.title}: score ${row.rank} is above the recommended ceiling of ${ceiling}. Keep the metric at or below the ceiling; use the single exception override below for the overall NGO judgement.`;
    }
    if (exceptionOverride.enabled && String(exceptionOverride.reason || '').trim().length < 100) return 'Exception override reason must be at least 100 characters.';
    return '';
  }
  function compactJoke(delta: number, words: number, remaining: number) { const lines = PM_LINES[selectedPM] || ['Saved. The spreadsheet lost one round.']; let line = lines[Math.floor(Math.random() * lines.length)]; if (words <= 2) line = 'Minimalist review; future people will still manage.'; if (words >= 30) line = 'Long review. Either deep judgement or caffeine possession.'; if (delta && delta < 35) line = line.replace('.', '') + ' — speedrun edition.'; if (delta >= 180) line = line.replace('.', '') + ' — thoughtful, or WhatsApp won for a bit.'; return `${line} ${remaining} left.`; }
  function reactionText(prevMs: number, newDone: number) { const txt = isDetails ? description : reason; const words = wordCount(txt); const delta = prevMs ? Math.max(1, Math.round((Date.now() - prevMs) / 1000)) : 0; const remaining = Math.max(0, total - newDone); const paceText = delta ? formatDuration(delta) : 'first submit'; return `${paceText} · ${words} words · ${qualityLabel(txt, isDetails)}. ${compactJoke(delta, words, remaining)}`; }
  function maybeShowMilestone(newDone: number) { const text = milestoneText(selectedPM, newDone, total); if (!text) return; const oldPct = pct(Math.max(0, newDone - 1), total); const newPct = pct(newDone, total); const thresholds = [10, 25, 50, 75, 100]; if (thresholds.some(threshold => oldPct < threshold && newPct >= threshold)) { setMilestoneCopy(text); setMilestoneOpen(true); burstConfetti(newPct >= 100 ? 150 : 80); } }

  async function submitDecision() {
    const error = validationMessage();
    if (error) { setMsg(error); if (!isDetails) startRerank(); return; }

    const prevMs = latestSubmitMs(pm);
    const nowIso = new Date().toISOString();
    const wasComplete = isDetails ? Boolean(response.submitted) : metricResponseComplete(response);
    const metricReasonText = [
      ...METRIC_DEFINITIONS.map(metric => metricScores[metric.key].reason),
      exceptionOverride.enabled ? exceptionOverride.reason : '',
    ].filter(Boolean).join(' ');

    const localResponse: ResponseRow = isDetails ? {
      ...response,
      decision: 'Details',
      rank_label: 'Details',
      ngo_description: description,
      contact_number: contactNumber,
      referral_source: referralSource,
      referral_poc: contactNumber,
      submitted: true,
      submitted_at: nowIso,
      global_saved: true,
      global_saved_at: nowIso,
    } : {
      ...response,
      metric_scores: metricScores,
      metric_submitted: true,
      metric_submitted_at: nowIso,
      metric_scoring_version: 'v1.2',
      exception_override: exceptionOverride,
    };

    const newDone = wasComplete ? done : done + 1;
    const delta = prevMs ? Math.max(1, Math.round((Date.now() - prevMs) / 1000)) : 0;
    setLastBadge(paceBadge(delta));
    setLastPaceSeconds(delta || null);
    setLastQuality(qualityLabel(isDetails ? description : metricReasonText, isDetails));
    setStreak(value => wasComplete ? value : value + 1);
    patchLocalResponse(localResponse);
    setReranking(false);
    setMsg(isDetails
      ? (wasComplete ? 'NGO details updated.' : reactionText(prevMs, newDone))
      : isGuest ? (wasComplete ? 'Assessment updated.' : 'Assessment saved.') : (wasComplete ? 'Assessment updated. The previous overall ranking remains unchanged.' : 'Assessment saved. The previous overall ranking remains unchanged.'));
    burstConfetti(newDone === 1 ? 130 : newDone === 5 ? 180 : newDone === total ? 170 : 55);
    if (!isGuest) maybeShowMilestone(newDone);

    const base = backendBase();
    if (base) {
      try {
        const endpoint = isDetails ? '/workstream/submit' : '/workstream/submit-metrics';
        const payload = isDetails ? {
          pm: selectedPM,
          task_index: currentIndex,
          decision: localResponse.decision,
          rank_label: localResponse.rank_label,
          ngo_description: description,
          contact_number: contactNumber,
          referral_source: referralSource,
          referral_poc: contactNumber,
        } : {
          pm: selectedPM,
          task_index: currentIndex,
          metric_scores: metricScores,
          metric_scoring_version: 'v1.2',
      exception_override: exceptionOverride,
        };
        const result = await backendFetch(`${base}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await result.json();
        if (json?.ok && json?.data) { setData(normaliseWorkstreamData(json.data)); if (isGuest) setGuestThanks({ reference: guestReference(json.guest_reference_review || task?.guest_reference_review), advance: !wasComplete && currentIndex < total - 1 }); }
        else setMsg(json?.error || 'Submit failed on backend. Kept locally.');
      } catch (errorValue: any) {
        setMsg(errorValue?.message || 'Submit failed on backend. Kept locally.');
      }
    }

    if (isGuest && !base) setGuestThanks({ reference: guestReference(task?.guest_reference_review), advance: !wasComplete && currentIndex < total - 1 });

    const autoReview = !isGuest && newDone <= 5 && !wasComplete;
    if (autoReview) {
      const reviewRow = {
        pm: selectedPM,
        task_index: currentIndex,
        decision: localResponse.decision,
        rank: localResponse.rank,
        reason: isDetails ? description : metricReasonText,
        metric_scores: localResponse.metric_scores,
        ngo_description: description,
        submitted: true,
        submitted_at: nowIso,
      };
      window.setTimeout(() => runReview('selected', true, [reviewRow]), 450);
    }
    if (!isGuest && !wasComplete) window.setTimeout(() => { if (currentIndex < total - 1) setCurrentIndex(index => Math.min(total - 1, index + 1)); }, 900);
  }

  async function deleteResponse() {
    const hasSavedWork = isDetails ? Boolean(response.submitted) : metricResponseComplete(response);
    if (!hasSavedWork) return;
    const actionLabel = isDetails ? 'Delete this response?' : 'Clear the three new metric scores and exception override? The previous overall ranking will remain untouched.';
    if (!window.confirm(actionLabel)) return;

    setData(old => {
      const next = JSON.parse(JSON.stringify(old));
      if (isDetails) {
        delete next.pms[selectedPM].responses[String(currentIndex)];
      } else {
        const row = next.pms[selectedPM].responses[String(currentIndex)] || {};
        delete row.metric_scores;
        delete row.metric_submitted;
        delete row.metric_submitted_at;
        delete row.metric_scoring_version;
        delete row.exception_override;
        next.pms[selectedPM].responses[String(currentIndex)] = row;
      }
      return next;
    });
    setMetricScores(structuredClone(DEFAULT_METRIC_SCORES));
    setExceptionOverride({ ...DEFAULT_EXCEPTION_OVERRIDE });
    setMsg(isDetails ? 'Response deleted.' : 'Three metric scores and exception override cleared. Previous overall ranking preserved.');
    setLastBadge('');
    setLastQuality('');

    const base = backendBase();
    if (base) {
      try {
        const endpoint = isDetails ? '/workstream/delete-response' : '/workstream/delete-metrics';
        const result = await backendFetch(`${base}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pm: selectedPM, task_index: currentIndex }),
        });
        const json = await result.json();
        if (json?.ok && json?.data) setData(normaliseWorkstreamData(json.data));
      } catch { /* local deletion remains */ }
    }
  }

  async function runReview(kind: 'selected' | 'so-far' | 'admin', mandatory = false, overrideRows?: any[]) { const existingRows = kind === 'selected' ? submittedRows(pm).filter(([index]) => Number(index) === currentIndex) : submittedRows(pm); const effectiveRows = overrideRows && overrideRows.length ? overrideRows : existingRows.map(([index, row]) => ({ task_index: Number(index), ...row, reason: responseText(row) })); if (kind !== 'admin' && effectiveRows.length === 0) { setMsg('Submit first, then response review will open.'); return; } setAiOpen(true); setAiHelpful(null); setAiFeedbackText(''); setAiLoading(true); setAiTitle(kind === 'selected' ? (mandatory ? 'Mandatory expression check' : 'Expression check') : kind === 'admin' ? 'Saved expression check' : 'Expression check so far'); const base = backendBase(); if (!base) { setAiReview(localReviewFromRows(effectiveRows)); setAiLoading(false); return; } try { const result = await backendFetch(`${base}/workstream/ai/review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: kind, pm: selectedPM, task_index: currentIndex, submitted_rows: overrideRows || undefined }) }); const json = await result.json(); if (json?.ok) { setAiReview(json.review || null); if (json.data) setData(normaliseWorkstreamData(json.data)); } else setAiReview({ headline: json?.error || 'Review failed.', quality_flags: ['No backend review returned.'], suggestions: ['Continue manually.'] }); } catch { setAiReview(localReviewFromRows(effectiveRows)); } finally { setAiLoading(false); } }
  function localReviewFromRows(rows: any[]): AiReview { const lengths = rows.map(row => wordCount(row.reason || row.ngo_description || '')); const avg = lengths.length ? Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length) : 0; const veryShort = lengths.filter(length => length <= 2).length; const headline = veryShort && avg < 8 ? 'Type a little more of what went through your head.' : avg >= 18 ? 'Good depth — your thought is captured.' : 'Usable — more raw detail would help.'; return { headline, quality_flags: [`${rows.length} response(s) checked`, `Average length: ${avg} words`], suggestions: ['No proper sentences needed.', 'Hinglish, fragments and messy notes are fine.', 'Write more instinct, not better English.'], pace_comment: `${rows.length} submitted for ${selectedPM}.`, encouragement: 'Expression only. Not checking the rank.', source: 'fallback' }; }

  function buildMetricEvidencePayload() {
    const evidence = structuredClone(EMPTY_METRIC_EVIDENCE);
    for (const metric of METRIC_DEFINITIONS) {
      evidence[metric.key] = {
        text: adminEvidence[metric.key].text.trim(),
        links: parseEvidenceLinks(adminEvidence[metric.key].linksText),
        ceiling_rank: Number(adminEvidence[metric.key].ceilingRank || 0),
        ceiling_reason: adminEvidence[metric.key].ceilingReason.trim(),
      };
    }
    return evidence;
  }

  async function applyAdmin() {
    const target = adminPm || selectedPM;
    const metricEvidence = buildMetricEvidencePayload();
    const payload = {
      password: adminPassword,
      review_rules: adminRules,
      scoring_reference_url: adminReferenceUrl,
      pm: target,
      deadline: adminDeadline,
      deadline_note: adminDeadlineNote,
      responsibility: adminResponsibility,
      task_type: 'shortlisting',
      tasks: adminTasks,
      evidence_task_index: adminTaskIndex,
      metric_evidence: metricEvidence,
    };
    const base = backendBase();
    if (!base) {
      setData(old => {
        const next = JSON.parse(JSON.stringify(old));
        next.review_rules = adminRules;
        next.scoring_reference_url = adminReferenceUrl;
        next.pms[target].deadline = adminDeadline;
        next.pms[target].deadline_note = adminDeadlineNote;
        next.pms[target].responsibility = adminResponsibility;
        if (adminTasks.length) next.pms[target].tasks = [...(next.pms[target].tasks || []), ...adminTasks];
        if (next.pms[target].tasks?.[adminTaskIndex]) next.pms[target].tasks[adminTaskIndex].metric_evidence = metricEvidence;
        return next;
      });
      setShowAdmin(false);
      setMsg('Admin changes and metric evidence applied locally.');
      return;
    }
    setMsg('Publishing PM view config and evidence…');
    try {
      const result = await backendFetch(`${base}/workstream/admin/update`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await result.json();
      if (json?.ok) { setData(normaliseWorkstreamData(json.data)); setShowAdmin(false); setMsg(adminTasks.length ? `${adminTasks.length} task(s) added; evidence updated.` : 'PM view config and metric evidence updated.'); }
      else setMsg(json?.error || 'Admin update failed.');
    } catch (errorValue: any) {
      setMsg(errorValue?.message || 'Admin update failed.');
    }
  }

  async function transferShortlistItems() { const base = backendBase(); const start = Number(transferStart); const end = Number(transferEnd || transferStart); if (!adminPassword.trim()) { setMsg('Enter admin password first.'); return; } if (!base) { setMsg('Backend URL missing. Transfer needs backend memory.'); return; } if (!Number.isFinite(start) || start < 1 || !Number.isFinite(end) || end < 1) { setMsg('Enter a valid 1-based shortlist range.'); return; } if (transferFromPm === transferToPm) { setMsg('Pick two different PMs.'); return; } const lo = Math.min(start, end); const hi = Math.max(start, end); const count = hi - lo + 1; const guestCopy = transferToPm === 'Guest'; const verb = guestCopy ? 'Copy' : 'Transfer'; if (!window.confirm(`${verb} shortlist item${count > 1 ? 's' : ''} ${lo}${hi !== lo ? `–${hi}` : ''} from ${transferFromPm} to ${transferToPm}?${guestCopy ? ' The source PM assignment and official ranking will stay unchanged.' : ''}`)) return; setMsg(guestCopy ? 'Creating blind Guest assignment…' : 'Transferring shortlist assignment…'); try { const result = await backendFetch(`${base}/workstream/admin/transfer-tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: adminPassword, from_pm: transferFromPm, to_pm: transferToPm, start_index: lo, end_index: hi, move_responses: guestCopy ? false : transferMoveResponses }) }); const json = await result.json(); if (json?.ok) { setData(normaliseWorkstreamData(json.data)); setMsg(`${json.copied ? 'Copied' : 'Transferred'} ${json.transferred || count} item(s) from ${transferFromPm} to ${transferToPm}.`); } else setMsg(json?.error || 'Transfer failed.'); } catch (errorValue: any) { setMsg(errorValue?.message || 'Transfer failed.'); } }

  async function deleteShortlistItems() {
    const base = backendBase();
    const start = Number(deleteStart);
    const end = Number(deleteEnd || deleteStart);
    if (!adminPassword.trim()) { setMsg('Enter admin password first.'); return; }
    if (!base) { setMsg('Backend URL missing. Permanent deletion needs backend memory.'); return; }
    if (!Number.isFinite(start) || start < 1 || !Number.isFinite(end) || end < 1) { setMsg('Enter a valid 1-based delete range.'); return; }
    const target = data.pms?.[deletePm];
    const taskCount = target?.tasks?.length || 0;
    const lo = Math.min(start, end);
    const hi = Math.max(start, end);
    if (hi > taskCount) { setMsg(`${deletePm} has ${taskCount} shortlisted NGO${taskCount === 1 ? '' : 's'}.`); return; }
    const names = (target?.tasks || []).slice(lo - 1, hi).map(item => item.ngo_name).filter(Boolean);
    const count = hi - lo + 1;
    const preview = names.slice(0, 4).join(', ');
    const extra = names.length > 4 ? ` and ${names.length - 4} more` : '';
    if (!window.confirm(`Permanently delete shortlist item${count > 1 ? 's' : ''} ${lo}${hi !== lo ? `–${hi}` : ''} from ${deletePm}?${preview ? `\n\n${preview}${extra}` : ''}\n\nAny saved three-metric assessments for these NGOs will also be deleted.`)) return;
    setMsg('Deleting shortlist assignment…');
    try {
      const result = await backendFetch(`${base}/workstream/admin/delete-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword, pm: deletePm, start_index: lo, end_index: hi }),
      });
      const json = await result.json();
      if (json?.ok) {
        setData(normaliseWorkstreamData(json.data));
        const remaining = json.data?.pms?.[deletePm]?.tasks?.length || 0;
        if (selectedPM === deletePm) setCurrentIndex(index => Math.max(0, Math.min(index, remaining - 1)));
        setDeleteStart('1');
        setDeleteEnd('1');
        setMsg(`Deleted ${json.deleted || count} shortlisted NGO${(json.deleted || count) === 1 ? '' : 's'} from ${deletePm}.`);
      } else setMsg(json?.error || 'Delete failed.');
    } catch (errorValue: any) {
      setMsg(errorValue?.message || 'Delete failed.');
    }
  }
  function nextTask() { setCurrentIndex(index => Math.min((pm.tasks?.length || 1) - 1, index + 1)); }
  function prevTask() { setCurrentIndex(index => Math.max(0, index - 1)); }
  function handleTaskFile(file?: File | null) { if (!file) return; const reader = new FileReader(); reader.onload = () => { const tasks = parseTasks(String(reader.result || '')); setAdminTasks(tasks); setMsg(`${tasks.length} tasks ready to add.`); }; reader.readAsText(file); }
  function updateAdminEvidence(metricKey: MetricKey, patch: Partial<{ text: string; linksText: string; ceilingRank: string; ceilingReason: string }>) { setAdminEvidence(old => ({ ...old, [metricKey]: { ...old[metricKey], ...patch } })); }

  const rankCounts = countsByRank(pm);

  return (
    <section className="pmu-workstream pm-view-workstream">
      {screen === 'board' && (
        <>
          <section className="pmu-board-layout">
            <div className="pmu-board-main">
              <section className="pmu-board-head source-row"><div><h2>PM view</h2><p>{stateName} responsibilities and new-metric shortlisting.</p></div><a className="ghost-btn" href={exportHref()}>Export CSV</a></section>
              <section className="pmu-card-grid" aria-label="PM cards">
                {PM_NAMES.map(name => {
                  const profile = profileFor(name);
                  const guestCard = name === 'Guest';
                  return (
                    <article className={`pm-score-card pmu-card ${guestCard ? 'pmu-guest-card' : ''}`} key={name}>
                      <div className="pmu-profile-lockup">
                        {guestCard ? (
                          <span className="pmu-guest-logo">
                            <Image src="/feeding-india-logo.svg" alt="Feeding India by Eternal Foundation" width={200} height={47} priority />
                          </span>
                        ) : profile.img ? (
                          <span className="pmu-profile-photo">
                            <Image src={profile.img} alt={`${name} profile`} width={96} height={96} />
                          </span>
                        ) : (
                          <span className="pmu-profile-photo pmu-profile-placeholder" aria-hidden="true">
                            {name.slice(0, 1)}
                          </span>
                        )}
                        <h3>{name}</h3>
                      </div>
                      <button className="pmu-primary-action glow-action" onClick={() => { openWorkspace(name); setMode('task'); }}>Shortlist</button>
                      {!guestCard && <button onClick={() => setAboutPM(profile)}><span>About PM</span><strong>→</strong></button>}
                    </article>
                  );
                })}
              </section>
            </div>
            <aside className="pm-progress-panel" aria-label="PM progress">
              <section className="pm-progress-leaderboard">
                <div className="pm-progress-leaderboard-head"><h3>PM progress</h3></div>
                <div className="pm-progress-leaderboard-list">
                  {leaderboard.map((row, index) => (
                    <button type="button" key={row.name} onClick={() => { openWorkspace(row.name); setMode('task'); }}>
                      <span className="pm-progress-rank">{index + 1}</span>
                      <strong>{row.name}</strong>
                      <b>{row.done}</b>
                      <small>of {row.total}</small>
                    </button>
                  ))}
                </div>
              </section>
            </aside>
          </section>
          <button className="config-gear workstream-gear" onClick={() => startAdmin(selectedPM)}>⚙</button>
        </>
      )}

      {screen === 'workspace' && (
        <section className="pmu-workspace-wrap">
          <button className="quiet-btn pmu-back" onClick={() => setScreen('board')}>← PM view</button>
          <div className="workstream-grid pmu-workspace-grid">
            <div className="workstream-main-card pmu-main-card">
              <div className="workstream-head">
                <div className="pm-workspace-name">
                  {isGuest ? <span className="pm-guest-workspace-logo"><Image src="/feeding-india-logo.svg" alt="Feeding India by Eternal Foundation" width={200} height={47} priority /></span> : selectedProfile.img ? <span className="pm-orb pm-photo"><Image src={selectedProfile.img} alt={selectedPM} width={54} height={54} /></span> : <span className="pm-orb">{PM_ICONS[selectedPM] || '◆'}</span>}
                  <div><span className="workstream-kicker">{isGuest ? 'Guest review' : 'PM'}</span><h2>{selectedPM}</h2></div>
                </div>
                {isGuest ? <button type="button" className="guest-choose-ngo-btn" onClick={openGuestGear}><span>Guest gearbox</span><b>Choose or duplicate NGO</b></button> : <div className="workstream-deadline fun-deadline"><span>⏳ Time left</span><strong>{time.hours}</strong><em>{time.rest}</em></div>}
              </div>
              {!isGuest && <div className="deadline-note"><b>Why this deadline matters:</b> {pm.deadline_note || DEFAULT_DEADLINE_NOTE}</div>}
              {!isGuest && <div className="progress-toggle workstream-tabs">
                <button className={mode === 'responsibility' ? 'active' : ''} onClick={() => setMode('responsibility')}>Responsibility</button>
                <button className={mode === 'task' ? 'active' : ''} onClick={() => setMode('task')}>{taskLabel()}</button>
              </div>}
              {!isGuest && mode === 'responsibility' && <div className="workstream-task-card"><h3>Responsibility</h3><p>{pm.responsibility}</p></div>}
              {(isGuest || mode === 'task') && (
                <>
                  {!isGuest && <div className="game-strip"><span>🔥 Streak {streak}</span><span>{lastQuality || 'Quality —'}</span><span>{lastBadge ? `${lastBadge} · ${formatDuration(lastPaceSeconds)}` : 'Pace —'}</span><span>{reviewerMode(pm)}</span></div>}
                  {task ? (
                    <div className="workstream-task-card pm-ranking-task-card">
                      <div className="task-nav-row"><button className="quiet-btn" onClick={prevTask} disabled={currentIndex === 0}>← Previous</button><span>NGO {currentIndex + 1} of {total}</span><button className="quiet-btn" onClick={nextTask} disabled={currentIndex >= total - 1}>Next →</button></div>
                      <h3>{task.ngo_name}</h3>
                      {task.website && <a className="workstream-link" href={safeUrl(task.website)} target="_blank" rel="noreferrer">{task.website}</a>}
                      <TaskContext value={task.background} />

                      {!isDetails ? (
                        <>
                          {!isGuest && <section className="legacy-ranking-section legacy-ranking-locked" aria-label="Previous overall ranking">
                            <div className="legacy-ranking-label">
                              <div><span>Previous overall ranking</span><small>Read-only · preserved exactly as submitted earlier</small></div>
                              <span className="legacy-lock-chip">Locked</span>
                            </div>
                            {hasLegacyRanking ? (
                              <div className="legacy-ranking-readonly-grid">
                                <div className="legacy-rank-readonly">
                                  <span>Overall score</span>
                                  <strong>{rank}</strong>
                                  <b>{RANKS[rank].short}</b>
                                </div>
                                <div className="legacy-reason-readonly">
                                  <span>Previous reason</span>
                                  <p>{reason || 'No previous reason was recorded.'}</p>
                                </div>
                              </div>
                            ) : (
                              <div className="legacy-ranking-missing">No previous overall ranking was found for this NGO. The new three-metric assessment can still be completed.</div>
                            )}
                          </section>}

                          <section className={`metric-ranking-section ${isGuest ? 'guest-metric-ranking-section' : ''}`} ref={metricSectionRef}>
                            <div className="metric-ranking-intro metric-ranking-intro-v117">
                              <div>
                                <span className="workstream-kicker">{isGuest ? 'Your assessment' : 'New assessment'}</span>
                                <h3>{isGuest ? 'Rank this NGO on three dimensions' : 'Score the NGO on three separate dimensions'}</h3>
                                <p>{isGuest ? 'Use the NGO details and evidence below. Choose a 1–5 score and explain each decision in at least 100 characters. The DFP program manager’s ranking stays hidden until you submit.' : 'Open each evidence pack, use the 1–5 slider, and write a rationale of at least 100 characters. For rare exception cases, one separate overall override is available below the three metrics. The old overall score above cannot be changed.'}</p>
                              </div>
                              <div className="metric-intro-actions">
                                <button type="button" className="metric-reference-library-btn" onClick={() => setReferenceLibraryOpen(true)}>Reference examples</button>
                                <button type="button" className="metric-tutorial-btn" onClick={() => setTutorialOpen(true)}>Scoring tutorial</button>
                                {metricComplete && <button type="button" className="metric-rerank-btn" onClick={startRerank}>↻ Edit assessment</button>}
                              </div>
                            </div>
                            <div className="metric-method-strip" aria-label="Scoring steps">
                              <span className="complete"><b>✓</b><em>Open evidence</em></span><i aria-hidden="true"/><span className="complete"><b>✓</b><em>Apply the ceiling</em></span><i aria-hidden="true"/><span className="active"><b>3</b><em>Score and explain</em></span>
                            </div>
                            {reranking && <div className="rerank-notice">Editing is open. Change any of the three scores or rationales, then save again.</div>}
                            <div className="metric-score-list">
                              {METRIC_DEFINITIONS.map(metric => (
                                <MetricScoringCard
                                  key={metric.key}
                                  metricKey={metric.key}
                                  score={metricScores[metric.key]}
                                  evidence={taskEvidence[metric.key]}
                                 
                                  onChange={next => updateMetricScore(metric.key, next)}
                                  onOpenReferences={() => setReferenceMetric(metric.key)}
                                />
                              ))}
                            </div>
                            <section className={`metric-exception-override ${exceptionOverride.enabled ? 'active' : ''}`}>
                              <label className="metric-exception-toggle">
                                <input
                                  type="checkbox"
                                  checked={exceptionOverride.enabled}
                                 
                                  onChange={event => setExceptionOverride(current => ({
                                    ...current,
                                    enabled: event.target.checked,
                                    reason: event.target.checked ? current.reason : '',
                                  }))}
                                />
                                <span>
                                  <b>Exception override</b>
                                  <small>Use only when the three metric scores do not capture your overall judgement of this NGO.</small>
                                </span>
                              </label>

                              {exceptionOverride.enabled && (
                                <div className="metric-exception-content">
                                  <div className="metric-rank-panel metric-exception-rank metric-choice-panel">
                                    <div className="metric-rank-value"><strong>{exceptionOverride.rank}</strong><span>Overall exception rank</span></div>
                                    <div className="metric-score-choices metric-exception-choices" role="radiogroup" aria-label="Exception override overall rank">
                                      {[1, 2, 3, 4, 5].map(value => (
                                        <button
                                          key={value}
                                          type="button"
                                          className={value === exceptionOverride.rank ? 'active' : ''}
                                          role="radio"
                                          aria-checked={value === exceptionOverride.rank}
                                          onClick={() => setExceptionOverride(current => ({ ...current, rank: value }))}
                                        >
                                          <b>{value}</b>
                                          <span>{['', 'Minimal', 'Limited', 'Meaningful', 'Strong', 'Benchmark-level'][value]}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <label className="metric-reason-field metric-exception-reason">
                                    <span>Why is this an exception? <b>Required</b></span>
                                    <textarea
                                      value={exceptionOverride.reason}
                                     
                                      minLength={100}
                                      onChange={event => setExceptionOverride(current => ({ ...current, reason: event.target.value }))}
                                      placeholder="Explain what the three metric scores fail to capture and why the NGO should receive this overall exception rank."
                                    />
                                    <small className={exceptionOverride.reason.trim().length >= 100 ? 'complete' : ''}>{exceptionOverride.reason.length}/100 characters minimum{exceptionOverride.reason.trim().length >= 100 ? ' · complete' : ''}</small>
                                  </label>
                                </div>
                              )}
                            </section>
                          </section>
                        </>
                      ) : (
                        <>
                          <input className="workstream-input" value={task.ngo_name} readOnly placeholder="NGO name" />
                          <textarea className="workstream-textarea" value={description} onChange={event => setDescription(event.target.value)} placeholder="Details of NGO" />
                          <input className="workstream-input" value={contactNumber} onChange={event => setContactNumber(event.target.value)} placeholder="POC contact number" />
                          <input className="workstream-input" value={referralSource} onChange={event => setReferralSource(event.target.value)} placeholder="Referral came from which NGO?" />
                          <div className="word-helper">No minimum length. Just capture what is available.</div>
                        </>
                      )}

                      <div className="workstream-actions">
                        <button className="primary-red glow-action" onClick={submitDecision}>{metricComplete ? 'Save assessment' : 'Submit assessment'}</button>
                        {metricComplete && <button className="ghost-btn" type="button" onClick={startRerank}>Edit assessment</button>}
                        {isGuest && metricComplete && <button className="ghost-btn" type="button" onClick={() => setGuestThanks({ reference: guestReference(task?.guest_reference_review), advance: false })}>View DFP PM ranking</button>}
                        {!isGuest && <button className="ghost-btn" onClick={() => runReview('selected')} disabled={!metricComplete}>Response review</button>}
                        {!isGuest && <button className="ghost-btn" onClick={deleteResponse} disabled={!metricComplete}>Clear assessment</button>}
                      </div>
                      <div className="live-reaction"><b>Three-metric assessment</b><span>{msg || (metricComplete ? (isGuest ? `Saved at ${niceTime(response.metric_submitted_at)}.` : `Saved at ${niceTime(response.metric_submitted_at)}. Previous overall ranking remains read-only.`) : 'Complete all three scores and rationales to save. The exception override is optional.')}</span></div>
                    </div>
                  ) : isGuest ? <div className="workstream-task-card guest-empty-workspace"><span className="workstream-kicker">Guest shortlist</span><h3>Choose an NGO to review</h3><p>Open the Guest gearbox, select any NGO from a Program Manager shortlist, and duplicate it here. The original PM assignment and official ranking remain untouched.</p><button type="button" className="primary-red glow-action" onClick={openGuestGear}>Choose an NGO</button></div> : <div className="workstream-task-card"><h3>No task added</h3><p>Add tasks from the PM view gear.</p></div>}
                  {!isGuest && progress >= 100 && <EndSummary pm={pm} name={selectedPM} />}
                  {!isGuest && <div className="workstream-footer-actions"><button className="ghost-btn" onClick={() => runReview('so-far')}>Review responses</button><a className="ghost-btn" href={exportHref()}>Export CSV</a></div>}
                </>
              )}
            </div>
            {!isGuest && <aside className="workstream-side pmu-compact-side">
              <div className="mini-panel pm-workspace-pm-status">
                <h3>{selectedPM}{selectedPM.endsWith('s') ? '’' : '’s'} progress</h3>
                <div className="pm-progress-summary"><span>{progress}% complete</span><b>{done} of {total}</b></div>
                <div className="pm-progress-track" aria-label={`${progress}% complete`}><i style={{ width: `${progress}%` }} /></div>
                <div className="mini-row"><span>Total assigned</span><b>{total}</b></div>
                <div className="mini-row"><span>Completed</span><b>{done}</b></div>
                <div className="mini-row"><span>Left</span><b>{Math.max(0, total - done)}</b></div>
              </div>
            </aside>}
          </div>
          {isGuest ? <button className="config-gear workstream-gear guest-workstream-gear" aria-label="Open Guest gearbox" onClick={openGuestGear}>⚙</button> : <button className="config-gear workstream-gear" onClick={() => startAdmin(selectedPM)}>⚙</button>}
        </section>
      )}

      {guestThanks && (
        <div className="modal-scrim guest-thanks-scrim" onClick={() => { const advance = guestThanks.advance; setGuestThanks(null); if (advance) setCurrentIndex(index => Math.min(total - 1, index + 1)); }}>
          <section className="guest-thanks-modal" onClick={event => event.stopPropagation()}>
            <div className="guest-thanks-brand"><Image src="/feeding-india-logo.svg" alt="Feeding India by Eternal Foundation" width={200} height={47} /></div>
            <span className="workstream-kicker">Assessment received</span>
            <h2>Thank you</h2>
            <p>Your ranking has been saved. Here is what the DFP program manager submitted for the same NGO.</p>
            {guestThanks.reference ? (
              <section className="guest-pm-reveal">
                <div className="guest-pm-reveal-head"><span>DFP program manager</span><b>{guestThanks.reference.reviewer || task?.transferred_from || 'Program Manager'}</b></div>
                {guestThanks.reference.metric_scores ? (
                  <div className="guest-pm-score-grid">
                    {METRIC_DEFINITIONS.map(metric => {
                      const item = normaliseMetricScores(guestThanks.reference?.metric_scores)[metric.key];
                      return <div key={metric.key}><span>{metric.title}</span><strong>{item.rank}</strong><small>out of 5</small></div>;
                    })}
                  </div>
                ) : (
                  <div className="guest-pm-legacy-score"><span>Overall ranking</span><strong>{Number(guestThanks.reference.rank || guestThanks.reference.decision || 0)}</strong><b>{guestThanks.reference.rank_label || RANKS[Number(guestThanks.reference.rank || guestThanks.reference.decision || 3)]?.short || ''}</b></div>
                )}
              </section>
            ) : <div className="guest-pm-reveal-empty">The DFP program manager’s ranking is not available yet.</div>}
            <button className="primary-red glow-action" onClick={() => { const advance = guestThanks.advance; setGuestThanks(null); if (advance) setCurrentIndex(index => Math.min(total - 1, index + 1)); }}>{guestThanks.advance ? 'Continue to next NGO' : 'Close'}</button>
          </section>
        </div>
      )}

      {referenceMetric && <MetricReferenceModal activeMetric={referenceMetric} documentUrl={data.scoring_reference_url} onClose={() => setReferenceMetric(null)} />}
      {referenceLibraryOpen && <MetricReferenceLibraryModal onClose={() => setReferenceLibraryOpen(false)} />}
      {tutorialOpen && <ScoringTutorial onClose={() => setTutorialOpen(false)} />}
      {milestoneOpen && <div className="modal-scrim" onClick={() => setMilestoneOpen(false)}><section className="milestone-modal" onClick={event => event.stopPropagation()}><button className="modal-x" onClick={() => setMilestoneOpen(false)}>×</button><span className="workstream-kicker">Milestone</span><h2>{milestoneCopy}</h2><p>{progress >= 100 ? 'Done. You may now pretend this was easy.' : 'Keep going. Useful judgement beats neat English.'}</p><button className="primary-red" onClick={() => setMilestoneOpen(false)}>OK</button></section></div>}
      {aboutPM && <div className="modal-scrim" onClick={() => setAboutPM(null)}><section className="pm-about-modal" onClick={event => event.stopPropagation()}><button className="modal-x" onClick={() => setAboutPM(null)}>×</button><div className="pm-about-head">{aboutPM.img ? <Image src={aboutPM.img} alt={aboutPM.name} width={104} height={104} /> : null}<div><span>{aboutPM.tagline}</span><h2>{aboutPM.name}</h2><p>{aboutPM.role}</p></div></div><p className="pm-about-copy">{aboutPM.about}</p></section></div>}
      {aiOpen && <div className="modal-scrim" onClick={() => setAiOpen(false)}><section className="ai-review-modal" onClick={event => event.stopPropagation()}><button className="modal-x" onClick={() => setAiOpen(false)}>×</button><span className="workstream-kicker">Response review</span><h2>{aiTitle}</h2>{aiLoading ? <p>Reviewing…</p> : <AiReviewBlock review={aiReview} />}<div className="ai-feedback"><span>Useful?</span><button className={aiHelpful === 'yes' ? 'active' : ''} onClick={() => setAiHelpful('yes')}>Yes</button><button className={aiHelpful === 'no' ? 'active' : ''} onClick={() => setAiHelpful('no')}>No</button></div>{aiHelpful && <textarea className="workstream-textarea ai-feedback-box" value={aiFeedbackText} onChange={event => setAiFeedbackText(event.target.value)} placeholder={aiHelpful === 'yes' ? 'What worked?' : 'What should change?'} />}<div className="workstream-actions"><button className="primary-red" onClick={() => setAiOpen(false)}>OK</button></div><p className="ai-cost-note">First five are automatic. Expression only: length, clarity, thought captured. Hinglish/fragments/no punctuation are fine.</p></section></div>}

      {guestGearOpen && (
        <>
          <div className="drawer-scrim" onClick={() => setGuestGearOpen(false)} />
          <aside className="config-drawer guest-config-drawer" aria-label="Guest gearbox">
            <div className="drawer-head"><div><span className="workstream-kicker">Guest setup</span><h2>Duplicate an NGO</h2></div><button onClick={() => setGuestGearOpen(false)}>×</button></div>
            <div className="drawer-body">
              <div className="guest-gear-explainer">
                <Image src="/feeding-india-logo.svg" alt="Feeding India by Eternal Foundation" width={180} height={42} />
                <p>Select any NGO from a Program Manager shortlist. It is copied into Guest as a blind second review; the source assignment, PM progress and official ranking are not changed.</p>
              </div>
              <label className="admin-field"><span>Program Manager shortlist</span><select value={guestSourcePm} onChange={event => { setGuestSourcePm(event.target.value); setGuestTaskIndex('0'); setGuestNgoSearch(''); }}>{GUEST_SOURCE_PM_NAMES.map(name => <option key={name} value={name}>{name} · {data.pms?.[name]?.tasks?.length || 0} NGOs</option>)}</select></label>
              <label className="admin-field"><span>Find NGO</span><input value={guestNgoSearch} onChange={event => setGuestNgoSearch(event.target.value)} placeholder="Search by NGO name, website or context" /></label>
              <div className="guest-ngo-picker" role="listbox" aria-label="Choose NGO to duplicate">
                {guestFilteredTasks.length ? guestFilteredTasks.map(({ item, index }) => {
                  const alreadyCopied = Boolean((data.pms?.Guest?.tasks || []).some(guestItem =>
                    String(guestItem.guest_reference_source_pm || guestItem.transferred_from || '') === guestSourcePm &&
                    Number(guestItem.guest_reference_source_task_index ?? (Number(guestItem.original_task_index || 0) - 1)) === index
                  ));
                  const active = index === selectedGuestSourceIndex;
                  return <button type="button" role="option" aria-selected={active} className={`${active ? 'active' : ''} ${alreadyCopied ? 'copied' : ''}`} key={`${guestSourcePm}-${index}-${item.ngo_name}`} onClick={() => setGuestTaskIndex(String(index))}><span>#{index + 1}</span><div><b>{item.ngo_name || 'Untitled NGO'}</b><small>{item.website || 'No website added'}</small></div>{alreadyCopied && <em>Already in Guest</em>}</button>;
                }) : <div className="guest-ngo-picker-empty">No NGOs match this search.</div>}
              </div>
              {selectedGuestSourceTask && <section className="guest-copy-preview"><span>Selected NGO</span><h3>{selectedGuestSourceTask.ngo_name}</h3>{selectedGuestSourceTask.website && <small>{selectedGuestSourceTask.website}</small>}<p>The Guest reviewer will see the NGO details, evidence, reference examples and scoring tutorial. The source PM ranking stays hidden until Guest submits.</p></section>}
              <FieldLike label="Admin password" value={guestAdminPassword} onChange={setGuestAdminPassword} type="password" />
              <p className="drawer-msg">{msg}</p>
            </div>
            <div className="drawer-foot"><button className="ghost-btn" onClick={() => setGuestGearOpen(false)}>Cancel</button><button className="primary-red" disabled={!selectedGuestSourceTask || guestTaskAlreadyCopied || guestCopying} onClick={copySelectedNgoToGuest}>{guestCopying ? 'Duplicating…' : guestTaskAlreadyCopied ? 'Already duplicated' : 'Duplicate into Guest'}</button></div>
          </aside>
        </>
      )}

      {showAdmin && (
        <>
          <div className="drawer-scrim" onClick={() => setShowAdmin(false)} />
          <aside className="config-drawer metric-config-drawer">
            <div className="drawer-head"><h2>PM view gear</h2><button onClick={() => setShowAdmin(false)}>×</button></div>
            <div className="drawer-body">
              <label className="admin-field"><span>PM</span><select value={adminPm} onChange={event => setAdminPm(event.target.value)}>{PM_NAMES.map(name => <option key={name} value={name}>{name}</option>)}</select></label>
              <label className="admin-field"><span>Expression review rules</span><textarea value={adminRules} onChange={event => setAdminRules(event.target.value)} /></label>
              <FieldLike label="Scoring reference document URL" value={adminReferenceUrl} onChange={setAdminReferenceUrl} type="url" />
              <small>Optional. The embedded reference guide always opens; add a URL here to show “Open full reference document”.</small>
              <FieldLike label="Active deadline" value={adminDeadline} onChange={setAdminDeadline} type="datetime-local" />
              <label className="admin-field"><span>Why deadline matters</span><textarea value={adminDeadlineNote} onChange={event => setAdminDeadlineNote(event.target.value)} /></label>
              <label className="admin-field"><span>Responsibility</span><textarea value={adminResponsibility} onChange={event => setAdminResponsibility(event.target.value)} /></label>

              {(
                <div className="admin-subsection metric-evidence-admin">
                  <b>Evidence shown beside the three metrics</b>
                  <p>Select an assigned NGO, then add evidence and source links. This is shown only on that NGO’s PM scoring card.</p>
                  <label className="admin-field"><span>Assigned NGO</span><select value={String(adminTaskIndex)} onChange={event => setAdminEvidenceTaskIndex(event.target.value)}>{(adminTargetPm.tasks || []).map((assignedTask, index) => <option key={`${assignedTask.ngo_name}-${index}`} value={index}>#{index + 1} · {assignedTask.ngo_name}</option>)}</select></label>
                  {METRIC_DEFINITIONS.map(metric => (
                    <section className="admin-metric-evidence-block" key={metric.key}>
                      <div><span className="metric-letter">{metric.letter}</span><b>{metric.title}</b></div>
                      <label className="admin-field"><span>Evidence package — one factual sentence per line</span><textarea value={adminEvidence[metric.key].text} onChange={event => updateAdminEvidence(metric.key, { text: event.target.value })} placeholder={'Sentence 1 from the website.\nSentence 2 from the annual report.\nSentence 3 with a named outcome.\nSentence 4 with the evidence gap.'} /></label>
                      <label className="admin-field"><span>Links — one per line</span><textarea value={adminEvidence[metric.key].linksText} onChange={event => updateAdminEvidence(metric.key, { linksText: event.target.value })} placeholder={'Annual report · page 15 | https://example.org/report#page=15\nProgramme page | https://example.org/programme'} /></label>
                      <div className="admin-mini-grid metric-ceiling-admin-grid">
                        <label className="admin-field"><span>Recommended ceiling</span><select value={adminEvidence[metric.key].ceilingRank} onChange={event => updateAdminEvidence(metric.key, { ceilingRank: event.target.value })}><option value="">No ceiling added</option>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>Maximum {value}</option>)}</select></label>
                        <label className="admin-field"><span>Why this ceiling applies</span><textarea value={adminEvidence[metric.key].ceilingReason} onChange={event => updateAdminEvidence(metric.key, { ceilingReason: event.target.value })} placeholder="Example: no repeated or cohort-level alumni evidence, so this cannot exceed 4." /></label>
                      </div>
                    </section>
                  ))}
                </div>
              )}

              <label className="admin-field"><span>Upload task CSV</span><input type="file" accept=".csv,.txt" onChange={event => handleTaskFile(event.target.files?.[0])} /></label>
              <div className="admin-inline"><button className="ghost-btn" type="button" onClick={csvSample}>Download sample CSV</button><span>{adminTasks.length ? `${adminTasks.length} task(s) ready to add` : 'CSV adds tasks only'}</span></div>

              <div className="admin-subsection"><b>Transfer shortlist assignment</b><p>{transferToPm === 'Guest' ? 'Create a blind Guest copy. The source PM assignment, progress and official ranking remain unchanged.' : 'Move one item or a 1-based range from one PM to another. Example: 15 to 27.'}</p><div className="admin-mini-grid"><label className="admin-field"><span>From PM</span><select value={transferFromPm} onChange={event => setTransferFromPm(event.target.value)}>{PM_NAMES.map(name => <option key={name} value={name}>{name}</option>)}</select></label><label className="admin-field"><span>To PM</span><select value={transferToPm} onChange={event => setTransferToPm(event.target.value)}>{PM_NAMES.map(name => <option key={name} value={name}>{name}</option>)}</select></label><FieldLike label="Start #" value={transferStart} onChange={setTransferStart} /><FieldLike label="End #" value={transferEnd} onChange={setTransferEnd} /></div>{transferToPm !== 'Guest' && <label className="admin-check"><input type="checkbox" checked={transferMoveResponses} onChange={event => setTransferMoveResponses(event.target.checked)} /> Move submitted response also, if any</label>}<button className="ghost-btn" type="button" onClick={transferShortlistItems}>{transferToPm === 'Guest' ? 'Copy to Guest' : 'Transfer range'}</button></div>
              <div className="admin-subsection admin-delete-shortlist"><b>Delete shortlisted NGO(s)</b><p>Permanently remove one assigned NGO or a 1-based range. Saved metric assessments inside the selected range are deleted too.</p><div className="admin-mini-grid"><label className="admin-field"><span>PM shortlist</span><select value={deletePm} onChange={event => { setDeletePm(event.target.value); setDeleteStart('1'); setDeleteEnd('1'); }}>{SHORTLIST_PM_NAMES.map(name => <option key={name} value={name}>{name} · {data.pms?.[name]?.tasks?.length || 0} NGOs</option>)}</select></label><div/><FieldLike label="Start #" value={deleteStart} onChange={setDeleteStart} /><FieldLike label="End #" value={deleteEnd} onChange={setDeleteEnd} /></div><button className="danger-btn" type="button" onClick={deleteShortlistItems}>Delete selected range</button></div>
              <FieldLike label="Admin password" value={adminPassword} onChange={setAdminPassword} />
              <p className="drawer-msg">{msg}</p>
            </div>
            <div className="drawer-foot"><button className="ghost-btn" onClick={() => setShowAdmin(false)}>Cancel</button><button className="primary-red" onClick={applyAdmin}>Publish</button></div>
          </aside>
        </>
      )}
    </section>
  );
}

function AiReviewBlock({ review }: { review: AiReview | null }) { if (!review) return <p>No review returned.</p>; return <div className="ai-review-body"><h3>{review.headline || 'Expression check complete.'}</h3>{review.quality_flags?.length ? <><b>Expression check</b><ul>{review.quality_flags.map((item, index) => <li key={index}>{item}</li>)}</ul></> : null}{review.suggestions?.length ? <><b>Nudge</b><ul>{review.suggestions.map((item, index) => <li key={index}>{item}</li>)}</ul></> : null}<p>{review.pace_comment}</p><p>{review.encouragement}</p></div>; }
function EndSummary({ pm, name }: { pm: PmData; name: string }) { const done = submittedCount(pm); const avg = avgRank(pm); return <div className="end-summary-card"><span>Task closed</span><h3>{name} finished {done} NGOs</h3><p>Avg rank {avg} · Avg pace {avgPace(pm)} · Mode {reviewerMode(pm)}</p></div>; }
function FieldLike({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange?: (value: string) => void; type?: string }) { return <label className="admin-field"><span>{label}</span><input type={type} value={value || ''} onChange={event => onChange?.(event.target.value)} /></label>; }
function burstConfetti(n = 40) { if (typeof document === 'undefined') return; const root = document.createElement('div'); root.className = 'confetti-root'; document.body.appendChild(root); const colors = ['#ef4444', '#f59e0b', '#22c55e', '#38bdf8', '#a78bfa', '#f472b6']; for (let i = 0; i < n; i += 1) { const piece = document.createElement('i'); piece.style.left = `${Math.random() * 100}vw`; piece.style.background = colors[Math.floor(Math.random() * colors.length)]; piece.style.animationDelay = `${Math.random() * 0.25}s`; root.appendChild(piece); } window.setTimeout(() => root.remove(), 1700); }
