# V151 — Fast Recovery sends only Avika-filtered rows to Lead Pool

- Added a separate `Download Avika-filtered CSV` action.
- Raw recovery remains downloadable for audit/review.
- `Send filtered results to Lead Pool` is shown only after the filtered repository output exists.
- Recovery run imports fetch `/repository/recheck/export/{run_id}/repository`, not the raw `results` file.
- Displays the filtered repository row count in the live run panel.
