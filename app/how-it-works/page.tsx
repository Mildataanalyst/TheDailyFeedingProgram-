'use client';

// DFP 2.0 — "How it works" v87: THE CINEMATIC FILM.
// Drop-in replacement for app/how-it-works/page.tsx.
// Companion CSS: story-v87.css (self-contained, .svfa- namespace).
//
// The opening (as conceptualised):
//   Total black → the question → two red lines ("You search the
//   internet." / "Or you ask someone who knows.") → the overlay
//   dissolves and those two ways become the persistent left rail.
//
// The film (one master clock, no hard cuts — acts crossfade):
//   search (chips + NGO Darpan bulk scan, particles emitting)
//   → pool (everything converges · counter climbs to 46,000+)
//   → filter (automatic: the number collapses to 497, turns red, docks)
//   → curation (manual: the DFP team gate — kills + the survivor)
//   → shortlist (rating: knob drags 1→5, reason types · then ranking:
//     tiers build bottom-up, Shanti Bhavan is crowned)
//   → ending ("Like this." → loops back to black)
//
// Every act is a composed centre-stage scene (no orphaned elements).
// Rail steps scrub the film. ←/→ jump acts. Space pauses everything.

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
/* THE TWO NUMBERS — change here if the real counts move              */
/* ------------------------------------------------------------------ */
const UNIVERSE = 46000; // displayed as "46,000+"
const USABLE = 497;

/* ------------------------------------------------------------------ */
/* Timeline                                                           */
/* ------------------------------------------------------------------ */
const TOTAL_MS = 51000;

const PHASES = [
  { id: 'intro', at: 0 },
  { id: 'search', at: 6000 },
  { id: 'pool', at: 13500 },
  { id: 'filter', at: 20000 },
  { id: 'curation', at: 26500 },
  { id: 'shortlist', at: 33500 },
  { id: 'ending', at: 47500 }
] as const;

type PhaseId = (typeof PHASES)[number]['id'];

function phaseIndexAt(t: number): number {
  let idx = 0;
  for (let i = 0; i < PHASES.length; i++) if (t >= PHASES[i].at) idx = i;
  return idx;
}

/* Rail steps — his copy, his voice. Each scrubs to its act. */
const STEPS: { title: string; body: string; phase: number }[] = [
  {
    title: 'There are two ways to do this.',
    body: 'Search the internet across educational models, or add human leads from people who know the ground — into the same flow.',
    phase: 1
  },
  {
    title: 'Everything enters one Lead Pool.',
    body: 'Internet leads and human leads come together in the same collective pool before anything is sent for ranking.',
    phase: 2
  },
  {
    title: 'The engine narrows it down.',
    body: 'Automatic filtering removes duplicates, mismatches, and weak leads — 46,000+ names become 497 usable leads.',
    phase: 3
  },
  {
    title: 'Non-relevant leads are removed first.',
    body: 'The DFP team manually checks the 497 and sends forward only the leads that look useful enough for ranking.',
    phase: 4
  },
  {
    title: 'The strongest NGOs move into final review.',
    body: 'Each NGO is rated 1 to 5 with a reason, and the strongest organisations rise into clear final shortlist tiers.',
    phase: 5
  }
];

const easeOutCubic = (p: number) => 1 - Math.pow(1 - Math.min(Math.max(p, 0), 1), 3);
const easeInCubic = (p: number) => { const q = Math.min(Math.max(p, 0), 1); return q * q * q; };

/* ------------------------------------------------------------------ */
/* Lead particles — the continuity thread across acts                 */
/* ------------------------------------------------------------------ */
type Particle = { id: number; r: [number, number, number, number]; survivor: boolean; delay: number };

