'use client';

import Link from 'next/link';
import { useEffect, useState, type CSSProperties, type PointerEvent } from 'react';

const steps = [
  {
    step: '01',
    title: 'Discovering the right NGOs',
    cta: 'Launch Discovery',
    href: '/ngo-discovery'
  },
  {
    step: '02',
    title: 'Ranking them',
    cta: 'Open Rankings',
    href: '/progress'
  },
  {
    step: '03',
    title: 'Contacting and tracking them',
    cta: 'Open Tracker',
    href: '/contact-tracker'
  }
];

const storyScenes = [
  {
    kicker: 'The question',
    title: 'How do we find the best NGOs in a region?',
    body: 'The goal is not to find every NGO. It is to find the organisations most worth shortlisting.',
    visual: 'question'
  },
  {
    kicker: 'Simple answer',
    title: 'There are two ways to do this. This website can do both.',
    body: 'This website can search the internet and add human leads into the same shortlisting flow.',
    visual: 'twoWays'
  },
  {
    kicker: 'Path 1',
    title: 'Part 1: Searching the internet.',
    body: 'Use general search to find NGOs across different educational models, or upload bulk NGO names and scan them automatically.',
    visual: 'internet'
  },
  {
    kicker: 'Path 2',
    title: 'Part 2: Add human leads.',
    body: 'Human leads are added with the NGO name, contact number, and referrer, then sent into the same collective pool.',
    visual: 'human'
  },
  {
    kicker: 'Collective pool',
    title: 'Everything enters one Lead Pool.',
    body: 'Internet leads and human leads come together in one shared list, so every possible lead is reviewed in the same place.',
    visual: 'pool'
  },
  {
    kicker: 'Curation',
    title: 'Some leads are not relevant and need to be removed.',
    body: 'The DFP team checks the collective pool, removes weak or irrelevant leads, and approves only the strongest leads for shortlisting.',
    visual: 'clean'
  },
  {
    kicker: 'DFP team review',
    title: 'The DFP team reviews NGOs one at a time.',
    body: 'Each reviewer opens one NGO, uses the rating slider, writes why they ranked it that way, and submits the review.',
    visual: 'review'
  },
  {
    kicker: 'AI check',
    title: 'AI checks the submission quality.',
    body: 'AI does not choose the NGO. It only checks whether the reviewer has fully explained why they ranked it that way. The reviewer can edit and improve the response.',
    visual: 'ai'
  },
  {
    kicker: 'Combined output',
    title: 'All reviews are collated in one place.',
    body: 'Everyone can see the combined output: NGO name, website, rating, and review comments together.',
    visual: 'combined'
  },
  {
    kicker: 'Final review',
    title: 'The shortlisted NGOs move to final review.',
    body: 'From here, the DFP team reviews the combined output and makes the final shortlist decision.',
    visual: 'final'
  }
];

function setPointerVars(event: PointerEvent<HTMLElement>) {
  const target = event.currentTarget;
  const rect = target.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const px = x / rect.width;
  const py = y / rect.height;
  target.style.setProperty('--mx', `${x}px`);
  target.style.setProperty('--my', `${y}px`);
  target.style.setProperty('--rx', `${(0.5 - py) * 0.65}deg`);
  target.style.setProperty('--ry', `${(px - 0.5) * 0.8}deg`);
}

function resetPointerVars(event: PointerEvent<HTMLElement>) {
  const target = event.currentTarget;
  target.style.setProperty('--rx', '0deg');
  target.style.setProperty('--ry', '0deg');
}

function moveHeroObject(event: PointerEvent<HTMLElement>) {
  const target = event.currentTarget;
  const rect = target.getBoundingClientRect();
  const px = (event.clientX - rect.left) / rect.width - 0.5;
  const py = (event.clientY - rect.top) / rect.height - 0.5;
  target.style.setProperty('--fi-x', `${px * 14}px`);
  target.style.setProperty('--fi-y', `${py * 10}px`);
  target.style.setProperty('--fi-rx', `${py * -1.2}deg`);
  target.style.setProperty('--fi-ry', `${px * 1.5}deg`);
}

