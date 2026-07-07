# DFP 2.0 Frontend v63 — Structure and UI cleanup

Changes:
- Removed the raised pill/rectangle behind the landing hero text while keeping the circular orbit/glimmer treatment.
- Removed the top-left DFP 2.0 mini-brand from the shared header.
- Discovery now starts with state/UT selection and three clear actions: Internal Leads, Referrals, Go to Lead Pool.
- Added full India state/UT dropdown.
- Renamed Internet Leads to Internal Leads.
- Removed embedded Lead Pool tables from Internal Leads and Referrals screens; Lead Pool opens only through the red Go to Lead Pool card.
- Kept Advanced clean: Smart Recovery and History are inside Advanced only.
- Added one-line explanatory notes under pathway filters.
- Referral preview now supports row selection and inline comment editing before saving selected rows.
- Ranking page now has PM Shortlists, Combined Review, and Final Output tabs.
- Added Combined Review and Final Output frontend panels using existing backend endpoints.

Validation:
- npm run lint -- --no-cache passed with the existing Lexend warning.
- npm run build passed with existing Google Fonts/autoprefixer warnings.
