'use client';

import { useMemo } from 'react';

export type MetricKey = 'child_progression' | 'learning_model' | 'development_ecosystem';
export type MetricScore = { rank: number; reason: string; override: boolean; override_reason: string };
export type EvidenceLink = { label?: string; url: string };
export type MetricEvidence = {
  text?: string;
  links?: EvidenceLink[];
  ceiling_rank?: number;
  ceiling_reason?: string;
};

export const METRIC_SCALE: Record<number, string> = {
  1: 'Minimal',
  2: 'Limited',
  3: 'Meaningful',
  4: 'Strong',
  5: 'Benchmark-level',
};

export const METRIC_DEFINITIONS: Array<{
  key: MetricKey;
  letter: string;
  title: string;
  question: string;
  counts: string;
  baseline: string;
  ceilings: string[];
}> = [
  {
    key: 'child_progression',
    letter: 'A',
    title: 'Alumni Outcomes',
    question: 'What have former students gone on to achieve?',
    counts: 'School completion, college admission or completion, scholarships, employment, entrepreneurship, and serious sports or arts progression.',
    baseline: 'Do not count current participation, skills being taught, aspirations, or general claims that students succeed.',
    ceilings: [
      'Only current-student responsibility or internal paid roles: maximum 2.',
      'Only one or two alumni stories: normally maximum 3.',
      'No repeated or cohort-level evidence: normally maximum 4.',
      'A 5 needs broad, repeated and well-documented long-term destinations across cohorts.',
    ],
  },
  {
    key: 'learning_model',
    letter: 'B',
    title: 'Learning Model',
    question: 'How are children actually taught or trained?',
    counts: 'Level-based or individualised teaching, bridge or remedial learning, structured arts, sports or vocational training, assessment, mentoring and transition preparation.',
    baseline: 'Do not reward ordinary lessons, timetables, basic assessments, or words such as holistic and child-centred without operational detail.',
    ceilings: [
      'Mostly ordinary schooling: maximum 2.',
      'Conventional schooling plus remediation, mentoring or transition support: maximum 3.',
      'No clear frequency or implementation detail: maximum 3.',
      'A 5 needs a distinctive, intensive and coherent model central to the institution.',
    ],
  },
  {
    key: 'development_ecosystem',
    letter: 'C',
    title: 'Development Environment',
    question: 'What sustained support and opportunities surround the child beyond instruction?',
    counts: 'Residential or extended-day care, healthcare, therapeutic support, family engagement, child protection, sustained exposure and long-horizon support through major transitions.',
    baseline: 'Free education, uniforms, school materials, ordinary meals and one-off activities do not independently raise the score.',
    ceilings: [
      'Mostly baseline services: maximum 2.',
      'Several useful but ordinary supports: maximum 3.',
      'No evidence of frequency, coverage or sustained delivery: maximum 3.',
      'A 5 needs exceptional breadth, integration, intensity and continuity around the child.',
    ],
  },
];

export const DEFAULT_METRIC_SCORES: Record<MetricKey, MetricScore> = {
  child_progression: { rank: 3, reason: '', override: false, override_reason: '' },
  learning_model: { rank: 3, reason: '', override: false, override_reason: '' },
  development_ecosystem: { rank: 3, reason: '', override: false, override_reason: '' },
};

export const EMPTY_METRIC_EVIDENCE: Record<MetricKey, MetricEvidence> = {
  child_progression: { text: '', links: [], ceiling_rank: 0, ceiling_reason: '' },
  learning_model: { text: '', links: [], ceiling_rank: 0, ceiling_reason: '' },
  development_ecosystem: { text: '', links: [], ceiling_rank: 0, ceiling_reason: '' },
};

function clampRank(value: unknown, fallback = 3) {
  const rank = Number(value);
  if (!Number.isFinite(rank)) return fallback;
  return Math.min(5, Math.max(1, Math.round(rank)));
}

function clampOptionalRank(value: unknown) {
  const rank = Number(value);
  if (!Number.isFinite(rank) || rank < 1) return 0;
  return Math.min(5, Math.max(1, Math.round(rank)));
}

function normaliseBoolean(value: unknown) {
  return value === true || ['1', 'true', 'yes', 'on'].includes(String(value || '').trim().toLowerCase());
}

export function normaliseMetricScores(value: unknown): Record<MetricKey, MetricScore> {
  const raw = value && typeof value === 'object' ? value as Record<string, any> : {};
  const next = structuredClone(DEFAULT_METRIC_SCORES);
  for (const metric of METRIC_DEFINITIONS) {
    const row = raw[metric.key] || {};
    next[metric.key] = {
      rank: clampRank(row.rank ?? row.score),
      reason: String(row.reason || ''),
      override: normaliseBoolean(row.override ?? row.override_metric ?? row.ceiling_override),
      override_reason: String(row.override_reason || row.override_metric_reason || row.ceiling_override_reason || ''),
    };
  }
  return next;
}

function validExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function parseEvidenceLinks(value: string): EvidenceLink[] {
  return String(value || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const split = line.split('|');
      const url = (split.length > 1 ? split.pop() : split[0])?.trim() || '';
      const label = split.join('|').trim();
      return { label: label || undefined, url };
    })
    .filter(link => validExternalUrl(link.url));
}

export function evidenceLinksToText(links?: EvidenceLink[]) {
  return (Array.isArray(links) ? links : [])
    .filter(link => link && validExternalUrl(String(link.url || '')))
    .map((link, index) => `${link.label || `Source ${index + 1}`} | ${link.url}`)
    .join('\n');
}

export function evidenceFacts(text?: string) {
  const raw = String(text || '').trim();
  if (!raw) return [];
  const lines = raw.split(/\r?\n/).map(line => line.replace(/^[-•\d.)\s]+/, '').trim()).filter(Boolean);
  if (lines.length > 1) return lines.slice(0, 8);
  return raw
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, 8);
}

export function normaliseMetricEvidence(value: unknown): Record<MetricKey, MetricEvidence> {
  const raw = value && typeof value === 'object' ? value as Record<string, any> : {};
  const next = structuredClone(EMPTY_METRIC_EVIDENCE);
  for (const metric of METRIC_DEFINITIONS) {
    const row = raw[metric.key] || {};
    const links = Array.isArray(row.links)
      ? row.links.map((link: any, index: number) => {
          if (typeof link === 'string') return { label: `Source ${index + 1}`, url: link };
          return { label: String(link?.label || `Source ${index + 1}`), url: String(link?.url || '') };
        }).filter((link: EvidenceLink) => validExternalUrl(link.url))
      : [];
    next[metric.key] = {
      text: String(row.text || ''),
      links,
      ceiling_rank: clampOptionalRank(row.ceiling_rank ?? row.recommended_ceiling ?? row.max_rank),
      ceiling_reason: String(row.ceiling_reason || row.recommended_ceiling_reason || ''),
    };
  }
  return next;
}

