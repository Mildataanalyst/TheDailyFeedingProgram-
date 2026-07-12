'use client';

import { useState } from 'react';

type FloatingPreviewProps = {
  title?: string;
  kicker?: string;
  description?: string;
  bullets?: string[];
};

export default function FloatingPreview({
  title = 'Preview',
  kicker = 'Premium preview',
  description = 'A quick look at the refined visual system and interaction behavior for this workflow.',
  bullets = [
    'Raised white surfaces on a soft ambient background glow',
    'Tactile controls with stronger hover and focus feedback',
    'Sharper landing-page typography carried into working screens',
  ],
}: FloatingPreviewProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="claude-preview-chip" type="button" onClick={() => setOpen(true)} aria-label="Open preview details">
        <span className="claude-preview-dot" aria-hidden="true" />
        <strong>{title}</strong>
      </button>

      {open && (
        <div className="claude-preview-scrim" onClick={() => setOpen(false)}>
          <section className="claude-preview-modal" onClick={(e) => e.stopPropagation()}>
            <button className="claude-preview-close" type="button" onClick={() => setOpen(false)} aria-label="Close preview">
              ×
            </button>
            <p className="claude-preview-kicker">{kicker}</p>
            <h3>{title}</h3>
            <p className="claude-preview-copy">{description}</p>
            <div className="claude-preview-list">
              {bullets.map((item) => (
                <div key={item}>
                  <span>✦</span>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