function resetHeroObject(event: PointerEvent<HTMLElement>) {
  const target = event.currentTarget;
  target.style.setProperty('--fi-x', '0px');
  target.style.setProperty('--fi-y', '0px');
  target.style.setProperty('--fi-rx', '0deg');
  target.style.setProperty('--fi-ry', '0deg');
}

function StoryVisual({ visual }: { visual: string }) {
  if (visual === 'twoWays') {
    return (
      <div className="lp-story-two-grid">
        <div className="lp-story-way internet">
          <span>⌕</span>
          <b>Part 1 · Searching the internet</b>
          <p>Find strong child-focused organisations in the selected region.</p>
        </div>
        <div className="lp-story-way human">
          <span>◎</span>
          <b>Part 2 · Add human leads</b>
          <p>Bring referrals from people who know the region on ground.</p>
        </div>
      </div>
    );
  }

  if (visual === 'internet') {
    return (
      <div className="lp-story-search-stack">
        <div className="lp-story-search-card main">
          <b>General Search</b>
          <p>Search across high-relevance child pathways and educational models.</p>
          <div>
            <span>Residential schools</span>
            <span>Children’s homes</span>
            <span>Tribal hostels</span>
            <span>Special schools</span>
            <span>Alternative education</span>
            <span>Sports / arts programs</span>
          </div>
        </div>
        <div className="lp-story-search-card upload">
          <b>Bulk Search</b>
          <p>Upload NGO names and scan them automatically.</p>
        </div>
      </div>
    );
  }

  if (visual === 'human') {
    return (
      <div className="lp-story-human-board">
        <div><i>E</i><b>Eternal universe</b><span>internal network</span></div>
        <div><i>D</i><b>DFP universe</b><span>existing NGO partners</span></div>
        <div><i>N</i><b>NGO connects</b><span>regional references</span></div>
        <div className="lp-story-form"><b>Referral</b><span>NGO name · contact · referred by</span></div>
      </div>
    );
  }

  if (visual === 'pool') {
    return (
      <div className="lp-story-pool-flow">
        <div className="lp-story-source-card">Internet Leads</div>
        <div className="lp-story-arrow">→</div>
        <div className="lp-story-pool-card"><b>Lead Pool</b><span>one collective list</span></div>
        <div className="lp-story-arrow">←</div>
        <div className="lp-story-source-card">Human Leads</div>
      </div>
    );
  }

  if (visual === 'clean') {
    return (
      <div className="lp-story-clean-board">
        <div className="lp-story-lane">
          <b>Collective Pool</b>
          <p>Residential school</p>
          <p>Children’s home</p>
          <p className="bad">Generic welfare society</p>
          <p className="bad">Duplicate lead</p>
        </div>
        <div className="lp-story-lane review">
          <b>DFP Team Check</b>
          <p className="ok">Child focus</p>
          <p className="ok">Region match</p>
          <p className="bad">Not relevant</p>
          <p className="bad">Already reviewed</p>
        </div>
        <div className="lp-story-lane result">
          <b>Approved for Shortlisting</b>
          <p className="ok">Move forward</p>
          <p className="ok">Approve with comment</p>
        </div>
      </div>
    );
  }

  if (visual === 'review') {
    return (
      <div className="lp-story-review-card">
        <div className="lp-story-review-top"><span>NGO 1 of 12</span><button>Next →</button></div>
        <h4>Shanti Bhavan Educational Trust</h4>
        <p>Residential education model supporting children through a long-term pathway.</p>
        <label>Rating</label>
        <div className="lp-story-slider"><i /><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>
        <label>Why this rating?</label>
        <div className="lp-story-response">Strong long-term model, clear child focus, and high transformation potential.</div>
        <button className="lp-story-submit">Submit review</button>
      </div>
    );
  }

  if (visual === 'ai') {
    return (
      <div className="lp-story-ai-card">
        <b>AI Review Check</b>
        <p>Did the reviewer fully explain why they ranked it this way?</p>
        <div className="lp-story-quality good"><span>Explains the rating</span><b>Good</b></div>
        <div className="lp-story-quality warn"><span>Could use one clearer example</span><b>Edit</b></div>
        <button>Improve response</button>
      </div>
    );
  }

  if (visual === 'combined') {
    return (
      <div className="lp-story-combined">
        <div className="lp-story-band"><b>Rating 5</b><span>Shanti Bhavan</span><em>“Clear long-term transformation pathway.”</em></div>
        <div className="lp-story-band"><b>Rating 4</b><span>Kalkeri Sangeet Vidyalaya</span><em>“Strong child development model.”</em></div>
        <div className="lp-story-band"><b>Rating 3</b><span>Community Learning Centre</span><em>“Needs more context.”</em></div>
      </div>
    );
  }

  if (visual === 'final') {
    return (
      <div className="lp-story-final-board">
        <div><b>Highest Transformation Potential</b><span>institutions most likely to change life outcomes</span></div>
        <div><b>Great NGOs</b><span>strong organisations worth moving forward</span></div>
        <div><b>Worth a Closer Look</b><span>needs more context before final call</span></div>
      </div>
    );
  }

  return (
    <div className="lp-story-question-mark">
      <span>?</span>
      <i />
    </div>
  );
}

