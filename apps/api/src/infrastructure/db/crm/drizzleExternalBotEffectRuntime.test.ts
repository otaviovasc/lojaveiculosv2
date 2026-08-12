import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";
import {
  ExternalBotCanonicalSyncIndeterminateError,
  loadAuthorizedExternalBotEffect,
  synchronizeExternalBotEffectOutcome,
  type AuthorizedExternalBotEffect,
} from "./drizzleExternalBotEffectRuntime.js";

describe("external bot canonical effect runtime", () => {
  it("resolves a canonical cycle without requiring its id to equal the legacy session id", async () => {
    const execute = vi.fn<(statement: SQL) => Promise<unknown[]>>(async () =>
      Promise.resolve([
        {
          action_type: "message.send",
          canonical_cycle_id: "00000000-0000-4000-8000-000000000006",
          expected_revision: 3,
          id: "00000000-0000-4000-8000-000000000001",
          idempotency_key: "bot-effect-key",
          input: {
            command: { payload: { text: "Hello" } },
            integrationId: "00000000-0000-4000-8000-000000000002",
            modelVersion: "v1",
          },
          legacy_session_id: "00000000-0000-4000-8000-000000000005",
          legacy_session_revision: 7,
          provider: "zapi",
          provider_connection_id: "00000000-0000-4000-8000-000000000003",
          store_id: "00000000-0000-4000-8000-000000000004",
          tenant_id: "00000000-0000-4000-8000-000000000007",
          thread_id: "00000000-0000-4000-8000-000000000008",
        },
      ]),
    );

    const effect = await loadAuthorizedExternalBotEffect(
      { execute } as never,
      "00000000-0000-4000-8000-000000000001",
    );

    expect(effect?.canonicalCycleId).toBe(
      "00000000-0000-4000-8000-000000000006",
    );
    const query = render(execute.mock.calls[0]![0] as SQL);
    expect(query).toContain("cycle.external_cycle_id=legacy_session.id::text");
    expect(query).toContain("and 1=( select count(*)");
  });

  it("persists and verifies the exact scoped outbound message on every replay", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: messageId }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: messageId }]);

    await synchronizeExternalBotEffectOutcome({ execute } as never, {
      effect,
      legacyMessageId: messageId,
    });
    await synchronizeExternalBotEffectOutcome({ execute } as never, {
      effect,
      legacyMessageId: messageId,
    });

    expect(execute).toHaveBeenCalledTimes(4);
    const insert = render(execute.mock.calls[0]![0] as SQL);
    const verification = render(execute.mock.calls[1]![0] as SQL);
    expect(insert).not.toContain("cycle.id=message.session_id");
    expect(insert).toContain("on conflict do nothing");
    expect(verification).toContain("canonical.cycle_id=");
    expect(insert).toContain("external_bot_idempotency_key");
    expect(verification).toContain("canonical.provider_connection_id=");
  });

  it("reports an indeterminate outcome when the inserted or existing row cannot be asserted", async () => {
    const execute = vi.fn().mockResolvedValue([]);

    await expect(
      synchronizeExternalBotEffectOutcome({ execute } as never, {
        effect,
        legacyMessageId: messageId,
      }),
    ).rejects.toBeInstanceOf(ExternalBotCanonicalSyncIndeterminateError);
  });
});

const messageId = "00000000-0000-4000-8000-000000000009";
const effect: AuthorizedExternalBotEffect = {
  canonicalCycleId: "00000000-0000-4000-8000-000000000006",
  command: { action: "message.send", payload: { text: "Hello" } },
  effectId: "00000000-0000-4000-8000-000000000001",
  expectedRevision: 3,
  idempotencyKey: "bot-effect-key",
  integrationId: "00000000-0000-4000-8000-000000000002",
  legacySessionId: "00000000-0000-4000-8000-000000000005",
  legacySessionRevision: 7,
  modelVersion: "v1",
  provider: "zapi",
  providerConnectionId: "00000000-0000-4000-8000-000000000003",
  storeId: "00000000-0000-4000-8000-000000000004",
  tenantId: "00000000-0000-4000-8000-000000000007",
  threadId: "00000000-0000-4000-8000-000000000008",
};

function render(statement: SQL) {
  return new PgDialect()
    .sqlToQuery(statement)
    .sql.toLowerCase()
    .replaceAll(/\s+/g, " ");
}
