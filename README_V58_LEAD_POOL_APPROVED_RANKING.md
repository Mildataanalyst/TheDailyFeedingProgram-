# DFP 2.0 Frontend v58 — Lead Pool Curation + Approved Ranking Gate

Built on frontend v57 smart recovery UI.

## Main changes

- Lead Pool is now the working curation board.
- Removed separate Compiled Leads concept from UI.
- Lead Pool tabs: Pending, Approved Leads, Follow-up, All.
- Row actions: Approve, Approve + comment, Follow-up, Send back, Comment, Delete.
- Send to ranking button now sends only Approved Leads.
- Referral CSV no longer requires district.
- Referral sample required columns are `ngo_name`, `contact_number`, `referred_by` with optional district/website/comments.
- Human referrals are tagged as `Human Referral`.
- Archive/history imports are tagged as `Archive Import`.
- Current Discovery/Bulk/Smart Recovery imports keep source tags: Internet Discovery, Bulk Discovery, Smart Recovery.
- PM review submit now auto-advances to the next NGO after save/confetti.

## Validation

- Next.js production build passed.
- Existing warnings only: Google font download unavailable in sandbox, autoprefixer flex-end warnings, and one React hook dependency warning.