export function MetricScoringCard({
  metricKey,
  score,
  evidence,
  disabled,
  onChange,
  onOpenReferences,
}: {
  metricKey: MetricKey;
  score: MetricScore;
  evidence?: MetricEvidence;
  disabled?: boolean;
  onChange: (next: MetricScore) => void;
  onOpenReferences: () => void;
}) {
  const metric = METRIC_DEFINITIONS.find(item => item.key === metricKey)!;
  const chars = score.reason.length;
  const complete = chars >= 100;
  const overrideChars = score.override_reason.length;
  const overrideComplete = !score.override || overrideChars >= 100;
  const normalisedEvidence = useMemo(
    () => normaliseMetricEvidence({ [metricKey]: evidence })[metricKey],
    [evidence, metricKey],
  );
  const links = normalisedEvidence.links || [];
  const facts = useMemo(() => evidenceFacts(normalisedEvidence.text), [normalisedEvidence.text]);
  const hasEvidence = facts.length > 0 || links.length > 0 || Boolean(normalisedEvidence.ceiling_rank || normalisedEvidence.ceiling_reason);
  const ceilingRank = normalisedEvidence.ceiling_rank || 0;
  const exceedsCeiling = Boolean(ceilingRank && score.rank > ceilingRank);

  return (
    <article className={`metric-score-card metric-score-${score.rank}`}>
      <div className="metric-score-head">
        <div>
          <span className="metric-letter">{metric.letter}</span>
          <div>
            <h4>{metric.title}</h4>
            <p>{metric.question}</p>
          </div>
        </div>
        <button type="button" className="metric-reference-btn" onClick={onOpenReferences}>Scoring rules ↗</button>
      </div>

      <details className={`metric-evidence-box metric-evidence-collapsible ${hasEvidence ? '' : 'metric-evidence-empty'}`}>
        <summary>
          <div>
            <span>Evidence pack</span>
            <small>{hasEvidence ? `${facts.length} fact${facts.length === 1 ? '' : 's'} · ${links.length} source${links.length === 1 ? '' : 's'}` : 'Not added yet'}</small>
          </div>
          <b>Open</b>
        </summary>
        <div className="metric-evidence-content">
          {facts.length > 0 ? (
            <ol className="metric-evidence-facts">
              {facts.map((fact, index) => <li key={`${fact}-${index}`}>{fact}</li>)}
            </ol>
          ) : <p className="metric-evidence-placeholder">No factual evidence package has been added from the gear panel yet.</p>}

          {links.length > 0 && (
            <div className="metric-evidence-links">
              {links.map((link, index) => (
                <a key={`${link.url}-${index}`} href={link.url} target="_blank" rel="noreferrer">
                  {link.label || `Source ${index + 1}`} ↗
                </a>
              ))}
            </div>
          )}

          {(normalisedEvidence.ceiling_rank || normalisedEvidence.ceiling_reason) && (
            <div className="metric-ceiling-note">
              <div><span>Ceiling to consider</span>{normalisedEvidence.ceiling_rank ? <b>Maximum {normalisedEvidence.ceiling_rank}</b> : null}</div>
              {normalisedEvidence.ceiling_reason && <p>{normalisedEvidence.ceiling_reason}</p>}
            </div>
          )}
        </div>
      </details>

      <div className="metric-plain-guidance">
        <div><b>Count</b><span>{metric.counts}</span></div>
        <div><b>Do not count as distinctive</b><span>{metric.baseline}</span></div>
      </div>

      <div className="metric-rank-panel">
        <div className="metric-rank-value"><strong>{score.rank}</strong><span>{METRIC_SCALE[score.rank]}</span></div>
        <input
          className={`rank-slider metric-rank-slider rank-${score.rank}`}
          type="range"
          min="1"
          max="5"
          step="1"
          value={score.rank}
          disabled={disabled}
          aria-label={`${metric.title} rank`}
          onChange={event => onChange({ ...score, rank: Number(event.target.value) })}
        />
        <div className="metric-rank-scale">
          {Object.entries(METRIC_SCALE).map(([rank, label]) => <span key={rank}><b>{rank}</b><em>{label}</em></span>)}
        </div>
      </div>

      <label className="metric-reason-field">
        <span>Why this score? <b>Required</b></span>
        <textarea
          value={score.reason}
          disabled={disabled}
          minLength={100}
          onChange={event => onChange({ ...score, reason: event.target.value })}
          placeholder={`Explain why ${metric.title.toLowerCase()} is ${score.rank}. Use the evidence pack, the ceiling and the comparison with the score above or below.`}
        />
        <small className={complete ? 'complete' : ''}>{chars}/100 characters minimum{complete ? ' · complete' : ''}</small>
      </label>

      <section className={`metric-override-box ${score.override ? 'active' : ''} ${exceedsCeiling ? 'required' : ''}`}>
        <label className="metric-override-toggle">
          <input
            type="checkbox"
            checked={score.override}
            disabled={disabled}
            onChange={event => onChange({
              ...score,
              override: event.target.checked,
              override_reason: event.target.checked ? score.override_reason : '',
            })}
          />
          <span>
            <b>Override this metric</b>
            <small>Use this when the recommended ceiling or evidence pack misses something material.</small>
          </span>
        </label>

        {exceedsCeiling && !score.override && (
          <p className="metric-override-warning">Your score of {score.rank} is above the recommended ceiling of {ceilingRank}. Turn on the override and explain why.</p>
        )}

        {score.override && (
          <label className="metric-reason-field metric-override-reason-field">
            <span>Why are you overriding this metric? <b>Required</b></span>
            <textarea
              value={score.override_reason}
              disabled={disabled}
              minLength={100}
              onChange={event => onChange({ ...score, override_reason: event.target.value })}
              placeholder={`Explain what the evidence pack or recommended ceiling misses, and why your ${metric.title.toLowerCase()} judgement should override it.`}
            />
            <small className={overrideComplete ? 'complete' : ''}>{overrideChars}/100 characters minimum{overrideComplete ? ' · complete' : ''}</small>
          </label>
        )}
      </section>
    </article>
  );
}

export function MetricReferenceModal({
  activeMetric,
  documentUrl,
  onClose,
}: {
  activeMetric: MetricKey;
  documentUrl?: string;
  onClose: () => void;
}) {
  const metric = METRIC_DEFINITIONS.find(item => item.key === activeMetric)!;
  const safeDocumentUrl = documentUrl && validExternalUrl(documentUrl) ? documentUrl : '';
  return (
    <div className="metric-reference-scrim" onClick={onClose}>
      <section className="metric-reference-modal metric-rules-modal" onClick={event => event.stopPropagation()}>
        <button className="modal-x" type="button" onClick={onClose}>×</button>
        <span className="workstream-kicker">Scoring rules</span>
        <h2>{metric.title}</h2>
        <p className="metric-reference-question">{metric.question}</p>

        <div className="metric-reference-guidance">
          <div><b>Count</b><p>{metric.counts}</p></div>
          <div><b>Do not count as distinctive</b><p>{metric.baseline}</p></div>
        </div>

        <div className="metric-reference-scale">
          {Object.entries(METRIC_SCALE).map(([rank, label]) => <span key={rank}><b>{rank}</b><em>{label}</em></span>)}
        </div>

        <section className="metric-mandatory-ceilings">
          <span>Mandatory ceilings</span>
          <ol>{metric.ceilings.map(item => <li key={item}>{item}</li>)}</ol>
        </section>

        <p className="metric-reference-note">A long list of ordinary activities cannot overpower a ceiling. The same claim should receive scoring credit under only one metric.</p>
        {safeDocumentUrl && <a className="primary-red metric-reference-document" href={safeDocumentUrl} target="_blank" rel="noreferrer">Open full scoring document ↗</a>}
      </section>
    </div>
  );
}
