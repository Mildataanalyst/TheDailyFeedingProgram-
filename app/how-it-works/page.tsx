'use client';

// DFP 2.0 — "How it works" v88: THE LOCKED TREATMENT.
// Drop-in replacement for app/how-it-works/page.tsx.
// Companion CSS: story-v88.css (self-contained, .svfb- namespace).
//
// Implements the locked cinematic treatment second-by-second:
//   0:00 Question (phrase by phrase, HOLD 1)
//   0:05 Two answers — the screen divides
//   0:08 General Search (terms run · fragments accumulate · 5,000+)
//   0:13 NGO Darpan Bulk Scan (funnel · gates · 46,000+ → 497, HOLD 2)
//   0:20 Human knowledge (real referral form → compact Human Lead cards)
//   0:25 The merger — One Lead Pool
//   0:29 DFP Team Clean-up (binary, human, operational)
//   0:36 Rating engine + AI explanation check (Rachit · score LOCKED)
//   0:46 Fast rating montage
//   0:49 The strongest NGOs rise (no crowns, no podiums)
//   0:53 Return to the question → "Like this." (HOLD 3) → loop
//
// Rules honoured: no navigation rail, no hard cuts (acts dissolve),
// cards persist, AI never touches the score, red = emphasis only,
// split screen exists only while the two systems are separate.

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

/* ------------------------------------------------------------------ */
/* Timeline (ms) — matches the treatment's pacing table               */
/* ------------------------------------------------------------------ */
const TOTAL_MS = 56800;

const PHASES = [
  { id: 'q', at: 0 },
  { id: 'split', at: 5000 },
  { id: 'general', at: 8000 },
  { id: 'darpan', at: 13000 },
  { id: 'human', at: 20000 },
  { id: 'merge', at: 25000 },
  { id: 'cleanup', at: 29000 },
  { id: 'rating', at: 36000 },
  { id: 'montage', at: 46000 },
  { id: 'ranking', at: 49000 },
  { id: 'ending', at: 53000 }
] as const;

type PhaseId = (typeof PHASES)[number]['id'];

function phaseIndexAt(t: number): number {
  let idx = 0;
  for (let i = 0; i < PHASES.length; i++) if (t >= PHASES[i].at) idx = i;
  return idx;
}

/* The two numerical reveals */
const SEARCHES = 5000;   // "5,000+ searches"
const DARPAN = 46000;    // "46,000+ NGO names"
const USABLE = 497;      // "497 usable Darpan leads"

const easeOutCubic = (p: number) => 1 - Math.pow(1 - Math.min(Math.max(p, 0), 1), 3);
const easeInCubic = (p: number) => { const q = Math.min(Math.max(p, 0), 1); return q * q * q; };

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
    if (reduced) { tRef.current = 50000; setT(50000); return; }
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

/* Static content ---------------------------------------------------- */
const SEARCH_TERMS = [
  'Residential schools', 'Children’s homes', 'Tribal hostels',
  'Special schools', 'Alternative education', 'Sports and arts programmes'
];

const DARPAN_GATES = [
  'Child-focused?', 'Education-related?', 'Karnataka?', 'Directly serves children?',
  'Non-fee-charging / underserved?', 'Food support relevant?', 'Duplicate?', 'Usable evidence?'
];

const HUMAN_SOURCES = [
  'Existing NGO partners', 'Feeding India employees', 'People working on the ground',
  'Trusted Karnataka ecosystem actors', 'Local NGO networks'
];

