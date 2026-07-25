# V152 — Provider-capacity pause UI

Website Recovery now shows a prominent capacity warning when the Railway worker pauses because Serper, Firecrawl, Brave Search or Claude Haiku / Anthropic needs credits or a fixed/replaced key.

The warning shows:

- affected provider;
- masked affected key when available;
- completed/checkpointed row count;
- pending row count;
- instruction to add credits or replace/fix the key and press Resume.

The existing Resume control is used; no new manual recovery flow is required.