export default function Home() {
  const [revealed, setRevealed] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [storyIndex, setStoryIndex] = useState(0);
  const activeScene = storyScenes[storyIndex];

  useEffect(() => {
    const section = document.getElementById('how');
    if (!section) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setRevealed(true);
        observer.disconnect();
      }
    }, { threshold: 0.24, rootMargin: '0px 0px -10% 0px' });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!storyOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setStoryOpen(false);
      if (event.key === 'ArrowRight') setStoryIndex((current) => Math.min(storyScenes.length - 1, current + 1));
      if (event.key === 'ArrowLeft') setStoryIndex((current) => Math.max(0, current - 1));
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [storyOpen]);

  function openStory() {
    setStoryIndex(0);
    setStoryOpen(true);
  }

  return (
    <main className="lp-v91-page lp-v95-page">
      <section className="lp-v91-hero lp-v95-hero" id="top" onPointerMove={moveHeroObject} onPointerLeave={resetHeroObject}>
        <div className="lp-v91-internal">For internal use only</div>

        <div className="lp-v91-ambient lp-v95-ambient" aria-hidden="true">
          <span className="lp-v91-blush lp-v95-blush-one" />
          <span className="lp-v95-blush-two" />
        </div>

        <div className="lp-v95-fi-object" aria-hidden="true">
          <div className="lp-v95-fi-object-inner">
            <span data-letter="f">f</span>
            <span data-letter="i">i</span>
          </div>
        </div>

        <div className="lp-v91-hero-core lp-v95-hero-core">
          <p className="lp-v95-eyebrow">NGO Discovery Engine</p>
          <h1 className="lp-v91-title">
            <span className="lp-v91-dfp">DFP</span>
            <span className="lp-v91-version">
              <span>2</span>
              <span className="lp-v94-heart-dot" aria-hidden="true">
                <svg viewBox="0 0 32 29" focusable="false">
                  <defs>
                    <linearGradient id="lp-v94-heart-gradient" x1="5" y1="2" x2="25" y2="27" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#ff5a70" />
                      <stop offset="0.48" stopColor="#e53249" />
                      <stop offset="1" stopColor="#bd1f35" />
                    </linearGradient>
                  </defs>
                  <path fill="url(#lp-v94-heart-gradient)" d="M16 28.2 3.2 16.05C-4.1 9.15 1.18-2.1 10.42.55 12.68 1.2 14.55 2.75 16 4.72 17.45 2.75 19.32 1.2 21.58.55c9.24-2.65 14.52 8.6 7.22 15.5L16 28.2Z" />
                </svg>
              </span>
              <span>0</span>
            </span>
          </h1>
          <p className="lp-v91-subtitle">Find the best NGOs</p>
        </div>

        <a className="lp-v91-scroll lp-v94-scroll" href="#how" aria-label="Scroll down to How it works">
          <span>Scroll down</span>
          <i aria-hidden="true">
            <b className="lp-v94-scroll-arrow" />
            <em className="lp-v94-scroll-comet" />
          </i>
        </a>
      </section>

      <section className="lp-v91-how lp-v95-how" id="how">
        <div className="lp-v91-how-inner">
          <h2 className={revealed ? 'lp-v91-how-title is-visible' : 'lp-v91-how-title'}>How it works</h2>
          <Link
            href="/how-it-works"
            className={revealed ? 'lp-v91-preview is-visible' : 'lp-v91-preview'}
          >
            Preview
          </Link>

          <div className="lp-v91-grid">
            {steps.map((item, index) => (
              <article
                className={revealed ? 'lp-v91-unit is-visible' : 'lp-v91-unit'}
                style={{ transitionDelay: revealed ? `${index * 130}ms` : '0ms' } as CSSProperties}
                key={item.step}
              >
                <Link
                  className="lp-v91-card-link lp-v95-card-link"
                  href={item.href}
                  aria-label={`${item.title} — ${item.cta}`}
                  onPointerMove={setPointerVars}
                  onPointerLeave={resetPointerVars}
                >
                  <div className="lp-v91-card">
                    <div className="lp-v91-card-body">
                      <span className="lp-v91-card-gloss" aria-hidden="true" />
                      <span className="lp-v91-step"><i />{item.step}</span>
                      <h3>{item.title}</h3>
                    </div>
                    <div className="lp-v91-cta" aria-hidden="true">
                      {item.cta}
                      <svg viewBox="0 0 24 24"><path d="M13.2 4.8a1 1 0 0 1 1.4 0l6 6a1 1 0 0 1 0 1.4l-6 6a1 1 0 1 1-1.4-1.4l4.3-4.3H4a1 1 0 1 1 0-2h13.5l-4.3-4.3a1 1 0 0 1 0-1.4z" /></svg>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {storyOpen && (
        <div className="lp-story-overlay" role="dialog" aria-modal="true" aria-labelledby="storyOverlayTitle">
          <button className="lp-story-backdrop" type="button" aria-label="Close preview" onClick={() => setStoryOpen(false)} />
          <section className="lp-story-modal">
            <header className="lp-story-topbar">
              <div>
                <p className="lp-story-kicker">Preview</p>
                <h3 id="storyOverlayTitle">How it works</h3>
              </div>
              <div className="lp-story-actions">
                <span>{String(storyIndex + 1).padStart(2, '0')} / {String(storyScenes.length).padStart(2, '0')}</span>
                <button type="button" onClick={() => setStoryIndex(0)}>Restart</button>
                <button type="button" aria-label="Close preview" onClick={() => setStoryOpen(false)}>×</button>
              </div>
            </header>

            <div className="lp-story-progress" aria-hidden="true">
              <i style={{ width: `${((storyIndex + 1) / storyScenes.length) * 100}%` }} />
            </div>

            <div className="lp-story-stage">
              <article className="lp-story-copy" key={`copy-${storyIndex}`}>
                <p className="lp-story-kicker">{activeScene.kicker}</p>
                <h4>{activeScene.title}</h4>
                <p>{activeScene.body}</p>
              </article>

              <div className="lp-story-visual" key={`visual-${storyIndex}`}>
                <StoryVisual visual={activeScene.visual} />
              </div>
            </div>

            <footer className="lp-story-footer">
              <button type="button" disabled={storyIndex === 0} onClick={() => setStoryIndex((current) => Math.max(0, current - 1))}>← Back</button>
              <div className="lp-story-dots" aria-label="Preview scenes">
                {storyScenes.map((scene, index) => (
                  <button
                    key={scene.kicker + scene.title}
                    type="button"
                    aria-label={`Go to ${scene.kicker}`}
                    className={index === storyIndex ? 'active' : index < storyIndex ? 'done' : ''}
                    onClick={() => setStoryIndex(index)}
                  />
                ))}
              </div>
              <button type="button" onClick={() => storyIndex === storyScenes.length - 1 ? setStoryOpen(false) : setStoryIndex((current) => Math.min(storyScenes.length - 1, current + 1))}>
                {storyIndex === storyScenes.length - 1 ? 'Close' : 'Next →'}
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
