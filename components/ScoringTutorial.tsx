'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { METRICS, METRIC_SCALE, MetricKey } from '@/components/MetricScoring';

export type ScoringTutorialConfig = {
  metricKey: MetricKey;
  exampleScore: number;
  sentenceIndexes: {
    source: number;
    total: number;
    completed: number;
    firstAlumnus: number;
    firstAlumnusNext: number;
    secondAlumnus: number;
    rates: number;
  };
};

export const ALUMNI_OUTCOMES_TUTORIAL: ScoringTutorialConfig = {
  metricKey: 'child_progression',
  exampleScore: 4,
  sentenceIndexes: {
    source: 0,
    total: 1,
    completed: 2,
    firstAlumnus: 3,
    firstAlumnusNext: 4,
    secondAlumnus: 5,
    rates: 6,
  },
};

type ScoringTutorialProps = {
  onClose: () => void;
  config?: ScoringTutorialConfig;
};

type ReplicaPage = 'home' | 'annualReport' | 'impact';

const SCORE_VALUES = [1, 2, 3, 4, 5] as const;

function splitSentences(value: string) {
  return (value.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [value])
    .map(item => item.trim())
    .filter(Boolean);
}

function stageForStep(step: number) {
  if (step <= 1) return 0;
  if (step <= 8) return 1;
  if (step <= 10) return 2;
  return 3;
}

function pageForStep(step: number): ReplicaPage {
  if (step <= 2) return 'home';
  if (step <= 5) return 'annualReport';
  return 'impact';
}

