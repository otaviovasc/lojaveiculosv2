import { randomUUID } from "node:crypto";
import type {
  CrmWhatsappOutboundIntentRepository,
  OutboundIntent,
} from "../../../../domains/crm/ports/crmWhatsappOutboundIntentRepository.js";

export function createMemoryCrmWhatsappOutboundIntentRepository(): CrmWhatsappOutboundIntentRepository {
  const rows = new Map<string, OutboundIntent>();
  return {
    async claim(input) {
      const key = `${input.tenantId}:${input.storeId}:${input.idempotencyKey}`;
      const existing = rows.get(key);
      if (existing) {
        if (existing.fingerprint !== input.fingerprint)
          return { kind: "conflict" };
        if (
          existing.status === "started" &&
          existing.startedAt <= input.staleBefore
        ) {
          existing.status = "indeterminate";
        }
        return {
          intent: existing,
          kind: existing.status === "started" ? "in_progress" : existing.status,
        };
      }
      const intent: OutboundIntent = {
        claimToken: randomUUID(),
        fingerprint: input.fingerprint,
        id: randomUUID(),
        messageId: null,
        providerResult: null,
        recoveryExpiresAt: null,
        startedAt: input.now,
        status: "started",
      };
      rows.set(key, intent);
      return { intent, kind: "claimed" };
    },
    async complete(input) {
      mutate(input, (row) => {
        row.messageId = input.messageId;
        row.providerResult = minimalReceipt(row.providerResult);
        row.recoveryExpiresAt = null;
        row.status = "completed";
      });
    },
    async markIndeterminate(input) {
      mutate(input, (row) => {
        row.status = "indeterminate";
      });
    },
    async recordProviderSuccess(input) {
      mutate(input, (row) => {
        row.providerResult = input.providerResult;
        row.recoveryExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60_000);
        row.status = "provider_succeeded";
      });
    },
    async purgeExpiredRecoveryPayloads(input) {
      let purged = 0;
      for (const row of rows.values()) {
        if (purged >= input.limit) break;
        if (
          row.providerResult &&
          row.recoveryExpiresAt &&
          row.recoveryExpiresAt <= input.now
        ) {
          row.providerResult = null;
          row.recoveryExpiresAt = null;
          row.status = "indeterminate";
          purged += 1;
        }
      }
      return purged;
    },
  };

  function mutate(
    input: { claimToken: string; id: string },
    action: (row: OutboundIntent) => void,
  ) {
    const row = [...rows.values()].find((item) => item.id === input.id);
    if (row?.claimToken === input.claimToken) action(row);
  }
}

function minimalReceipt(value: Record<string, unknown> | null) {
  const nested =
    value?.sent && typeof value.sent === "object"
      ? (value.sent as Record<string, unknown>)
      : null;
  const externalId = value?.externalId ?? nested?.externalId;
  const providerTimestamp =
    value?.providerTimestamp ?? nested?.providerTimestamp;
  return typeof externalId === "string" && typeof providerTimestamp === "string"
    ? { externalId, providerTimestamp }
    : null;
}
