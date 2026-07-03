# QA Lane Reports

Each lane keeps one living report in this directory:

```text
docs/qa-agent-workflows/reports/<feature-slug>/report.md
```

Workers update the report through discovery, implementation, reviewer feedback,
fixes, and final readiness. Screenshots captured through `saveQaScreenshot`,
long logs, and exploratory notes stay under
`/tmp/lojaveiculosv2-qa/<branch>/<feature>/` and are linked from the report.
Playwright may still emit failure traces in `test-results/playwright`; those are
runner diagnostics, not the canonical lane artifact root.

The orchestrator summarizes lane reports into the checked-in campaign ledger.