export default function ScoringTutorial({ onClose, config = ALUMNI_OUTCOMES_TUTORIAL }: ScoringTutorialProps) {
  const [step, setStep] = useState(0);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const alumniMetric = useMemo(
    () => METRICS.find(metric => metric.key === config.metricKey) || METRICS[0],
    [config.metricKey],
  );
  const kalkeriRow = useMemo(
    () => alumniMetric.guide.rows.find(row => row.score === config.exampleScore) || alumniMetric.guide.rows[0],
    [alumniMetric, config.exampleScore],
  );
  const kalkeriSentences = useMemo(() => splitSentences(kalkeriRow.example), [kalkeriRow.example]);

  const sentenceAt = (index: number, fallback = '') => kalkeriSentences[index] || fallback;
  const reportSource = sentenceAt(config.sentenceIndexes.source, kalkeriRow.example);
  const higherEducation = sentenceAt(config.sentenceIndexes.total);
  const completed = sentenceAt(config.sentenceIndexes.completed);
  const sangeetaDegree = sentenceAt(config.sentenceIndexes.firstAlumnus);
  const sangeetaNext = sentenceAt(config.sentenceIndexes.firstAlumnusNext);
  const prakash = sentenceAt(config.sentenceIndexes.secondAlumnus);
  const progressionRates = sentenceAt(config.sentenceIndexes.rates);
  const reportSection = reportSource.match(/go to the (.+?) section/i)?.[1] || alumniMetric.title;
  const reportPages = reportSource.match(/pages? ([0-9–-]+)/i)?.[1] || '';

  const breakdown = useMemo(() => {
    const matches = Array.from(higherEducation.matchAll(/(\d+) in ([^,:.]+?)(?=,\s*\d+ in|\s+and\s+\d+ in|\.)/gi));
    return matches.map(match => ({ value: match[1], label: match[2].trim() }));
  }, [higherEducation]);

  const annualEvidence = `${higherEducation} ${completed} ${progressionRates}`;
  const impactEvidence = `${sangeetaDegree} ${sangeetaNext} ${prakash}`;
  const annualCaptured = step >= 5;
  const impactCaptured = step >= 8;
  const activePage = pageForStep(step);
  const activeStage = stageForStep(step);

  const close = () => {
    setStep(0);
    setSelectedScore(null);
    onClose();
  };

  useEffect(() => {
    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  useEffect(() => {
    const delays: Record<number, number> = {
      0: 2200,
      1: 1800,
      3: 2000,
      5: 260,
      6: 2000,
      8: 260,
      10: 2200,
    };
    const delay = delays[step];
    if (!delay) return;
    const timer = window.setTimeout(() => setStep(current => current + 1), delay);
    return () => window.clearTimeout(timer);
  }, [step]);

  const selectScore = (value: number) => {
    if (step !== 9) return;
    setSelectedScore(value);
    setStep(10);
  };

  const caption = (() => {
    if (step === 2) return 'Start with their annual report.';
    if (step === 3) return "This is what we're looking for — real, named outcomes with numbers.";
    if (step === 4) return 'Save the strongest report evidence before moving on.';
    if (step === 5) return 'Evidence added. Now cross-check it against the NGO website.';
    if (step === 6) return 'Now confirm on their website.';
    if (step === 7) return 'Add the named alumni outcomes to your notes.';
    if (step === 8) return 'Two sources now support the judgement.';
    return '';
  })();

  return (
    <div className="st-overlay" role="dialog" aria-modal="true" aria-label="Scoring tutorial">
      <div className="st-ambient" aria-hidden="true" />
      <header className="st-topbar">
        <div className="st-stage-progress" aria-label={`Tutorial stage ${activeStage + 1} of 4`}>
          {['Intro', 'Evidence', 'Score', 'Done'].map((label, index) => (
            <span key={label} className={index === activeStage ? 'active' : index < activeStage ? 'complete' : ''}>
              <i aria-hidden="true">{index < activeStage ? '✓' : index + 1}</i>
              <b>{label}</b>
            </span>
          ))}
        </div>
        <button ref={closeButtonRef} type="button" className="st-close" onClick={close} aria-label="Close scoring tutorial">×</button>
      </header>

      <main className="st-stage">
        {step === 0 && (
          <section className="st-intro-screen st-screen-enter">
            <span className="st-kicker">DFP scoring calibration</span>
            <h1>How do we score an NGO?</h1>
            <p>Every NGO is judged on three metrics.</p>
            <div className="st-metric-intro-grid">
              {METRICS.map((metric, index) => (
                <article key={metric.key} style={{ '--st-delay': `${index * 60}ms` } as React.CSSProperties}>
                  <span>{metric.letter}</span>
                  <div><h2>{metric.title}</h2><p>{metric.question}</p></div>
                </article>
              ))}
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="st-framing-screen st-screen-enter">
            <span className="st-kicker">One metric, one walkthrough</span>
            <h1>Let&apos;s score {alumniMetric.title}.</h1>
            <p>We&apos;ll judge {kalkeriRow.exampleTitle}.</p>
            <small>Follow the arrows — just click where we point.</small>
          </section>
        )}

        {step >= 2 && step <= 8 && (
          <section className="st-replica-shell st-screen-enter">
            <div className="st-caption" aria-live="polite"><span>{caption}</span></div>
            <div className="st-site-window">
              <header className="st-site-header">
                <div className="st-site-brand">
                  <span className="st-site-mark" aria-hidden="true">KSV</span>
                  <div><b>{kalkeriRow.exampleTitle}</b><small>Education · Music · Community</small></div>
                </div>
                <nav aria-label="Static Kalkeri website navigation">
                  {[
                    ['home', 'Home'],
                    ['whatWeDo', 'What We Do'],
                    ['impact', 'Impact'],
                    ['annualReport', 'Annual Report'],
                    ['welfare', 'Student Welfare'],
                  ].map(([key, label]) => {
                    const isAnnualTarget = key === 'annualReport' && step === 2;
                    const isActive = (key === 'home' && activePage === 'home') || (key === 'annualReport' && activePage === 'annualReport') || (key === 'impact' && activePage === 'impact');
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`${isActive ? 'active' : ''} ${isAnnualTarget ? 'st-guided-target' : ''}`}
                        tabIndex={isAnnualTarget ? 0 : -1}
                        aria-disabled={!isAnnualTarget}
                        onClick={isAnnualTarget ? () => setStep(3) : undefined}
                      >
                        {label}
                        {isAnnualTarget && <><span className="st-target-ring" aria-hidden="true"/><span className="st-arrow st-arrow-nav" aria-hidden="true">↓<b>Click here</b></span></>}
                      </button>
                    );
                  })}
                </nav>
              </header>

              <div className={`st-site-page st-page-${activePage}`} key={activePage}>
                {activePage === 'home' && (
                  <section className="st-site-home">
                    <div className="st-home-copy">
                      <span>Learning through education and performing arts</span>
                      <h2>A school where talent and opportunity grow together.</h2>
                      <p>Kalkeri Sangeet Vidyalaya supports children through formal education, music training and long-term student development.</p>
                      <div><button type="button" tabIndex={-1}>Discover our work</button><small>Since 2002 · Karnataka, India</small></div>
                    </div>
                    <div className="st-home-visual" aria-hidden="true">
                      <i/><i/><i/><b>Music<br/>meets<br/>learning</b>
                    </div>
                  </section>
                )}

                {activePage === 'annualReport' && (
                  <section className="st-report-page">
                    <aside className="st-report-cover">
                      <span>Annual Report</span>
                      <strong>2020–21</strong>
                      <i aria-hidden="true">KSV</i>
                      <small>Education. Performing arts. Student welfare.</small>
                    </aside>
                    <article className="st-report-content">
                      <span className="st-report-source">{reportSource}</span>
                      <h2>{reportSection} <small>{reportPages ? `pp. ${reportPages}` : null}</small></h2>
                      <div className={`st-evidence-block ${step === 3 || step === 4 || step === 5 ? 'highlighted' : ''}`}>
                        <div className="st-outcome-total"><strong>65</strong><span>students in higher education</span></div>
                        <div className="st-breakdown-grid">
                          {breakdown.map(item => <div key={item.label}><b>{item.value}</b><span>{item.label}</span></div>)}
                        </div>
                        <p>{completed}</p>
                        <div className="st-alumni-cards">
                          <article><b>Sangeeta Chavan</b><p>{sangeetaDegree} {sangeetaNext}</p></article>
                          <article><b>Prakash Chavan</b><p>{prakash}</p></article>
                        </div>
                        <p className="st-rate-line">{progressionRates}</p>
                        {(step === 3 || step === 4) && <span className="st-block-ring" aria-hidden="true"/>}
                        {step === 4 && (
                          <button type="button" className="st-add-notes st-guided-target" onClick={() => setStep(5)}>
                            ✓ Add to notes
                            <span className="st-target-ring" aria-hidden="true"/>
                            <span className="st-arrow st-arrow-button" aria-hidden="true">↓<b>Capture evidence</b></span>
                          </button>
                        )}
                      </div>
                    </article>
                  </section>
                )}

                {activePage === 'impact' && (
                  <section className="st-impact-page">
                    <div className="st-impact-hero"><span>Impact</span><h2>Success stories and outcomes</h2><p>Former students continue into higher education, careers and roles that strengthen their communities.</p></div>
                    <article className={`st-impact-evidence ${step === 6 || step === 7 || step === 8 ? 'highlighted' : ''}`}>
                      <span>Named alumni outcomes</span>
                      <div><b>Sangeeta Chavan</b><p>{sangeetaDegree} {sangeetaNext}</p></div>
                      <div><b>Prakash Chavan</b><p>{prakash}</p></div>
                      {(step === 6 || step === 7) && <span className="st-block-ring" aria-hidden="true"/>}
                      {step === 7 && (
                        <button type="button" className="st-add-notes st-guided-target" onClick={() => setStep(8)}>
                          ✓ Add to notes
                          <span className="st-target-ring" aria-hidden="true"/>
                          <span className="st-arrow st-arrow-button" aria-hidden="true">↓<b>Capture evidence</b></span>
                        </button>
                      )}
                    </article>
                  </section>
                )}
              </div>

              <aside className={`st-evidence-dock ${annualCaptured || impactCaptured ? 'has-evidence' : ''}`} aria-live="polite">
                <div><span>Evidence collected</span><b>{Number(annualCaptured) + Number(impactCaptured)} / 2</b></div>
                <ol>
                  {annualCaptured && <li className={step === 5 ? 'dropping' : ''}>{annualEvidence}</li>}
                  {impactCaptured && <li className={step === 8 ? 'dropping' : ''}>{impactEvidence}</li>}
                  {!annualCaptured && !impactCaptured && <li className="empty">Your strongest evidence will collect here.</li>}
                </ol>
              </aside>
            </div>
          </section>
        )}

        {(step === 9 || step === 10) && (
          <section className="st-judgement-screen st-screen-enter">
            <header><span className="st-kicker">Evidence → score</span><h1>Now turn this into a score.</h1></header>
            <div className="st-judgement-grid">
              <div className="st-score-column">
                <section className="st-found-panel">
                  <span>What you found</span>
                  <ul><li>{annualEvidence}</li><li>{impactEvidence}</li></ul>
                </section>
                <section className="st-score-sandbox">
                  <span>Your practice score</span>
                  <p>Use the evidence, then choose any value.</p>
                  <div className="st-score-buttons" role="radiogroup" aria-label="Practice Alumni Outcomes score">
                    {SCORE_VALUES.map(value => {
                      const selected = selectedScore === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          className={`${selected ? 'selected' : ''} ${step === 9 ? 'st-guided-target' : ''}`}
                          role="radio"
                          aria-checked={selected}
                          tabIndex={step === 9 ? 0 : -1}
                          disabled={step !== 9}
                          onClick={() => selectScore(value)}
                        >
                          <strong>{selected ? '✓' : value}</strong>
                          <span>{METRIC_SCALE[value].replace('-level', '')}</span>
                        </button>
                      );
                    })}
                    {step === 9 && <span className="st-score-group-ring" aria-hidden="true"/>}
                  </div>
                </section>
              </div>

              <section className="st-reference-panel">
                <header><span>Reference</span><h2>What each score looks like</h2><p>Program manager calibration examples</p></header>
                <div className="st-reference-rows">
                  {alumniMetric.guide.rows.map(row => (
                    <article key={row.score}>
                      <strong>{row.score}</strong>
                      <div><span>{row.meaning}</span><b>{row.exampleTitle}</b><p>{row.example}</p></div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </section>
        )}

        {step === 11 && (
          <section className="st-finish-screen st-screen-enter">
            <span className="st-finish-check" aria-hidden="true">✓</span>
            <span className="st-kicker">Tutorial complete</span>
            <h1>That&apos;s how we score {alumniMetric.title}.</h1>
            <p>Collect the evidence → compare to the reference → give your score. The same method applies to {METRICS[1].title} and {METRICS[2].title}.</p>
            <div><button type="button" className="st-secondary" onClick={() => { setSelectedScore(null); setStep(0); }}>Replay</button><button type="button" className="st-primary" onClick={close}>Done</button></div>
          </section>
        )}
      </main>

      {step <= 1 && <button type="button" className="st-skip" onClick={() => setStep(2)}>Skip intro →</button>}
    </div>
  );
}
