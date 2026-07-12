# V119 — Persistent Repair UI

Combined Review now exposes two independent actions:

- **New enrichment** — starts a fresh Deep Enrichment run.
- **Repair existing run** — opens persistent completed runs and repairs missing official-site evidence.

The repair modal:

- lists stored repairable runs;
- shows total NGOs, already-complete dossiers and repair-required dossiers;
- shows stored Serper queries and external sources that will be reused;
- guarantees zero new Serper searches;
- supports official-site crawl limits, source identity cleanup and blind Haiku synthesis;
- shows repaired, still-partial, Firecrawl, stored-Serper and new-page metrics;
- supports safe pause/resume when Firecrawl credits are unavailable;
- exports a repaired ZIP, GPT/Fable packet, JSONL and master CSV.

Production build completed successfully with existing non-blocking font/autoprefixer warnings.
