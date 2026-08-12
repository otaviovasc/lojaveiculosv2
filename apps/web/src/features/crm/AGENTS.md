# CRM frontend rules

- Treat **channel**, **provider** and **broker** as separate concepts. User-facing
  copy names the channel first; provider/broker details are secondary operational
  facts and must never be presented as the channel itself.
- Capabilities are server-owned. Composer actions must be enabled only from the
  active connection capability DTO, never inferred from a provider name.
- A conversation keeps the connection that received it. Never reuse drafts,
  replies or provider-specific actions after changing session/connection.
- Provider effects use honest states: pending, failed, indeterminate and degraded
  are not success. Do not imply that an official message, OAuth grant, lead import
  or stock publication occurred until the server confirms it.
- Keep Fila, Thread and Contexto stable on desktop. Mobile navigation follows
  Fila -> Thread -> Contexto and every pane must have an accessible way back.
- OLX Chat is text-only and buyer-initiated unless the server returns broader
  capabilities. OLX stock authorization uses the marketplace OAuth contract.
- WhatsApp Oficial may be self-service when offered by the server. Instagram
  setup remains operator-assisted until an official Auth Config is available.
- Keep Z-API visible when its add-on or connection allowance exists; a zero
  generic allowance must not hide an active or paid add-on.
- Use design tokens from the shared stylesheet chain. Do not add hardcoded color
  values or feature-local replacements for shared primitives.