const PARTICLES: Particle[] = Array.from({ length: 48 }, (_, i) => {
  const h = (n: number) => { const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
  return { id: i, r: [h(1), h(2), h(3), h(4)], survivor: i < 10, delay: (i % 12) * 0.1 };
});

function particlePos(p: Particle, phaseIdx: number) {
  const [a, b, c, d] = p.r;
  if (phaseIdx <= 0) return { x: a > 0.5 ? 106 : -6, y: 8 + b * 12, o: 0, s: 1 };
  // search: emitted into a wide upper cloud — the universe forming
  if (phaseIdx === 1) return { x: 12 + a * 76, y: 10 + b * 26, o: 0.35 + c * 0.45, s: 0.7 + d * 0.6 };
  // pool: everything converges toward the centre
  if (phaseIdx === 2) return { x: 40 + a * 20, y: 46 + b * 18, o: 0.85, s: 0.9 + d * 0.3 };
  // filter: survivors tighten; the rest fall out of frame
  if (phaseIdx === 3) {
    return p.survivor
      ? { x: 46 + a * 8, y: 52 + b * 8, o: 0.95, s: 1 }
      : { x: 40 + a * 20 + (c - 0.5) * 30, y: 120, o: 0, s: 0.5 };
  }
  // curation onwards: hand-off to the composed scenes
  return { x: 46 + a * 8, y: 55, o: 0, s: 0.6 };
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
    if (reduced) { tRef.current = 41000; setT(41000); return; }
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

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') scrub(PHASES[Math.min(phaseIdx + 1, PHASES.length - 1)].at + 1);
      if (event.key === 'ArrowLeft') scrub(PHASES[Math.max(phaseIdx - 1, 0)].at + 1);
      if (event.key === ' ') { event.preventDefault(); setPaused((c) => !c); }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phaseIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  /* -------- the counter: 46,000+ climbs, collapses to 497 -------- */
  let counterState: 'hidden' | 'grow' | 'peak' | 'collapse' | 'landed' | 'docked' = 'hidden';
  let counterValue = 0;
  let counterLabel = 'names in the pool';
  if (t < 13800) {
    counterState = 'hidden';
  } else if (t < 16400) {
    counterState = 'grow';
    counterValue = Math.round(UNIVERSE * easeOutCubic((t - 13800) / 2600));
  } else if (t < 20600) {
    counterState = 'peak';
    counterValue = UNIVERSE;
  } else if (t < 24200) {
    counterState = 'collapse';
    counterLabel = 'usable leads';
    counterValue = Math.round(UNIVERSE - (UNIVERSE - USABLE) * easeInCubic((t - 20600) / 3600));
  } else if (t < 26400) {
    counterState = 'landed';
    counterLabel = 'usable leads';
    counterValue = USABLE;
  } else {
    counterState = 'docked';
    counterLabel = 'usable leads';
    counterValue = USABLE;
  }
  const counterText =
    counterState === 'peak' || (counterState === 'grow' && counterValue >= UNIVERSE)
      ? '46,000+'
      : counterValue.toLocaleString('en-IN');

  const particles = useMemo(() => PARTICLES, []);

  return (
    <main
      className="svfa-film"
      data-phase={phase}
      data-paused={paused ? 'true' : 'false'}
      data-reduced={reduced ? 'true' : 'false'}
    >
      {/* ================= PERSISTENT LEFT RAIL ================= */}
      <aside className="svfa-rail">
        <Link href="/" className="svfa-back">← Back</Link>
        <h1 className="svfa-question">How do we find the best NGOs in a region?</h1>

        <div className="svfa-steps-wrap">
          <div className="svfa-thread"><i style={{ height: `${progress * 100}%` }} /></div>
          <ol className="svfa-steps">
            {STEPS.map((step, i) => {
              const state = phaseIdx > step.phase ? 'done' : phaseIdx === step.phase ? 'active' : 'future';
              return (
                <li key={step.title} className={`svfa-step ${state}`}>
                  <button type="button" onClick={() => scrub(PHASES[step.phase].at + 1)}>
                    <span className="svfa-dot" />
                    <span className="svfa-steptext">
                      <em>{String(i + 1).padStart(2, '0')}</em>
                      <b>{step.title}</b>
                      <p>{step.body}</p>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="svfa-controls">
          <button type="button" onClick={() => setPaused((c) => !c)}>{paused ? 'Resume' : 'Pause'}</button>
          <button type="button" onClick={() => scrub(0)}>Restart</button>
        </div>
      </aside>

      <div className="svfa-divider" aria-hidden="true" />

      {/* ================= THE STAGE — one continuous film ================= */}
      <section className="svfa-stage" key={cycle} data-phase={phase} aria-hidden="true">

        {/* the persistent lead particles */}
        <div className="svfa-particles">
          {particles.map((p) => {
            const pos = particlePos(p, phaseIdx);
            return (
              <span
                key={p.id}
                className={p.survivor ? 'svfa-p svfa-p-survivor' : 'svfa-p'}
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

        {/* THE NUMBER — climbs to 46,000+, collapses to 497, docks */}
        <div className={`svfa-counter svfa-counter-${counterState}`}>
          <b>{counterText}</b>
          <span>{counterLabel}</span>
        </div>

        {/* ---- ACT: search — the two ways, performed ---- */}
        <div className="svfa-act svfa-act-search">
          <div className="svfa-search-card svfa-general">
            <em>General Search</em>
            <h3>Find educational models</h3>
            <div className="svfa-chips">
              <span>Residential schools</span>
              <span>Children’s homes</span>
              <span>Tribal hostels</span>
              <span>Special schools</span>
              <span>Alternative education</span>
              <span>Sports / arts programs</span>
            </div>
          </div>
          <div className="svfa-search-card svfa-bulk">
            <em>Bulk Search</em>
            <h3>Scan NGO names</h3>
            <div className="svfa-pipeline">
              <span>NGO Darpan · 46,000+ names</span>
              <i />
              <strong>Selected leads</strong>
            </div>
            <div className="svfa-human"><i /><span>+ Human referrals</span></div>
          </div>
        </div>

        {/* ---- ACT: pool — everything converges ---- */}
        <div className="svfa-act svfa-act-pool">
          <div className="svfa-source svfa-source-net">Internet leads</div>
          <div className="svfa-pool-core">Collective Lead Pool</div>
          <div className="svfa-source svfa-source-hum">Human leads</div>
        </div>

        {/* ---- ACT: filter — the automatic gate (the number is the scene) ---- */}
        <div className="svfa-act svfa-act-filter">
          <div className="svfa-filter-bar"><span>Discovery engine filter</span></div>
        </div>

        {/* ---- ACT: curation — the human gate ---- */}
        <div className="svfa-act svfa-act-curation">
          <div className="svfa-col">
            <b>Collective pool</b>
            <span className="svfa-hero-row">Shanti Bhavan Educational Trust</span>
            <span>Kalkeri Sangeet Vidyalaya</span>
            <span className="svfa-kill svfa-k1">Generic welfare society</span>
            <span className="svfa-kill svfa-k2">Duplicate lead</span>
          </div>
          <div className="svfa-col svfa-col-mid">
            <b>DFP team check</b>
            <span>Useful lead</span>
            <span>Region match</span>
            <span className="svfa-mid-red">Remove non-relevant</span>
          </div>
          <div className="svfa-col svfa-col-out">
            <b>Send forward</b>
            <span className="svfa-approved">Shanti Bhavan Educational Trust</span>
          </div>
        </div>

        {/* ---- ACT: shortlist — rating, then ranking ---- */}
        <div className="svfa-act svfa-act-shortlist">
          <div className="svfa-review-card">
            <div className="svfa-review-top"><span>One NGO at a time</span></div>
            <h3>Shanti Bhavan Educational Trust</h3>
            <p>Residential education model with a long-term pathway.</p>
            <label>Rating</label>
            <div className="svfa-scale">
              <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
              <b className="svfa-fill" />
              <i className="svfa-knob" />
            </div>
            <label>Reason</label>
            <div className="svfa-reason">Strong child focus and clear transformation potential.</div>
          </div>

          <div className="svfa-tiers">
            <div className="svfa-tier svfa-tier-high">
              <b>Highest Transformation Potential</b>
              <span>Institutions most capable of changing long-term life outcomes.</span>
              <i className="svfa-tchip svfa-crowned">Shanti Bhavan Educational Trust</i>
            </div>
            <div className="svfa-tier">
              <b>Great NGOs</b>
              <span>Strong organisations worth moving forward.</span>
              <i className="svfa-tchip">Kalkeri Sangeet Vidyalaya</i>
              <i className="svfa-tchip">Parikrma Humanity Foundation</i>
            </div>
            <div className="svfa-tier svfa-tier-quiet">
              <b>Worth a Closer Look</b>
              <span>Promising leads that need more context.</span>
            </div>
          </div>
        </div>

        {/* ---- the answer ---- */}
        <div className="svfa-endcard"><span>Like this.</span></div>
      </section>

      {/* ================= THE COLD OPEN (covers everything) ================= */}
      <div className="svfa-intro" aria-hidden="true">
        <h2>
          {'How do we find the best NGOs in a region?'.split(' ').map((word, i) => (
            <span key={word + i} style={{ animationDelay: `${0.4 + i * 0.09}s` }}>{word}</span>
          ))}
        </h2>
        <p className="svfa-way svfa-way-1">You search the internet.</p>
        <p className="svfa-way svfa-way-2">Or you ask someone who knows.</p>
      </div>
    </main>
  );
}
