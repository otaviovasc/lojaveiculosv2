import type { SQL } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { persistPreparedExternalBotMedia } from "./drizzleExternalBotEffectRuntime.js";
import {
  externalBotEffectIds as ids,
  renderSql as render,
} from "./drizzleExternalBotEffectRuntime.testSupport.js";

describe("external bot prepared media persistence", () => {
  it("stores the durable media reference only before the provider attempt", async () => {
    const execute = vi.fn().mockResolvedValue([{ id: ids.effect }]);

    await expect(
      persistPreparedExternalBotMedia({ execute } as never, {
        contentType: "audio/mpeg",
        effectId: ids.effect,
        originalUrl: "https://provider.example/audio.mp3?expires=1",
        publicUrl: "https://cdn.example/crm/bot/audio.mp3",
        sizeBytes: 3,
        storageKey: "staging/crm/bot/audio.mp3",
        storeId: ids.store,
        tenantId: ids.tenant,
      }),
    ).resolves.toBeUndefined();

    const statement = render(execute.mock.calls[0]![0] as SQL);
    expect(statement).toContain("provider_attempted_at is null");
    expect(statement).toContain("jsonb_build_object('preparedmedia'");
    expect(statement).toContain("tenant_id=");
    expect(statement).toContain("store_id=");
  });

  it("fails closed when preparation cannot be attached to exactly one effect", async () => {
    const execute = vi.fn().mockResolvedValue([]);

    await expect(
      persistPreparedExternalBotMedia({ execute } as never, {
        contentType: "audio/mpeg",
        effectId: ids.effect,
        originalUrl: "https://provider.example/audio.mp3?expires=1",
        publicUrl: "https://cdn.example/crm/bot/audio.mp3",
        sizeBytes: 3,
        storageKey: "staging/crm/bot/audio.mp3",
        storeId: ids.store,
        tenantId: ids.tenant,
      }),
    ).rejects.toMatchObject({ code: "media_preparation_conflict" });
  });
});
