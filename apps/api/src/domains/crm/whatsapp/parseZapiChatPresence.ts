import type { CrmPresencePayload } from "../ports/crmRealtimePublisher.js";

export function parseZapiChatPresence(
  payload: Record<string, unknown>,
): CrmPresencePayload | null {
  const phoneValues = present([
    payload.phone,
    payload.chatPhone,
    payload.chatId,
  ]);
  const stateValues = present([
    payload.state,
    payload.status,
    payload.presence,
  ]);
  const normalizedPhones = phoneValues.map(normalizePresencePhone);
  const normalizedStates = stateValues.map(normalizePresenceState);
  if (normalizedPhones.includes(null) || normalizedStates.includes(null)) {
    return null;
  }
  const phones = unique(normalizedPhones.filter(isPresent));
  const states = unique(normalizedStates.filter(isPresent));
  if (phones.length !== 1 || states.length !== 1) return null;
  const [phone] = phones;
  const [state] = states;
  return phone && state ? { phone, state } : null;
}

function normalizePresencePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (/@(?:g\.us|lid)$/iu.test(trimmed)) return null;
  const digits = trimmed
    .replace(/@(?:c\.us|s\.whatsapp\.net)$/iu, "")
    .replace(/\D/gu, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

function normalizePresenceState(
  value: unknown,
): CrmPresencePayload["state"] | null {
  if (typeof value !== "string") return null;
  const state = value.trim().toLowerCase();
  return ["available", "composing", "paused", "unavailable"].includes(state)
    ? (state as CrmPresencePayload["state"])
    : null;
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function present(values: unknown[]) {
  return values.filter((value) => value !== undefined && value !== null);
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}
