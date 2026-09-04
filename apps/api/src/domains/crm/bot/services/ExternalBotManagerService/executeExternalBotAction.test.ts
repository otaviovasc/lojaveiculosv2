import { describe, expect, it } from "vitest";
import { createMemoryExternalBotManager } from "../../testSupportExternalBotManager.js";
import {
  createExternalBotActionContext as context,
  createExternalBotActionRequest as request,
  withExternalBotActionDigest as withDigest,
} from "../../testSupportExternalBotAction.js";
import { executeExternalBotAction } from "./executeExternalBotAction.js";

describe("executeExternalBotAction human attendance", () => {
  it("keeps human attendance authoritative over proposal policy", async () => {
    let providerCalls = 0;
    const manager = createMemoryExternalBotManager({
      effectDispatcher: {
        dispatch: async () => {
          providerCalls += 1;
          return { kind: "succeeded" };
        },
      },
      inspect: async () => ({
        humanAttendanceActive: true,
        revision: 4,
        scopeExists: true,
      }),
    });
    const unsigned = await request(manager, "fact.record", {
      classification: "purchase_intent",
      summary: "Customer expressed purchase intent.",
    });
    const result = await executeExternalBotAction(
      context(),
      withDigest(manager, unsigned),
      manager.ports,
    );
    expect(result).toMatchObject({
      failureCode: "policy_human_takeover",
      status: "cancelled",
    });
    expect(manager.proposals).toHaveLength(0);
    expect(providerCalls).toBe(0);
  });

  it("blocks proposal mode without provider effects during human attendance", async () => {
    let providerCalls = 0;
    const manager = createMemoryExternalBotManager({
      effectDispatcher: {
        dispatch: async () => {
          providerCalls += 1;
          return { kind: "succeeded" };
        },
      },
      inspect: async () => ({
        humanAttendanceActive: true,
        revision: 4,
        scopeExists: true,
      }),
      policyMode: "proposal",
    });
    const unsigned = await request(manager, "message.send_text", {
      text: "Hello",
    });
    const result = await executeExternalBotAction(
      context(),
      withDigest(manager, unsigned),
      manager.ports,
    );
    expect(result).toMatchObject({
      failureCode: "policy_human_takeover",
      status: "cancelled",
    });
    expect(manager.proposals).toHaveLength(0);
    expect(providerCalls).toBe(0);
  });
});

describe("executeExternalBotAction security", () => {
  it("records a proposal without provider effects when bot attendance is active", async () => {
    let effects = 0;
    const manager = createMemoryExternalBotManager({
      effectDispatcher: {
        dispatch: async () => {
          effects += 1;
          return { kind: "succeeded" };
        },
      },
      inspect: async () => ({
        humanAttendanceActive: false,
        revision: 4,
        scopeExists: true,
      }),
      policyMode: "proposal",
    });
    const command = await request(manager, "fact.record", {
      classification: "intent",
      summary: "Interested in vehicle.",
    });
    expect(
      (
        await executeExternalBotAction(
          context(),
          withDigest(manager, command),
          manager.ports,
        )
      ).status,
    ).toBe("pending_approval");
    expect(manager.proposals).toHaveLength(1);
    expect(effects).toBe(0);
  });

  it("rejects cross-store scope", async () => {
    const manager = createMemoryExternalBotManager();
    const unsigned = await request(manager, "message.send_text", {
      text: "Hello",
    });
    await expect(
      executeExternalBotAction(
        { ...context(), storeId: "other-store" },
        withDigest(manager, unsigned),
        manager.ports,
      ),
    ).rejects.toMatchObject({ code: "CRM_BOT_SCOPE_MISMATCH" });
  });

  it("rejects grant reuse with a new idempotency key", async () => {
    const manager = createMemoryExternalBotManager();
    const first = await request(manager, "message.send_text", {
      text: "Hello",
    });
    await executeExternalBotAction(
      context(),
      withDigest(manager, first),
      manager.ports,
    );
    const reused = { ...first, idempotencyKey: "another-idempotency-key" };
    await expect(
      executeExternalBotAction(
        context(),
        withDigest(manager, reused),
        manager.ports,
      ),
    ).rejects.toMatchObject({ code: "CRM_BOT_GRANT_INVALID" });
  });

  it("does not weaken grants when channel semantics change", async () => {
    const manager = createMemoryExternalBotManager();
    const granted = await request(manager, "message.send_text", {
      text: "Hello",
    });
    const switched = {
      ...granted,
      channel: "instagram" as const,
      provider: "meta_cloud" as const,
    };
    await expect(
      executeExternalBotAction(
        context(),
        withDigest(manager, switched),
        manager.ports,
      ),
    ).rejects.toMatchObject({ code: "CRM_BOT_GRANT_INVALID" });
  });

  it("rejects forbidden PII and enforces scoped kill switches", async () => {
    const manager = createMemoryExternalBotManager({
      inspect: async () => ({
        humanAttendanceActive: false,
        revision: 4,
        scopeExists: true,
      }),
      killSwitch: "provider",
    });
    const pii = await request(manager, "conversation.summarize", {
      cpf: "forbidden",
      summary: "safe",
    });
    await expect(
      executeExternalBotAction(
        context(),
        withDigest(manager, pii),
        manager.ports,
      ),
    ).rejects.toMatchObject({ code: "CRM_BOT_PII_NOT_ALLOWED" });
    const command = await request(manager, "message.send_text", {
      text: "Hello",
    });
    const result = await executeExternalBotAction(
      context(),
      withDigest(manager, command),
      manager.ports,
    );
    expect(result).toMatchObject({
      failureCode: "kill_switch_provider",
      status: "cancelled",
    });
  });

  it("rejects CPF embedded in a free-text value", async () => {
    const manager = createMemoryExternalBotManager();
    const command = await request(manager, "message.send_text", {
      text: "CPF 123.456.789-00",
    });
    await expect(
      executeExternalBotAction(
        context(),
        withDigest(manager, command),
        manager.ports,
      ),
    ).rejects.toMatchObject({ code: "CRM_BOT_PII_NOT_ALLOWED" });
  });
});
