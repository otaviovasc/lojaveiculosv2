# ADR 0060: Canonical conversation model

## Status

Accepted for the CRM routing cutover.

## Decision

The runtime conversation source is the canonical CRM model: channel
connections, conversation threads, conversation cycles, attendances, and
messages. A thread is permanently bound to the connection that received it;
outbound operations resolve a route for the requested channel and must not
silently move an existing thread to another connection.

Provider-specific WhatsApp, Instagram, and OLX adapters may retain their
payloads and transport details, but they write/read the canonical conversation
projection. A provider status, marketplace account, array position, or first
connection is not a readiness decision.

## Consequences

- Routing is resolved once through channel → configured route → ready connection
  → capability → provider operation.
- A missing, disconnected, pending, or capability-incomplete route is an
  explicit blocked state and never a synthetic success.
- Human attendance is checked immediately before automatic bot effects and
  prevents provider calls during takeover.
- Historical migration filenames remain immutable. The forward cutover fails
  when legacy conversation/connection tables contain rows; local/staging data
  is reset by the operator at the approved checkpoint.
