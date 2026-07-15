'use client';

import { useMemo } from 'react';

export type MetricKey = 'child_progression' | 'learning_model' | 'development_ecosystem';
export type MetricScore = { rank: number; reason: string };
export type EvidenceLink = { label?: string; url: string };
export type MetricEvidence = { text?: string; links?: EvidenceLink[] };

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
  lookFor: string;
  doNotOverCredit: string;
}> = [
  {
    key: 'child_progression',
    letter: 'A',
    title: 'Child Progression & Alumni Outcomes',
    question: 'Where do children reach?',
    lookFor: 'Return to or remain in education; Class 10/12 completion, college, scholarships; Employment, entrepreneurship, sports or arts progression; Outcomes repeated across children or years.',
    doNotOverCredit: 'Generic “students succeed” claims; Participation without progression; Awards won by the NGO itself.',
  },
  {
    key: 'learning_model',
    letter: 'B',
    title: 'Learning Model',
    question: 'How are children taught or trained?',
    lookFor: 'Individualised or level-based learning; Bridge, remedial, experiential or project-based learning; Structured sports, arts or vocational training; Assessment, mentoring and transition preparation.',
    doNotOverCredit: '“Holistic” or “child-centric” without detail; One-off workshops; Infrastructure without evidence of use.',
  },
  {
    key: 'development_ecosystem',
    letter: 'C',
    title: 'Development Ecosystem',
    question: 'What support and opportunities surround the child?',
    lookFor: 'Residential or extended-day support; Mentors, counsellors, house parents, healthcare or nutrition; Regular sports, arts, clubs, competitions and exposure; Long-term support, career guidance and scholarships.',
    doNotOverCredit: 'Attractive campus photographs; One annual event or donor visit; Generic “safe and nurturing environment” claims.',
  },
];

export const DEFAULT_METRIC_SCORES: Record<MetricKey, MetricScore> = {
  child_progression: { rank: 3, reason: '' },
  learning_model: { rank: 3, reason: '' },
  development_ecosystem: { rank: 3, reason: '' },
};

export const EMPTY_METRIC_EVIDENCE: Record<MetricKey, MetricEvidence> = {
  child_progression: { text: '', links: [] },
  learning_model: { text: '', links: [] },
  development_ecosystem: { text: '', links: [] },
};

function clampRank(value: unknown) {
  const rank = Number(value);
  if (!Number.isFinite(rank)) return 3;
  return Math.min(5, Math.max(1, Math.round(rank)));
}

export function normaliseMetricScores(value: unknown): Record<MetricKey, MetricScore> {
  const raw = value && typeof value === 'object' ? value as Record<string, any> : {};
  const next = structuredClone(DEFAULT_METRIC_SCORES);
  for (const metric of METRIC_DEFINITIONS) {
    const row = raw[metric.key] || {};
    next[metric.key] = {
      rank: clampRank(row.rank ?? row.score),
      reason: String(row.reason || ''),
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
    next[metric.key] = { text: String(row.text || ''), links };
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
  const links = useMemo(() => normaliseMetricEvidence({ [metricKey]: evidence })[metricKey].links || [], [evidence, metricKey]);

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
        <button type="button" className="metric-reference-btn" onClick={onOpenReferences}>References ↗</button>
      </div>

      <div className="metric-guidance-grid">
        <div><b>Look for</b><span>{metric.lookFor}</span></div>
        <div><b>Do not over-credit</b><span>{metric.doNotOverCredit}</span></div>
      </div>

      {(evidence?.text || links.length > 0) && (
        <section className="metric-evidence-box">
          <div className="metric-evidence-title"><span>Evidence</span><small>Added by admin</small></div>
          {evidence?.text && <p>{evidence.text}</p>}
          {links.length > 0 && (
            <div className="metric-evidence-links">
              {links.map((link, index) => (
                <a key={`${link.url}-${index}`} href={link.url} target="_blank" rel="noreferrer">
                  {link.label || `Source ${index + 1}`} ↗
                </a>
              ))}
            </div>
          )}
        </section>
      )}

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
        <span>Reason for this rank <b>Required</b></span>
        <textarea
          value={score.reason}
          disabled={disabled}
          minLength={100}
          onChange={event => onChange({ ...score, reason: event.target.value })}
          placeholder={`Explain why ${metric.title.toLowerCase()} is ranked ${score.rank}. Use the evidence above and write at least 100 characters.`}
        />
        <small className={complete ? 'complete' : ''}>{chars}/100 characters minimum{complete ? ' · complete' : ''}</small>
      </label>
    </article>
  );
}

const BENCHMARKS = [
  ['Shanti Bhavan', 'Long-horizon residential', 5, 4, 5, 'Complete child-to-college-and-career pathway'],
  ['Katha', 'Community / alternative education', 4, 5, 4, 'Distinctive story-based pedagogy'],
  ['Lotus Petal Foundation', 'Integrated full-day school', 4, 3, 4, 'Education + nutrition + healthcare + livelihood'],
  ['Kaliyuva Mane / Divya Deepa', 'Alternative residential education', 4, 5, 5, 'Out-of-system children; alternative learning and care'],
  ['Bridges of Sports', 'Sports-led transformation', 4, 5, 5, 'Athlete development and full performance support'],
  ['Shishu Mandir', 'Long-term school and community support', 4, 4, 5, '12-year school pathway plus higher-education support'],
  ['ABM Samaj', 'Tribal residential education', 3, 3, 4, 'Residential schooling, scholarships and community support'],
  ['Nareshwadi / Giri Vanvasi', 'Tribal residential / experiential', 2, 4, 5, 'Farm-based learning and a complete residential ecosystem'],
  ['Akshar Foundation', 'Alternative / vocational education', 3, 5, 4, 'Peer learning, skill-based grouping and livelihood learning'],
] as const;

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
      <section className="metric-reference-modal" onClick={event => event.stopPropagation()}>
        <button className="modal-x" type="button" onClick={onClose}>×</button>
        <span className="workstream-kicker">Scoring references</span>
        <h2>{metric.title}</h2>
        <p className="metric-reference-question">{metric.question}</p>
        <div className="metric-reference-guidance">
          <div><b>Look for</b><p>{metric.lookFor}</p></div>
          <div><b>Do not over-credit</b><p>{metric.doNotOverCredit}</p></div>
        </div>
        <div className="metric-reference-scale">
          {Object.entries(METRIC_SCALE).map(([rank, label]) => <span key={rank}><b>{rank}</b><em>{label}</em></span>)}
        </div>
        <p className="metric-reference-note">A 5 does not mean “very good.” It means the institution is comparable to the strongest benchmark for that model.</p>

        <div className="metric-benchmark-table-wrap">
          <table className="metric-benchmark-table">
            <thead><tr><th>Institution</th><th>Model</th><th>Outcomes</th><th>Learning</th><th>Ecosystem</th><th>Benchmark strength</th></tr></thead>
            <tbody>{BENCHMARKS.map(row => <tr key={row[0]}>{row.map((cell, index) => <td key={index}>{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <p className="metric-reference-note">These are dimension scores, not overall NGO scores. Compare every NGO with the benchmark closest to its model; do not mechanically average the three dimensions.</p>
        {safeDocumentUrl && <a className="primary-red metric-reference-document" href={safeDocumentUrl} target="_blank" rel="noreferrer">Open full reference document ↗</a>}
      </section>
    </div>
  );
}
