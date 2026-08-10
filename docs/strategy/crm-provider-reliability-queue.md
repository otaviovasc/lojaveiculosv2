# CRM provider reliability queue

This queue records provider-boundary work discovered during the 2026-08 CRM
billing and Z-API review. It is deliberately separate from the delivered
catalog, renewal scheduling, automatic webhook setup, support authorization,
and abandoned-connection cleanup.

## Completed in the CRM billing release

### Durable outbound message intent

The outbound pipeline now persists a scoped operation before provider IO,
stores an allowlisted provider receipt before local message ingestion, and
reuses that receipt after a local persistence failure. Concurrent identical
keys cause one provider call; stale ambiguous attempts become explicitly
indeterminate and are not resent automatically.

Recovery payloads contain no message body after completion and expire after
seven days while recovery is pending. The scheduled CRM cleanup worker purges
expired recovery payloads in bounded batches.

## Queued provider hardening

### Composio effect reconciliation

Authorization-link creation and selected-WABA subscription can succeed before
local state is committed. Persist an effect intent before provider IO, reuse or
reconcile an existing pending connected account, and make the selected-WABA
subscription idempotent.

Acceptance: a database failure after authorization or subscription does not
orphan a second account or create a duplicate subscription; only the selected
WABA is subscribed.

## Privacy and operations

### Provider-event retention boundary

Replace unrestricted long-term raw webhook payload storage with a normalized,
versioned retry envelope. If exact payload quarantine is contractually needed,
encrypt it, restrict access, and enforce a short TTL deletion job. Ordinary CRM
and billing APIs must never return the raw payload.

### Durable provider audit outbox

Provider setup, send, reconciliation, and webhook state changes need important
audit delivery backed by a durable outbox. Logging or audit delivery failure
must not rewrite a confirmed provider outcome, and retries must join on the
same operation and request identifiers.

## Verification contract

For every item above, preserve tenant/store isolation, current entitlements,
support attribution, safe structured logs, and the rule that an unavailable or
indeterminate provider operation is never presented as successful.
