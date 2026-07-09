'use client';

// DFP 2.0 — "How it works" story, v84 choreography build.
// Drop-in replacement for app/how-it-works/page.tsx.
// All visible text is byte-identical to v83. All motion lives in the
// story-v84 CSS block appended to globals.css.

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type StorySlide = {
  eyebrow: string;
  title: string;
  body?: string;
  visual:
    | 'question'
    | 'twoWays'
    | 'internetDiscovery'
    | 'humanLeads'
    | 'leadPool'
    | 'curation'
    | 'review'
    | 'ai'
    | 'combined'
    | 'finalShortlist';
};

const slides: StorySlide[] = [
  {
    eyebrow: '',
    title: 'How do we find the best NGOs in a region?',
    visual: 'question'
  },
  {
    eyebrow: 'Simple answer',
    title: 'There are two ways to do this.',
    body: 'This website can do both: search the internet and add human leads into the same shortlisting flow.',
    visual: 'twoWays'
  },
  {
    eyebrow: 'Part 1',
    title: 'Part 1: Searching the internet.',
    body: 'Use general search to find NGOs across different educational models, or upload bulk NGO names and scan them automatically.',
    visual: 'internetDiscovery'
  },
  {
    eyebrow: 'Part 2',
    title: 'Part 2: Add human leads.',
    body: 'Human leads are added with the NGO name, contact number, and referrer, then sent into the same collective pool.',
    visual: 'humanLeads'
  },
  {
    eyebrow: 'Collective pool',
    title: 'Everything enters one Lead Pool.',
    body: 'Internet leads and human leads come together in the same collective pool before anything is sent for ranking.',
    visual: 'leadPool'
  },
  {
    eyebrow: 'DFP team curation',
    title: 'Non-relevant leads are removed first.',
    body: 'The DFP team manually checks the collective pool and sends forward only the leads that look useful enough for ranking.',
    visual: 'curation'
  },
  {
    eyebrow: 'DFP team review',
    title: 'The DFP team reviews one NGO at a time.',
    body: 'Each reviewer opens one NGO, uses the rating slider, writes the reason, and submits the review.',
    visual: 'review'
  },
  {
    eyebrow: 'AI review check',
    title: 'AI checks the review quality.',
    body: 'AI only gives suggestions on whether the reviewer has fully explained the ranking. The reviewer can edit the response.',
    visual: 'ai'
  },
  {
    eyebrow: 'Combined output',
    title: 'All reviews are collected in one place.',
    body: 'Every rating and comment is collated so the DFP team can compare the review output together.',
    visual: 'combined'
  },
  {
    eyebrow: 'Final shortlist',
    title: 'The strongest NGOs move into final review.',
    body: 'The DFP team reviews the combined output and sorts the strongest organisations into clear final shortlist tiers.',
    visual: 'finalShortlist'
  }
];

// v84 choreographed durations — each slide performs its beats, then rests.
const DEFAULT_AUTO_MS = 3200;
const SLIDE_DURATIONS_MS: Record<StorySlide['visual'], number> = {
  question: 3400,
  twoWays: 5200,
  internetDiscovery: 7000,
  humanLeads: 6200,
  leadPool: 6000,
  curation: 7200,
  review: 6800,
  ai: 6400,
  combined: 5400,
  finalShortlist: 7000
};

function StoryVisual({ visual }: { visual: StorySlide['visual'] }) {
  if (visual === 'question') return null;

  if (visual === 'twoWays') {
    return (
      <div className="story-two-options story-two-options-clean sv-stage">
        <div className="story-option story-option-red">
          <span>01</span>
          <b>Part 1 · Searching the internet</b>
        </div>
        <div className="story-option story-option-white">
          <span>02</span>
          <b>Part 2 · Add human leads</b>
        </div>
        <span className="sv-cursor sv-cursor-two" aria-hidden="true" />
      </div>
    );
  }

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
          <span>Contact preserved</span>
          <span>Referrer preserved</span>
        </div>
      </div>
    );
  }

  if (visual === 'leadPool') {
    return (
      <div className="story-pool-clean sv-stage">
        <div className="story-source-block red">Internet leads</div>
        <div className="story-source-block white">Human leads</div>
        <div className="story-merge-line" />
        <div className="story-pool-core">Collective Lead Pool</div>
      </div>
    );
  }

  if (visual === 'curation') {
    return (
      <div className="story-curation-clean sv-stage">
        <div className="story-curation-column">
          <b>Collective pool</b>
          <span>Residential school</span>
          <span>Children’s home</span>
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
          <span>Approved for ranking</span>
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

  if (visual === 'combined') {
    return (
      <div className="story-combined-clean sv-stage">
        <div><b>Rating 5</b><span>Shanti Bhavan</span><em>Clear transformation pathway.</em></div>
        <div><b>Rating 4</b><span>Kalkeri Sangeet Vidyalaya</span><em>Strong child-development model.</em></div>
        <div><b>Rating 4</b><span>Parikrma Humanity Foundation</span><em>Strong education pathway.</em></div>
      </div>
    );
  }

  return (
    <div className="story-final-clean sv-stage">
      <div className="story-final-tier high">
        <b>Highest Transformation Potential</b>
        <span>Institutions most capable of changing long-term life outcomes.</span>
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
  );
}

export default function HowItWorksPage() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const active = slides[index];
  const slideDuration = SLIDE_DURATIONS_MS[active.visual] ?? DEFAULT_AUTO_MS;

  // Continuous per-slide progress fill (film timecode). The bar animates
  // from (index/n) to ((index+1)/n) over exactly this slide's duration.
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

  return (
    <main
      className={isQuestion ? 'story-page story-page-question story-v72 story-v84' : 'story-page story-v72 story-v84'}
      data-visual={active.visual}
      data-autoplay={paused ? 'paused' : 'playing'}
    >
      {/* Ambient continuity layer: the same "leads" drift through every slide. */}
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

      <section className="story-slide" key={active.title + index} data-autoplay={paused ? 'paused' : 'playing'}>
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
          <StoryVisual visual={active.visual} />
        </div>
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
