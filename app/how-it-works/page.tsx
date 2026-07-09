'use client';

// DFP 2.0 — "How it works" story, v85 DIRECTOR'S CUT.
// Drop-in replacement for app/how-it-works/page.tsx.
// Structure: 8 slides. Full-bleed bookends + midpoint (1, 4, 8).
// Protagonist: Shanti Bhavan Educational Trust travels the whole film —
// found in slide 2, pooled in 4, survives the cull in 5, rated 5 in 6,
// AI-checked in 7, crowned in 8. Kalkeri Sangeet Vidyalaya is the
// human-lead counterpart. The funnel number (37,930 → 496) is the
// centerpiece of slide 4. Slide 8 ends with "Like this." — answering
// slide 1's question — then loops back into black.
// All motion lives in the story-v85 CSS block appended to globals.css.

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

type StorySlide = {
  eyebrow: string;
  title: string;
  body?: string;
  layout: 'full' | 'split';
  visual:
    | 'question'
    | 'internetDiscovery'
    | 'humanLeads'
    | 'poolMerge'
    | 'curation'
    | 'review'
    | 'ai'
    | 'finalShortlist';
};

const slides: StorySlide[] = [
  {
    eyebrow: '',
    title: 'How do we find the best NGOs in a region?',
    layout: 'full',
    visual: 'question'
  },
  {
    eyebrow: 'Part 1',
    title: 'Search the internet.',
    body: 'There are two ways to find NGOs. The first: the website searches child-focused educational models across a region, or scans bulk NGO names automatically.',
    layout: 'split',
    visual: 'internetDiscovery'
  },
  {
    eyebrow: 'Part 2',
    title: 'Ask the people who know the ground.',
    body: 'The second: human leads. Added with the NGO name, contact number, and referrer — into the exact same flow.',
    layout: 'split',
    visual: 'humanLeads'
  },
  {
    eyebrow: 'Collective pool',
    title: 'Everything enters one Lead Pool.',
    layout: 'full',
    visual: 'poolMerge'
  },
  {
    eyebrow: 'DFP team curation',
    title: 'Non-relevant leads are removed first.',
    body: 'The DFP team manually checks the collective pool and sends forward only the leads worth ranking.',
    layout: 'split',
    visual: 'curation'
  },
  {
    eyebrow: 'DFP team review',
    title: 'The DFP team reviews one NGO at a time.',
    body: 'Each reviewer opens one NGO, uses the rating slider, writes the reason, and submits the review.',
    layout: 'split',
    visual: 'review'
  },
  {
    eyebrow: 'AI review check',
    title: 'AI checks the review quality.',
    body: 'AI only gives suggestions on whether the reviewer has fully explained the ranking. The reviewer stays in control.',
    layout: 'split',
    visual: 'ai'
  },
  {
    eyebrow: 'Final shortlist',
    title: 'The strongest NGOs move into final review.',
    layout: 'full',
    visual: 'finalShortlist'
  }
];

// v85 durations — every slide performs its beats, then rests.
const DEFAULT_AUTO_MS = 3200;
const SLIDE_DURATIONS_MS: Record<StorySlide['visual'], number> = {
  question: 3400,
  internetDiscovery: 7200,
  humanLeads: 6200,
  poolMerge: 7800,
  curation: 7200,
  review: 6800,
  ai: 6400,
  finalShortlist: 10000
};

/* ------------------------------------------------------------------ */
/* Funnel counter: 0 → 37,930 "NGOs scanned", collapse → 496          */
/* "shortlisted for ranking". Pause-aware via elapsed accumulation.   */
/* ------------------------------------------------------------------ */
const SCANNED = 37930;
const SHORTLISTED = 496;
const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);
const easeInCubic = (p: number) => p * p * p;