const NAME_FRAGS = 26; // darpan name-fragment count (visual volume)

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

  /* -------- 5,000+ searches (General Search reveal) -------- */
  let searchesText = '';
  if (t >= 10600 && t < 11500) {
    searchesText = Math.round(SEARCHES * easeOutCubic((t - 10600) / 900)).toLocaleString('en-IN');
  } else if (t >= 11500) {
    searchesText = '5,000+';
  }

  /* -------- 46,000+ → 497 (the Darpan pipeline's numbers) -------- */
  // grow 14.2–16.0 · peak "46,000+" 16.0–16.8 · collapse 16.8–19.2 ·
  // landed (HOLD 2) 19.2+ · stays as a compact left-half chip afterwards
  let darpanState: 'hidden' | 'grow' | 'peak' | 'collapse' | 'landed' | 'chip' = 'hidden';
  let darpanValue = 0;
  let darpanLabel = 'NGO names';
  if (t < 14200) {
    darpanState = 'hidden';
  } else if (t < 16000) {
    darpanState = 'grow';
    darpanValue = Math.round(DARPAN * easeOutCubic((t - 14200) / 1800));
  } else if (t < 16800) {
    darpanState = 'peak';
    darpanValue = DARPAN;
  } else if (t < 19200) {
    darpanState = 'collapse';
    darpanLabel = 'usable Darpan leads';
    darpanValue = Math.round(DARPAN - (DARPAN - USABLE) * easeInCubic((t - 16800) / 2400));
  } else if (t < 25000) {
    darpanState = 'landed';
    darpanLabel = 'usable Darpan leads';
    darpanValue = USABLE;
  } else {
    darpanState = 'chip';
    darpanLabel = 'usable Darpan leads';
    darpanValue = USABLE;
  }
  const darpanText =
    darpanState === 'peak' || (darpanState === 'grow' && darpanValue >= DARPAN)
      ? '46,000+'
      : darpanValue.toLocaleString('en-IN');

  return (
    <main
      className="svfb-film"
      data-phase={phase}
      data-paused={paused ? 'true' : 'false'}
      data-reduced={reduced ? 'true' : 'false'}
    >
      {/* hairline timecode + minimal corner controls (no rail) */}
      <div className="svfb-progress"><i style={{ width: `${progress * 100}%` }} /></div>
      <header className="svfb-controls">
        <Link href="/" className="svfb-ctl">← Back</Link>
        <div>
          <button type="button" className="svfb-ctl" onClick={() => setPaused((c) => !c)}>{paused ? 'Resume' : 'Pause'}</button>
          <button type="button" className="svfb-ctl" onClick={() => scrub(0)}>Restart</button>
        </div>
      </header>

      <section className="svfb-stage" key={cycle} data-phase={phase} aria-hidden="true">

        {/* ============ 0:00 — THE QUESTION (HOLD 1) ============ */}
        <div className="svfb-act svfb-q">
          <h1>
            <span className="svfb-ph svfb-ph1">How do we find</span>
            <span className="svfb-ph svfb-ph2">the best NGOs</span>
            <span className="svfb-ph svfb-ph3">in Karnataka?</span>
          </h1>
        </div>

        {/* ============ 0:05–0:29 — THE SPLIT WORLD ============ */}
        <div className="svfb-act svfb-split">
          {/* LEFT — Search the internet */}
          <div className="svfb-half svfb-left">
            <h2>Search the internet.</h2>

            {/* 0:08 General Search */}
            <div className="svfb-general">
              <em>General Search</em>
              <p>Search across the types of institutions that could fit DFP.</p>
              <div className="svfb-terms">
                {SEARCH_TERMS.map((term) => <span key={term}>{term}</span>)}
              </div>
              <div className="svfb-frags">
                {Array.from({ length: 10 }, (_, i) => <i key={i} />)}
              </div>
              <div className="svfb-searches">
                <b>{searchesText}</b>
                <span>searches · across multiple child-focused educational models</span>
              </div>
            </div>

            {/* 0:13 NGO Darpan Bulk Scan */}
            <div className="svfb-darpan">
              <div className="svfb-plusline"><i>+</i><em>NGO Darpan Bulk Scan</em></div>
              <div className="svfb-funnel">
                <div className="svfb-names">
                  {Array.from({ length: NAME_FRAGS }, (_, i) => <i key={i} style={{ animationDelay: `${0.2 + (i % 13) * 0.14}s` }} />)}
                </div>
                <div className="svfb-gates">
                  {DARPAN_GATES.map((gate, i) => (
                    <span key={gate} style={{ animationDelay: `${1.6 + i * 0.5}s` }}>{gate}</span>
                  ))}
                </div>
              </div>
              <div className={`svfb-dnum svfb-dnum-${darpanState}`}>
                <b>{darpanText}</b>
                <span>{darpanLabel}</span>
              </div>
            </div>
          </div>

          {/* the fine divider — exists only while the systems are separate */}
          <i className="svfb-vline" />

          {/* RIGHT — Ask someone who knows */}
          <div className="svfb-half svfb-right">
            <h2>Ask someone who knows.</h2>

            <div className="svfb-humanblock">
              <div className="svfb-sources">
                {HUMAN_SOURCES.map((source, i) => (
                  <span key={source} style={{ animationDelay: `${0.4 + i * 0.22}s` }}>{source}</span>
                ))}
              </div>

              {/* the real referral form — integrated, not a Google Form */}
              <div className="svfb-form">
                <label>NGO name</label>
                <div className="svfb-field svfb-field-typed">Kalkeri Sangeet Vidyalaya</div>
                <label>Contact details</label>
                <div className="svfb-field svfb-field-sweep" />
                <label>Referred by</label>
                <div className="svfb-field svfb-field-typed2">Existing NGO partner</div>
                <label>Why should we look at them?</label>
                <div className="svfb-field svfb-field-sweep2" />
                <button className="svfb-submit">Submit</button>
              </div>

              {/* the form folds into compact human-lead cards */}
              <div className="svfb-hleads">
                <div className="svfb-hlead svfb-hlead-main">
                  <em>Human Lead</em>
                  <b>Kalkeri Sangeet Vidyalaya</b>
                  <span>Referred by an existing NGO partner</span>
                </div>
                <div className="svfb-hlead"><em>Human Lead</em><b>Field team referral</b></div>
                <div className="svfb-hlead"><em>Human Lead</em><b>Local NGO network</b></div>
              </div>
              <p className="svfb-hnote">Ground networks surface organisations that internet discovery may miss.</p>
            </div>
          </div>

          {/* ============ 0:25 — THE MERGER ============ */}
          <div className="svfb-pool">
            <b>One Lead Pool</b>
            <span>General discovery + bulk discovery + human knowledge</span>
          </div>
        </div>

        {/* ============ 0:29 — DFP TEAM CLEAN-UP ============ */}
        <div className="svfb-act svfb-cleanup">
          <div className="svfb-cleanhead">
            <h2>DFP Team Clean-up</h2>
            <p>The machine finds usable leads. The DFP team decides what is worth ranking.</p>
          </div>
          <div className="svfb-gatezone">
            <i className="svfb-gateline" />
            {/* three cards, one at a time, binary outcomes */}
            <div className="svfb-ccard svfb-cc1">
              <b>Residential school lead</b>
              <span className="svfb-cq svfb-cq1">Is it genuinely relevant?</span>
              <span className="svfb-cq svfb-cq2">Does it directly serve children?</span>
              <span className="svfb-verdict svfb-send">Send for ranking</span>
            </div>
            <div className="svfb-ccard svfb-cc2">
              <b>Generic Welfare Organisation</b>
              <span className="svfb-cq svfb-cq3">Is it a realistic DFP fit?</span>
              <span className="svfb-verdict svfb-remove">Remove</span>
            </div>
            <div className="svfb-ccard svfb-cc3">
              <b>Kalkeri Sangeet Vidyalaya</b>
              <span className="svfb-cq svfb-cq4">Is the information correct?</span>
              <span className="svfb-verdict svfb-send">Send for ranking</span>
            </div>
            {/* the approved queue */}
            <div className="svfb-queue">
              <em>Sent for ranking</em>
              <i /><i /><i />
            </div>
          </div>
        </div>

        {/* ============ 0:36 — RATING ENGINE + AI CHECK ============ */}
        <div className="svfb-act svfb-rating">
          <div className="svfb-rcard">
            <div className="svfb-rhead">
              <b>Rachit</b>
              <span>NGO 01 of 18</span>
            </div>
            <h3>Shanti Bhavan Educational Trust</h3>
            <p>Residential education model with a long-term pathway from school towards higher education and employment.</p>

            {/* the real rating logic — all five, labelled */}
            <div className="svfb-scale">
              <div className="svfb-seg"><b>1</b><span>Not a fit</span></div>
              <div className="svfb-seg"><b>2</b><span>Weak fit</span></div>
              <div className="svfb-seg"><b>3</b><span>DFP fit</span></div>
              <div className="svfb-seg"><b>4</b><span>Strong fit</span></div>
              <div className="svfb-seg svfb-seg5"><b>5</b><span>Transformative</span></div>
              <i className="svfb-pointer" />
            </div>
            <div className="svfb-locked">5 — Transformative</div>

            <label>Why this rating?</label>
            <div className="svfb-reason svfb-reason1">Strong child focus and a great long-term model.</div>
            <div className="svfb-reason svfb-reason2">It is not only a school. The residential model supports children over many years, through education and towards higher education and employment. That long-term pathway is why it can fundamentally change a child’s trajectory.</div>
            <button className="svfb-rsubmit">Submit review</button>
            <div className="svfb-badge">Rachit · 5/5 · Reason saved</div>
          </div>

          {/* AI panel — beside the response, never touching the scale */}
          <div className="svfb-ai">
            <em>AI quality check</em>
            <p className="svfb-ai1">The rating is clear. The explanation needs more detail.</p>
            <p className="svfb-ai2">What specifically makes the model transformative?</p>
            <span className="svfb-ainote">Checks the explanation — not the score</span>
            <button className="svfb-aiedit">Edit response</button>
            <div className="svfb-aidone">Reason captured</div>
          </div>
        </div>

        {/* ============ 0:46 — FAST RATING MONTAGE ============ */}
        <div className="svfb-act svfb-montage">
          <div className="svfb-mcard svfb-m1">
            <b>Kalkeri Sangeet Vidyalaya</b>
            <i>4 — Strong fit</i>
            <span>Strong child-development model.</span>
          </div>
          <div className="svfb-mcard svfb-m2">
            <b>Community School</b>
            <i>3 — DFP fit</i>
            <span>Viable DFP fit.</span>
          </div>
          <div className="svfb-mcard svfb-m3">
            <b>Generic Welfare Organisation</b>
            <i className="svfb-mlow">1 — Not a fit</i>
            <span>Not relevant.</span>
          </div>
        </div>

        {/* ============ 0:49 — THE STRONGEST RISE ============ */}
        <div className="svfb-act svfb-ranking">
          <h2>The strongest NGOs rise to the top.</h2>
          <div className="svfb-tiers">
            <div className="svfb-tier svfb-tier-high">
              <b>Highest Transformation Potential</b>
              <span>Institutions capable of changing long-term life outcomes</span>
              <i className="svfb-tchip svfb-tstrong">Shanti Bhavan Educational Trust · 5</i>
            </div>
            <div className="svfb-tier">
              <b>Great NGOs</b>
              <span>Strong organisations worth moving forward</span>
              <i className="svfb-tchip">Kalkeri Sangeet Vidyalaya · 4</i>
            </div>
            <div className="svfb-tier svfb-tier-quiet">
              <b>Worth a Closer Look</b>
              <span>Promising organisations that need more context</span>
              <i className="svfb-tchip">Community School · 3</i>
            </div>
          </div>
        </div>

        {/* ============ 0:53 — RETURN TO THE QUESTION (HOLD 3) ============ */}
        <div className="svfb-act svfb-endq">
          <h1>How do we find the best NGOs in Karnataka?</h1>
          <p className="svfb-likethis">Like this.</p>
          <p className="svfb-endline">Search broadly. Add ground knowledge. Filter carefully. Review every lead. Rank the strongest.</p>
        </div>
      </section>
    </main>
  );
}
