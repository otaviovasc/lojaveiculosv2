# Incident Runbook

## Severity

- P0: production unavailable, data loss, auth bypass, payment/fiscal corruption.
- P1: critical workflow broken for many stores, repeated 5xx, severe latency.
- P2: degraded feature, limited scope, workaround exists.
- P3: minor bug, copy issue, non-critical polish.

## First Response

1. Identify affected environment, service, deployment, and commit SHA.
2. Capture sanitized evidence from Railway logs, HTTP logs, metrics, and Sentry.
3. Check whether the issue started with the latest deployment.
4. Decide rollback vs forward fix.
5. Create or update a GitHub issue with the incident evidence.

## Evidence Template

```md
## Environment

- Environment:
- Service:
- Deployment:
- Commit:
- First seen:
- Last seen:

## User Impact

## Evidence

## Current Hypothesis

## Decision

- Rollback:
- Forward fix:
- Monitor:
```

## Codex Fix Loop

Use this prompt:

```text
Investigate this incident using the issue evidence, Railway/Sentry context, and repo code. Reproduce the failure if feasible, add a regression test, implement the smallest safe fix, run the checks from AGENTS.md, and open a PR. Do not mutate production config, secrets, databases, or domains.
```

## Data Handling

Do not paste raw customer data, tokens, full request bodies, cookies, documents,
or database rows into issues or AI chats. Redact or summarize.
