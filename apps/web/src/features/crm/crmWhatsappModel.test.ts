import { describe, expect, it } from "vitest";
import { normalizeBootstrap } from "./crmWhatsappModel";

describe("CRM WhatsApp model", () => {
  it("normalizes bootstrap scope from V2 responses", () => {
    expect(
      normalizeBootstrap({
        agents: { agents: [] },
        connections: { connections: [] },
        scope: { canAssignSessions: true, connectionId: 10 },
      }).scope,
    ).toEqual({ canAssignSessions: true, connectionId: 10 });
  });

  it("defaults assignment scope to disabled when legacy payloads omit it", () => {
    expect(
      normalizeBootstrap({
        agents: [],
        connections: [],
      }).scope,
    ).toEqual({ canAssignSessions: false, connectionId: null });
  });
});
