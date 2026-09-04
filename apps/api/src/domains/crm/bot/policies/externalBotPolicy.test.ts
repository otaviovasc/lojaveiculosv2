import { describe, expect, it } from "vitest";
import {
  evaluateExternalBotPolicy,
  externalBotGuardrailMaximums,
  normalizeExternalBotPolicy,
} from "./externalBotPolicy.js";

const policy = {
  action: "message.send_text" as const,
  channel: "whatsapp" as const,
  connectionRatePerMinute: 10,
  cooldownSeconds: 30,
  dailyLimit: 100,
  mode: "auto" as const,
};

describe("external bot policy", () => {
  it("enforces server-owned guardrail maximums", () => {
    expect(() =>
      normalizeExternalBotPolicy({
        ...policy,
        dailyLimit: externalBotGuardrailMaximums.dailyLimit + 1,
      }),
    ).toThrow("server-owned maximum");
  });

  it("blocks human takeover before provider effects", () => {
    expect(
      evaluateExternalBotPolicy({
        actionsToday: 0,
        connectionActionsInLastMinute: 0,
        connectionReady: true,
        humanTakeover: true,
        policy,
        secondsSinceLastAction: null,
      }),
    ).toEqual({ allowed: false, code: "human_takeover" });
  });

  it("allows proposal mode after readiness and limits pass", () => {
    expect(
      evaluateExternalBotPolicy({
        actionsToday: 1,
        connectionActionsInLastMinute: 1,
        connectionReady: true,
        humanTakeover: false,
        policy: { ...policy, mode: "proposal" },
        secondsSinceLastAction: 60,
      }),
    ).toEqual({ allowed: true, mode: "proposal" });
  });

  it("blocks proposal mode during human attendance", () => {
    expect(
      evaluateExternalBotPolicy({
        actionsToday: 0,
        connectionActionsInLastMinute: 0,
        connectionReady: true,
        humanTakeover: true,
        policy: { ...policy, mode: "proposal" },
        secondsSinceLastAction: null,
      }),
    ).toEqual({ allowed: false, code: "human_takeover" });
  });
});
