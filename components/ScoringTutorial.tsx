'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
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

function advanceOnKeyboard(event: ReactKeyboardEvent<HTMLElement>, advance: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    advance();
  }
}

export default function ScoringTutorial({ onClose, config = ALUMNI_OUTCOMES_TUTORIAL }: ScoringTutorialProps) {
  const [step, setStep] = useState(0);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const metric = useMemo(
    () => METRICS.find(item => item.key === config.metricKey) || METRICS[0],
    [config.metricKey],
  );
  const kalkeriRow = useMemo(
    () => metric.guide.rows.find(row => row.score === config.exampleScore) || metric.guide.rows[0],
    [metric, config.exampleScore],
  );
  const sentences = useMemo(() => splitSentences(kalkeriRow.example), [kalkeriRow.example]);
  const sentenceAt = (index: number, fallback = '') => sentences[index] || fallback;

  const reportSource = sentenceAt(config.sentenceIndexes.source, kalkeriRow.example);
  const higherEducation = sentenceAt(config.sentenceIndexes.total);
  const completed = sentenceAt(config.sentenceIndexes.completed);
  const sangeetaDegree = sentenceAt(config.sentenceIndexes.firstAlumnus);
  const sangeetaNext = sentenceAt(config.sentenceIndexes.firstAlumnusNext);
  const prakash = sentenceAt(config.sentenceIndexes.secondAlumnus);
  const progressionRates = sentenceAt(config.sentenceIndexes.rates);
  const reportPages = reportSource.match(/pages? ([0-9–-]+)/i)?.[1] || '15–20';

  const breakdown = useMemo(() => {
    const matches = Array.from(higherEducation.matchAll(/(\d+) in ([^,:.]+?)(?=,\s*\d+ in|\s+and\s+\d+ in|\.)/gi));
    return matches.map(match => ({ value: match[1], label: match[2].trim() }));
  }, [higherEducation]);

  const annualEvidence = `${higherEducation} ${completed} ${progressionRates}`;
  const websiteEvidence = `${sangeetaDegree} ${sangeetaNext} ${prakash}`;
  const annualCaptured = step >= 5;
  const websiteCaptured = step >= 8;
  const activeStage = stageForStep(step);

  const close = () => {
    setStep(0);
    setSelectedScore(null);
    onClose();
  };

  const restart = () => {
    setStep(0);
    setSelectedScore(null);
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
      3: 2200,
      5: 320,
      6: 2200,
      8: 420,
      10: 820,
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
    if (step === 2) return 'Start with the strongest formal source: the annual report.';
    if (step === 3) return 'Look for named outcomes and numbers—not broad claims.';
    if (step === 4) return 'Save the report evidence you would actually use to justify a score.';
    if (step === 5) return 'Evidence saved. Now cross-check it against the NGO website.';
    if (step === 6) return 'Confirm that the organisation describes the same progression pathway publicly.';
    if (step === 7) return 'Add the named alumni outcomes to your notes.';
    if (step === 8) return 'Two sources now support the judgement.';
    return '';
  })();

  return (
    <div className="st2-overlay" role="dialog" aria-modal="true" aria-label="Scoring tutorial">
      <div className="st2-progress-line" aria-hidden="true"><i style={{ width: `${((activeStage + 1) / 4) * 100}%` }} /></div>
      <header className="st2-controls">
        <button ref={closeButtonRef} type="button" onClick={close}>← Back</button>
        <div>
          <span>{['Intro', 'Evidence', 'Score', 'Done'][activeStage]}</span>
          <button type="button" onClick={restart}>Restart</button>
          <button type="button" className="st2-close" onClick={close} aria-label="Close scoring tutorial">×</button>
        </div>
      </header>

      <main className="st2-stage">
        {step === 0 && (
          <section
            className="st2-cinematic st2-intro"
            role="button"
            tabIndex={0}
            onClick={() => setStep(1)}
            onKeyDown={event => advanceOnKeyboard(event, () => setStep(1))}
            aria-label="Continue to the next tutorial screen"
          >
            <div className="st2-intro-inner">
              <p className="st2-film-kicker">DFP scoring tutorial</p>
              <h1>How do we<br />score an NGO?</h1>
              <p className="st2-film-sub">Every NGO is judged on three metrics.</p>
              <div className="st2-metric-lines">
                {METRICS.map((item, index) => (
                  <article key={item.key}>
                    <span>0{index + 1}</span>
                    <div><b>{item.title}</b><small>{item.question}</small></div>
                  </article>
                ))}
              </div>
            </div>
            <span className="st2-click-cue">Click anywhere to continue <i>→</i></span>
          </section>
        )}

        {step === 1 && (
          <section
            className="st2-cinematic st2-framing"
            role="button"
            tabIndex={0}
            onClick={() => setStep(2)}
            onKeyDown={event => advanceOnKeyboard(event, () => setStep(2))}
            aria-label="Begin the Kalkeri scoring walkthrough"
          >
            <div>
              <p>Let&apos;s score</p>
              <h1>{metric.title}.</h1>
              <h2>We&apos;ll judge<br />{kalkeriRow.exampleTitle}.</h2>
              <small>Follow the red guide. Only the highlighted target will respond.</small>
            </div>
            <span className="st2-click-cue">Click to begin <i>→</i></span>
          </section>
        )}

        {step >= 2 && step <= 8 && (
          <section className="st2-workspace">
            <div className="st2-caption" aria-live="polite"><span>{caption}</span></div>

            <div className="st2-browser">
              <div className="st2-browser-bar">
                <div><i /><i /><i /></div>
                <span><b>▣</b> ksv.org.in</span>
                <em>Static tutorial replica</em>
              </div>

              <div className="st2-site">
                <header className="st2-site-header">
                  <a className="st2-site-logo" tabIndex={-1} aria-hidden="true">
                    <span className="st2-logo-symbol"><i /><i /><i /></span>
                    <b>Kalkeri<br />Sangeet<br />Vidyalaya</b>
                  </a>
                  <nav aria-label="Static Kalkeri website navigation">
                    <button type="button" tabIndex={-1}>Home</button>
                    <div className="st2-menu-open">
                      <button type="button" tabIndex={-1}>Who we are <span>⌄</span></button>
                      {step === 2 && (
                        <div className="st2-dropdown">
                          <span>Vision &amp; mission</span>
                          <span>Students</span>
                          <button type="button" className="st2-target" onClick={() => setStep(3)}>
                            Annual Reports
                            <i className="st2-ring" aria-hidden="true" />
                            <em className="st2-arrow st2-arrow-down" aria-hidden="true">↓<b>Click here</b></em>
                          </button>
                        </div>
                      )}
                    </div>
                    <button type="button" tabIndex={-1}>What we do</button>
                    <button type="button" tabIndex={-1}>Volunteer</button>
                    <button type="button" tabIndex={-1}>Contact</button>
                    <button type="button" className="st2-donate" tabIndex={-1}>Donate</button>
                  </nav>
                </header>

                {step === 2 && (
                  <section className="st2-home-page">
                    <div className="st2-home-copy">
                      <p>Education · Performing arts · Student welfare</p>
                      <h2>Children learn.<br />Artists emerge.<br />Futures open.</h2>
                      <span>KSV supports children from marginalised communities through academics, music and long-term support into higher education.</span>
                      <div><button type="button" tabIndex={-1}>Discover KSV</button><small>Founded 2002 · Dharwad, Karnataka</small></div>
                    </div>
                    <div className="st2-campus-frame" aria-hidden="true">
                      <div className="st2-campus-photo">
                        <span className="roof" /><span className="wall" /><span className="tree one" /><span className="tree two" />
                        <span className="student s1" /><span className="student s2" /><span className="student s3" /><span className="student s4" />
                      </div>
                      <div><b>220+</b><span>students supported through school and higher education</span></div>
                    </div>
                  </section>
                )}

                {step >= 3 && step <= 5 && (
                  <section className="st2-report-viewer">
                    <aside className="st2-report-sidebar">
                      <div className="st2-report-cover-mini"><span>KSV</span><b>Annual Report</b><strong>2020–21</strong></div>
                      <button className="active" type="button" tabIndex={-1}>Higher education <span>15</span></button>
                      <button type="button" tabIndex={-1}>Alumni: Sangeeta <span>16–17</span></button>
                      <button type="button" tabIndex={-1}>Alumni: Prakash <span>18</span></button>
                      <button type="button" tabIndex={-1}>Academic outcomes <span>20</span></button>
                    </aside>
                    <div className="st2-report-canvas">
                      <div className="st2-pdf-toolbar"><span>Annual Report 2020–21.pdf</span><b>Page 15 of 34</b><em>− &nbsp; 100% &nbsp; +</em></div>
                      <article className={`st2-report-sheet ${step >= 3 ? 'highlighted' : ''}`}>
                        <div className="st2-report-page-no">15</div>
                        <h2>HIGHER EDUCATION</h2>
                        <p className="st2-report-lead">65 students are now pursuing their higher education studies</p>
                        <ul>
                          {breakdown.length ? breakdown.map(item => <li key={item.label}><b>{item.value}</b> students are in {item.label}</li>) : (
                            <><li><b>26</b> students are in PUC College</li><li><b>28</b> students are in undergraduate programmes</li><li><b>3</b> students are in postgraduate programmes</li><li><b>8</b> students are in vocational training</li></>
                          )}
                        </ul>
                        <div className="st2-report-grid">
                          <section><span>COMPLETION</span><strong>10</strong><p>students completed higher education during the year.</p></section>
                          <section><span>TRANSITION</span><strong>14/15</strong><p>Class 10 graduates entered PU college.</p></section>
                          <section><span>PROGRESSION</span><strong>85%</strong><p>of PUC finishers continued to undergraduate study.</p></section>
                        </div>
                        <div className="st2-alumni-strip">
                          <article><i className="st2-portrait sangeeta" /><div><b>Sangeeta Chavan</b><p>MA English · batch topper · expected to return to KSV as a teacher.</p></div></article>
                          <article><i className="st2-portrait prakash" /><div><b>Prakash Chavan</b><p>MBA · Service Delivery Manager at IndusInd Bank.</p></div></article>
                        </div>
                        {(step === 3 || step === 4) && <i className="st2-evidence-outline" aria-hidden="true" />}
                        {step === 4 && (
                          <button type="button" className="st2-add-note st2-target" onClick={() => setStep(5)}>
                            ✓ Add to notes
                            <i className="st2-ring" aria-hidden="true" />
                            <em className="st2-arrow st2-arrow-up" aria-hidden="true">↑<b>Capture this evidence</b></em>
                          </button>
                        )}
                      </article>
                    </div>
                  </section>
                )}

                {step >= 6 && step <= 8 && (
                  <section className="st2-academic-page">
                    <div className="st2-academic-hero">
                      <span>What we do / Academic Studies</span>
                      <h2>Support continues<br />beyond secondary school.</h2>
                      <p>KSV encourages students to pursue higher education and remains involved through financial, academic and personal support.</p>
                    </div>
                    <div className={`st2-website-evidence ${step >= 6 ? 'highlighted' : ''}`}>
                      <header><span>Alumni progression</span><b>From KSV into college and careers</b></header>
                      <div className="st2-story-grid">
                        <article>
                          <i className="st2-portrait sangeeta" />
                          <div><span>Higher education</span><h3>Sangeeta Chavan</h3><p>{sangeetaDegree} {sangeetaNext}</p></div>
                        </article>
                        <article>
                          <i className="st2-portrait prakash" />
                          <div><span>Employment</span><h3>Prakash Chavan</h3><p>{prakash}</p></div>
                        </article>
                      </div>
                      {(step === 6 || step === 7) && <i className="st2-evidence-outline" aria-hidden="true" />}
                      {step === 7 && (
                        <button type="button" className="st2-add-note st2-target" onClick={() => setStep(8)}>
                          ✓ Add to notes
                          <i className="st2-ring" aria-hidden="true" />
                          <em className="st2-arrow st2-arrow-up" aria-hidden="true">↑<b>Capture this evidence</b></em>
                        </button>
                      )}
                    </div>
                  </section>
                )}
              </div>

              <aside className="st2-evidence-dock" aria-live="polite">
                <div><span>Evidence collected</span><b>{Number(annualCaptured) + Number(websiteCaptured)} / 2</b></div>
                <ol>
                  {annualCaptured && <li className={step === 5 ? 'dropping' : ''}><b>Annual report</b><span>{annualEvidence}</span></li>}
                  {websiteCaptured && <li className={step === 8 ? 'dropping' : ''}><b>Website</b><span>{websiteEvidence}</span></li>}
                  {!annualCaptured && !websiteCaptured && <li className="empty">Your strongest evidence will collect here.</li>}
                </ol>
              </aside>
            </div>
          </section>
        )}

        {(step === 9 || step === 10) && (
          <section className="st2-judgement">
            <header><p>Evidence → judgement</p><h1>Now turn this into a score.</h1></header>
            <div className="st2-judgement-grid">
              <div className="st2-score-side">
                <section className="st2-found">
                  <span>What you found</span>
                  <article><b>01</b><p>{annualEvidence}</p></article>
                  <article><b>02</b><p>{websiteEvidence}</p></article>
                </section>
                <section className="st2-score-sandbox">
                  <span>Your practice score</span>
                  <p>Use the evidence and choose any value.</p>
                  <div className="st2-score-buttons" role="radiogroup" aria-label="Practice Alumni Outcomes score">
                    {SCORE_VALUES.map(value => {
                      const selected = selectedScore === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          className={selected ? 'selected' : ''}
                          role="radio"
                          aria-checked={selected}
                          disabled={step !== 9}
                          onClick={() => selectScore(value)}
                        >
                          <strong>{value}</strong>
                          <span>{METRIC_SCALE[value].replace('-level', '')}</span>
                          {selected && <i>✓</i>}
                        </button>
                      );
                    })}
                    {step === 9 && <i className="st2-score-outline" aria-hidden="true" />}
                  </div>
                </section>
              </div>

              <section className="st2-reference">
                <header><span>Reference</span><h2>What each score looks like</h2><p>Program manager calibration examples</p></header>
                <div>
                  {metric.guide.rows.map(row => (
                    <article key={row.score}>
                      <strong>{row.score}</strong>
                      <section><span>{row.meaning}</span><b>{row.exampleTitle}</b><p>{row.example}</p></section>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </section>
        )}

        {step === 11 && (
          <section className="st2-finish">
            <span>✓</span>
            <p>Tutorial complete</p>
            <h1>That&apos;s how we score<br />{metric.title}.</h1>
            <h2>Collect the evidence → compare to the reference → give your score.</h2>
            <small>The same method applies to {METRICS[1].title} and {METRICS[2].title}.</small>
            <div><button type="button" onClick={restart}>Replay</button><button type="button" className="primary" onClick={close}>Done</button></div>
          </section>
        )}
      </main>

      <footer className="st2-stage-dots" aria-label={`Tutorial stage ${activeStage + 1} of 4`}>
        {['Intro', 'Evidence', 'Score', 'Done'].map((label, index) => (
          <span key={label} className={index === activeStage ? 'active' : index < activeStage ? 'complete' : ''}><i>{index < activeStage ? '✓' : index + 1}</i><b>{label}</b></span>
        ))}
      </footer>
    </div>
  );
}
