'use client';

// DFP 2.0 — "How it works" v86: THE CONTINUOUS FILM.
// Drop-in replacement for app/how-it-works/page.tsx.
//
// Architecture (per the Fable brief):
//   - Persistent 30% left rail: the question + a vertical editorial
//     timeline of 5 steps. Never cuts, never transforms.
//   - 70% right stage: ONE continuous movie. No slide remounts.
//     A single pause-aware master clock (rAF) drives everything.
//     The same lead particles travel the whole funnel: emitted from
//     two streams → compressed (40,000+ → 497) → through the human
//     gate → rated → ranked. Copy is the original deck's copy.
//   - Clicking a rail step scrubs the film to that act.
//
// Companion CSS: story-v86.css (self-contained, .svf- namespace).
// It does NOT depend on story-v72.

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
/* Timeline                                                           */
/* ------------------------------------------------------------------ */
const TOTAL_MS = 47500;

const PHASES = [
  { id: 'intro', at: 0 },
  { id: 'sources', at: 3500 },
  { id: 'compress', at: 11000 },
  { id: 'cleanup', at: 18000 },
  { id: 'rating', at: 25500 },
  { id: 'ranking', at: 34500 },
  { id: 'ending', at: 42500 }
] as const;

type PhaseId = (typeof PHASES)[number]['id'];

function phaseIndexAt(t: number): number {
  let idx = 0;
  for (let i = 0; i < PHASES.length; i++) if (t >= PHASES[i].at) idx = i;
  return idx;
}

/* Rail steps — the original deck's copy, mapped onto the 5 acts. */
const STEPS: { title: string; body: string; phase: number }[] = [
  {
    title: 'There are two ways to do this.',
    body: 'This website can do both: search the internet and add human leads into the same shortlisting flow.',
    phase: 1
  },
  {
    title: 'Everything enters one Lead Pool.',
    body: 'Internet leads and human leads come together in the same collective pool before anything is sent for ranking.',
    phase: 2
  },
  {
    title: 'Non-relevant leads are removed first.',
    body: 'The DFP team manually checks the collective pool and sends forward only the leads that look useful enough for ranking.',
    phase: 3
  },
  {
    title: 'The DFP team reviews one NGO at a time.',
    body: 'Each reviewer opens one NGO, uses the rating slider, writes the reason, and submits the review.',
    phase: 4
  },
  {
    title: 'The strongest NGOs move into final review.',
    body: 'The DFP team reviews the combined output and sorts the strongest organisations into clear final shortlist tiers.',
    phase: 5
  }
];

/* ------------------------------------------------------------------ */
/* Numbers (per accuracy notes: 40,000+ names → 497 usable leads)     */
/* ------------------------------------------------------------------ */
const UNIVERSE = 40000;
const USABLE = 497;
const easeOutCubic = (p: number) => 1 - Math.pow(1 - Math.min(Math.max(p, 0), 1), 3);
const easeInCubic = (p: number) => { const q = Math.min(Math.max(p, 0), 1); return q * q * q; };

/* ------------------------------------------------------------------ */
/* Lead particles — deterministic (SSR-safe), the persistent objects  */
/* that travel the whole film.                                        */
/* ------------------------------------------------------------------ */
type Particle = { id: number; r: [number, number, number, number]; side: 0 | 1; survivor: boolean; delay: number };