function FunnelCounter({ paused }: { paused: boolean }) {
  const [value, setValue] = useState(0);
  const [phase, setPhase] = useState<'scan' | 'shortlist'>('scan');
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(SHORTLISTED);
      setPhase('shortlist');
      return;
    }
    let raf = 0;
    let last = performance.now();
    let t = 0; // accumulated unpaused ms since slide mount
    const tick = (now: number) => {
      if (!pausedRef.current) t += now - last;
      last = now;
      if (t < 2600) {
        setValue(0);
      } else if (t < 3900) {
        setValue(Math.round(SCANNED * easeOutCubic((t - 2600) / 1300)));
      } else if (t < 4800) {
        setValue(SCANNED);
      } else if (t < 5900) {
        setPhase('shortlist');
        setValue(Math.round(SCANNED - (SCANNED - SHORTLISTED) * easeInCubic((t - 4800) / 1100)));
      } else {
        setValue(SHORTLISTED);
        return; // timeline complete
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="sv-funnel" data-phase={phase}>
      <b className="sv-count">{value.toLocaleString('en-IN')}</b>
      <span className="sv-count-label">{phase === 'scan' ? 'NGOs scanned' : 'shortlisted for ranking'}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Visuals                                                            */
/* ------------------------------------------------------------------ */
function StoryVisual({ visual, paused }: { visual: StorySlide['visual']; paused: boolean }) {
  if (visual === 'question') return null;

  if (visual === 'internetDiscovery') {
    return (
      <div className="story-internet-visual sv-stage">
        <div className="story-internet-card primary">
          <div className="story-mini-label">General Search</div>
          <h3>Find educational models</h3>
          <p>Search for NGOs across child-focused educational models.</p>
          <div className="story-model-grid story-model-grid-red">
            <span>Residential schools</span>
            <span>Children’s homes</span>
            <span>Tribal hostels</span>
            <span>Special schools</span>
            <span>Alternative education</span>
            <span>Sports / arts programs</span>
          </div>
          {/* the protagonist enters the film */}
          <div className="sv-result">
            <i />
            <em>Result found</em>
            <b>Shanti Bhavan Educational Trust</b>
          </div>
        </div>
        <div className="story-internet-card secondary">
          <div className="story-mini-label">Bulk Search</div>
          <h3>Scan NGO names</h3>
          <p>Upload NGO names. The website checks evidence, child focus, and relevance automatically.</p>
          <div className="story-bulk-mini">
            <span>NGO list.csv</span>
            <i />
            <strong>Selected leads</strong>
          </div>
        </div>
        <span className="sv-cursor sv-cursor-net" aria-hidden="true" />
      </div>
    );
  }

  if (visual === 'humanLeads') {
    return (
      <div className="story-human-clean sv-stage">
        <div className="story-referral-form">
          <b>Human lead</b>
          <span>NGO name</span>
          <span>Contact number</span>
          <span>Referred by</span>
        </div>
        <div className="story-arrow-red">→</div>
        <div className="story-referral-form selected">
          <b>Ready to add</b>
          <span className="sv-lead-name">Kalkeri Sangeet Vidyalaya</span>
          <span>Contact preserved</span>
          <span>Referrer preserved</span>
        </div>
      </div>
    );
  }

  if (visual === 'poolMerge') {
    return (
      <div className="sv-pool-stage sv-stage">
        <div className="sv-pool-row">
          <div className="story-source-block red">
            Internet leads
            <i className="sv-chip sv-chip-left">Shanti Bhavan Educational Trust</i>
          </div>
          <div className="story-pool-core">Collective Lead Pool</div>
          <div className="story-source-block white">
            Human leads
            <i className="sv-chip sv-chip-right">Kalkeri Sangeet Vidyalaya</i>
          </div>
        </div>
        <FunnelCounter paused={paused} />
      </div>
    );
  }

  if (visual === 'curation') {
    return (
      <div className="story-curation-clean sv-stage">
        <div className="story-curation-column">
          <b>Collective pool</b>
          <span className="sv-hero">Shanti Bhavan Educational Trust</span>
          <span>Kalkeri Sangeet Vidyalaya</span>
          <span className="remove">Generic welfare society</span>
          <span className="remove">Duplicate lead</span>
        </div>
        <div className="story-curation-column center">
          <b>DFP team check</b>
          <span>Useful lead</span>
          <span>Region match</span>
          <span className="remove">Remove non-relevant</span>
        </div>
        <div className="story-curation-column result">
          <b>Send forward</b>
          <span>Shanti Bhavan Educational Trust</span>
        </div>
      </div>
    );
  }

  if (visual === 'review') {
    return (
      <div className="story-review-visual story-review-clean sv-stage">
        <div className="story-review-top"><span>One NGO at a time</span><button>Next →</button></div>
        <h3>Shanti Bhavan Educational Trust</h3>
        <p>Residential education model with a long-term pathway.</p>
        <label>Rating</label>
        <div className="story-slider story-slider-red"><i /><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>
        <label>Reason</label>
        <div className="story-response">Strong child focus and clear transformation potential.</div>
        <span className="sv-cursor sv-cursor-review" aria-hidden="true" />
      </div>
    );
  }

  if (visual === 'ai') {
    return (
      <div className="story-ai-clean sv-stage">
        <b>AI suggestion</b>
        <p>The rating is clear, but the reasoning can explain the long-term impact more fully.</p>
        <div className="story-suggestion-neutral">Keep: clear child-focus explanation</div>
        <div className="story-suggestion-red">Improve: explain why this rating is justified</div>
        <button>Edit response</button>
        <span className="sv-cursor sv-cursor-ai" aria-hidden="true" />
      </div>
    );
  }

  // finalShortlist — Phase A: reviews collect. Phase B: they sort into
  // tiers, bottom-up. Phase C: coronation, then "Like this."
  return (
    <div className="sv-final-stage sv-stage">
      <div className="sv-final-rows">
        <div><b>Rating 5</b><span>Shanti Bhavan</span><em>Clear transformation pathway.</em></div>
        <div><b>Rating 4</b><span>Kalkeri Sangeet Vidyalaya</span><em>Strong child-development model.</em></div>
        <div><b>Rating 4</b><span>Parikrma Humanity Foundation</span><em>Strong education pathway.</em></div>
      </div>
      <div className="sv-final-tiers">
        <div className="story-final-tier high">
          <b>Highest Transformation Potential</b>
          <span>Institutions most capable of changing long-term life outcomes.</span>
          <i className="sv-crowned-name">Shanti Bhavan Educational Trust</i>
        </div>
        <div className="story-final-tier">
          <b>Great NGOs</b>
          <span>Strong organisations worth moving forward.</span>
        </div>
        <div className="story-final-tier quiet">
          <b>Worth a Closer Look</b>
          <span>Promising leads that need more context.</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */
export default function HowItWorksPage() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const active = slides[index];
  const slideDuration = SLIDE_DURATIONS_MS[active.visual] ?? DEFAULT_AUTO_MS;

  const progressFrom = useMemo(() => (index / slides.length) * 100, [index]);
  const progressTo = useMemo(() => ((index + 1) / slides.length) * 100, [index]);

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, slideDuration);
    return () => window.clearTimeout(timer);
  }, [index, paused, slideDuration]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') setIndex((current) => (current + 1) % slides.length);
      if (event.key === 'ArrowLeft') setIndex((current) => (current - 1 + slides.length) % slides.length);
      if (event.key === ' ') {
        event.preventDefault();
        setPaused((current) => !current);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const isQuestion = active.visual === 'question';
  const isFinal = active.visual === 'finalShortlist';

  const mainClass = [
    'story-page',
    'story-v72',
    'story-v85',
    isQuestion ? 'story-page-question' : '',
    active.visual === 'curation' ? 'sv-visual-first' : ''
  ].filter(Boolean).join(' ');

  return (
    <main className={mainClass} data-visual={active.visual} data-autoplay={paused ? 'paused' : 'playing'}>
      {/* Ambient "leads" layer. The particle count shrinks as the film
          progresses — the funnel, physically encoded. (CSS-driven.) */}
      <div className="sv-ambient" aria-hidden="true">
        <span className="sv-p" /><span className="sv-p" /><span className="sv-p" />
        <span className="sv-p" /><span className="sv-p" /><span className="sv-p" />
      </div>

      <div className="story-progress">
        <i
          key={index}
          style={{
            ['--sv-from' as string]: `${progressFrom}%`,
            ['--sv-to' as string]: `${progressTo}%`,
            animationDuration: `${slideDuration}ms`,
            animationPlayState: paused ? 'paused' : 'running'
          } as React.CSSProperties}
        />
      </div>

      <header className="story-shell-header">
        <Link href="/" className="story-back">← Back</Link>
        <div className="story-count story-autoplay-status">{String(index + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')} · {paused ? 'Paused' : 'Auto-playing'}</div>
        <button type="button" className="story-pause" onClick={() => setPaused((current) => !current)}>{paused ? 'Resume' : 'Pause'}</button>
      </header>

      <section
        className={active.layout === 'full' ? 'story-slide sv-full' : 'story-slide'}
        key={active.title + index}
        data-autoplay={paused ? 'paused' : 'playing'}
      >
        <article className="story-copy">
          {active.eyebrow ? <p className="story-eyebrow">{active.eyebrow}</p> : null}
          {isQuestion ? (
            <h1>
              {active.title.split(' ').map((word, wordIndex) => (
                <span
                  key={word + wordIndex}
                  className="sv-word"
                  style={{ animationDelay: `${0.3 + wordIndex * 0.09}s` }}
                >
                  {word}
                </span>
              ))}
            </h1>
          ) : (
            <h1>{active.title}</h1>
          )}
          {active.body ? <p>{active.body}</p> : null}
        </article>
        <div className="story-visual-wrap">
          <StoryVisual visual={active.visual} paused={paused} />
        </div>

        {/* The ending: the question from slide 1, answered. */}
        {isFinal ? (
          <div className="sv-ending" aria-hidden="true">
            <span>Like this.</span>
          </div>
        ) : null}
      </section>

      <footer className="story-footer">
        <button type="button" onClick={() => setIndex((current) => (current - 1 + slides.length) % slides.length)}>← Previous</button>
        <div className="story-dots" aria-label="Story slides">
          {slides.map((slide, slideIndex) => (
            <button
              key={slide.title}
              type="button"
              aria-label={`Go to slide ${slideIndex + 1}`}
              className={slideIndex === index ? 'active' : slideIndex < index ? 'done' : ''}
              onClick={() => setIndex(slideIndex)}
            />
          ))}
        </div>
        <button type="button" onClick={() => setIndex((current) => (current + 1) % slides.length)}>Next →</button>
      </footer>
    </main>
  );
}