const PARTICLES: Particle[] = Array.from({ length: 56 }, (_, i) => {
  const h = (n: number) => { const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
  return { id: i, r: [h(1), h(2), h(3), h(4)], side: (i % 2) as 0 | 1, survivor: i < 12, delay: (i % 14) * 0.09 };
});

function particlePos(p: Particle, phaseIdx: number) {
  const [a, b, c, d] = p.r;
  // intro: staged just off-screen at their source stream
  if (phaseIdx <= 0) return { x: p.side ? 104 : -4, y: 6 + a * 10, o: 0, s: 1 };
  // sources: emitted into a wide crowded cloud — the scale is the point
  if (phaseIdx === 1) return { x: 16 + a * 68, y: 14 + b * 34, o: 0.45 + c * 0.5, s: 0.8 + d * 0.6 };
  // compress: survivors converge into the pool; the rest fall away
  if (phaseIdx === 2) {
    return p.survivor
      ? { x: 44 + a * 12, y: 52 + b * 10, o: 0.95, s: 1 }
      : { x: 16 + a * 68 + (c - 0.5) * 24, y: 118, o: 0, s: 0.6 };
  }
  // cleanup: survivors dim into the background — the cards take over
  if (phaseIdx === 3) return p.survivor ? { x: 13 + a * 12, y: 74 + b * 8, o: 0.2, s: 0.7 } : { x: 50, y: 118, o: 0, s: 0.4 };
  // rating onwards: hand-off complete
  return { x: 13 + a * 12, y: 78, o: 0, s: 0.5 };
}

/* ------------------------------------------------------------------ */
/* Master clock — pause-aware, loop-aware, scrub-aware                */
/* ------------------------------------------------------------------ */
function useFilmClock(paused: boolean, reduced: boolean) {
  const [t, setT] = useState(0);
  const [cycle, setCycle] = useState(0);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const tRef = useRef(0);

  useEffect(() => {
    if (reduced) { tRef.current = 40000; setT(40000); return; }
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      if (!pausedRef.current) {
        tRef.current += now - last;
        if (tRef.current > TOTAL_MS) { tRef.current = 0; setCycle((c) => c + 1); }
        setT(tRef.current);
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const scrub = (ms: number) => {
    tRef.current = ms;
    setT(ms);
    setCycle((c) => c + 1); // remount stage so act choreography starts clean
  };

  return { t, cycle, scrub };
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */
export default function HowItWorksPage() {
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
  }, []);

  const { t, cycle, scrub } = useFilmClock(paused, reduced);
  const phaseIdx = phaseIndexAt(t);
  const phase: PhaseId = PHASES[phaseIdx].id;
  const progress = Math.min(t / TOTAL_MS, 1);

  /* -------- keyboard: ←/→ jump acts, space pauses -------- */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') scrub(PHASES[Math.min(phaseIdx + 1, PHASES.length - 1)].at + 1);
      if (event.key === 'ArrowLeft') scrub(PHASES[Math.max(phaseIdx - 1, 0)].at + 1);
      if (event.key === ' ') { event.preventDefault(); setPaused((c) => !c); }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phaseIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  /* -------- the counter: the two numbers that matter -------- */
  // grow: 0 → 40,000+ during sources · collapse: → 497 during compress ·
  // then it docks top-right and stays for the rest of the film.
  let counterState: 'hidden' | 'grow' | 'peak' | 'collapse' | 'landed' | 'docked' = 'hidden';
  let counterValue = 0;
  let counterLabel = 'names';
  if (t < 4500) {
    counterState = 'hidden';
  } else if (t < 10500) {
    counterState = 'grow';
    counterValue = Math.round(UNIVERSE * easeOutCubic((t - 4500) / 6000));
  } else if (t < 12500) {
    counterState = 'peak';
    counterValue = UNIVERSE;
  } else if (t < 16000) {
    counterState = 'collapse';
    counterLabel = 'usable leads';
    counterValue = Math.round(UNIVERSE - (UNIVERSE - USABLE) * easeInCubic((t - 12500) / 3500));
  } else if (t < 18500) {
    counterState = 'landed';
    counterLabel = 'usable leads';
    counterValue = USABLE;
  } else {
    counterState = 'docked';
    counterLabel = 'usable leads';
    counterValue = USABLE;
  }
  const counterText =
    (counterState === 'peak' || (counterState === 'grow' && counterValue >= UNIVERSE))
      ? '40,000+'
      : counterValue.toLocaleString('en-IN');

  const particles = useMemo(() => PARTICLES, []);

  return (
    <main
      className="svf-film"
      data-phase={phase}
      data-paused={paused ? 'true' : 'false'}
      data-reduced={reduced ? 'true' : 'false'}
    >
      {/* ============ PERSISTENT LEFT RAIL (~30%) ============ */}
      <aside className="svf-rail">
        <Link href="/" className="svf-back">← Back</Link>
        <h1 className="svf-question">How do we find the best NGOs in a region?</h1>

        <div className="svf-steps-wrap">
          <div className="svf-thread"><i style={{ height: `${progress * 100}%` }} /></div>
          <ol className="svf-steps">
            {STEPS.map((step, i) => {
              const state = phaseIdx > step.phase ? 'done' : phaseIdx === step.phase ? 'active' : 'future';
              return (
                <li key={step.title} className={`svf-step ${state}`}>
                  <button type="button" onClick={() => scrub(PHASES[step.phase].at + 1)}>
                    <i className="svf-marker" />
                    <span className="svf-stepnum">{String(i + 1).padStart(2, '0')}</span>
                    <span className="svf-steptext">
                      <b>{step.title}</b>
                      <p>{step.body}</p>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="svf-controls">
          <button type="button" onClick={() => setPaused((c) => !c)}>{paused ? 'Resume' : 'Pause'}</button>
          <button type="button" onClick={() => scrub(0)}>Restart</button>
        </div>
      </aside>

      <div className="svf-divider" aria-hidden="true" />

      {/* ============ CONTINUOUS MOVIE STAGE (~70%) ============ */}
      <section className="svf-stage" key={cycle} data-phase={phase} aria-hidden="true">
        {/* the two source streams */}
        <div className="svf-stream svf-stream-left"><b>Internet leads</b></div>
        <div className="svf-stream svf-stream-right"><b>Human leads</b></div>

        {/* the persistent lead particles */}
        <div className="svf-particles">
          {particles.map((p) => {
            const pos = particlePos(p, phaseIdx);
            return (
              <span
                key={p.id}
                className={p.survivor ? 'svf-p svf-p-survivor' : 'svf-p'}
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  opacity: pos.o,
                  transform: `scale(${pos.s})`,
                  transitionDelay: `${p.delay}s`
                }}
              />
            );
          })}
        </div>

        {/* the pool that the survivors converge into */}
        <div className="svf-pool"><span>Collective Lead Pool</span></div>

        {/* THE NUMBER — 40,000+ grows, collapses to 497, then docks */}
        <div className={`svf-counter svf-counter-${counterState}`}>
          <b>{counterText}</b>
          <span>{counterLabel}</span>
        </div>

        {/* the human gate */}
        <div className="svf-gate"><span>DFP team check</span></div>

        {/* the cards — the survivors become identifiable */}
        <div className="svf-cards">
          <div className="svf-card svf-hero">
            <b>Shanti Bhavan Educational Trust</b>
            <div className="svf-review">
              <p>Residential education model with a long-term pathway.</p>
              <label>Rating</label>
              <div className="svf-scale"><i /><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>
              <label>Reason</label>
              <div className="svf-reason">Strong child focus and clear transformation potential.</div>
            </div>
          </div>
          <div className="svf-card svf-c2"><b>Kalkeri Sangeet Vidyalaya</b></div>
          <div className="svf-card svf-c3"><b>Parikrma Humanity Foundation</b></div>
          <div className="svf-card svf-reject svf-r1"><b>Generic welfare society</b></div>
          <div className="svf-card svf-reject svf-r2"><b>Duplicate lead</b></div>
        </div>

        {/* the final hierarchy */}
        <div className="svf-tiers">
          <div className="svf-tier svf-tier-high">
            <b>Highest Transformation Potential</b>
            <span>Institutions most capable of changing long-term life outcomes.</span>
            <i className="svf-tier-chip svf-crowned">Shanti Bhavan Educational Trust</i>
          </div>
          <div className="svf-tier">
            <b>Great NGOs</b>
            <span>Strong organisations worth moving forward.</span>
            <i className="svf-tier-chip">Kalkeri Sangeet Vidyalaya</i>
            <i className="svf-tier-chip">Parikrma Humanity Foundation</i>
          </div>
          <div className="svf-tier svf-tier-quiet">
            <b>Worth a Closer Look</b>
            <span>Promising leads that need more context.</span>
          </div>
        </div>

        {/* the answer to the question */}
        <div className="svf-ending"><span>Like this.</span></div>
      </section>
    </main>
  );
}
