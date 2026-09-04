import { describe, expect, it } from "vitest";
import {
  crmChannels,
  crmChannelConnectionSchema,
  crmConnectionCapabilities,
  crmConnectionStates,
  crmProviders,
  externalBotActionRegistry,
  externalBotPolicyModes,
} from "./crmContracts.js";

describe("canonical CRM contracts", () => {
  it("publishes the supported channels and providers", () => {
    expect(crmChannels).toEqual(["whatsapp", "instagram", "olx_chat"]);
    expect(crmProviders).toEqual(["meta_cloud", "zapi", "uazapi", "olx"]);
  });

  it("publishes connection states and capabilities", () => {
    expect(crmConnectionStates).toEqual([
      "sandbox",
      "active",
      "paused",
      "disconnected",
      "error",
      "archived",
    ]);
    expect(crmConnectionCapabilities).toEqual([
      "catalog",
      "delete",
      "inbound",
      "outbound",
      "reactions",
      "text",
      "media",
      "templates",
      "scheduling",
      "conversation_start",
    ]);
  });

  it("parses only canonical CRM channel connection values", () => {
    const connection = {
      capabilities: ["catalog", "delete", "inbound", "outbound", "reactions"],
      channel: "whatsapp",
      displayName: "WhatsApp principal",
      id: "connection_1",
      isDefault: true,
      provider: "zapi",
      readiness: { ready: true, reason: null, reasonCode: "ready" },
      state: "active",
    };

    expect(crmChannelConnectionSchema.parse(connection)).toEqual(connection);
    expect(
      crmChannelConnectionSchema.safeParse({
        ...connection,
        provider: "legacy_meta_alias",
      }).success,
    ).toBe(false);
    expect(
      crmChannelConnectionSchema.safeParse({
        ...connection,
        capabilities: { outbound: true },
      }).success,
    ).toBe(false);
    expect(
      crmChannelConnectionSchema.parse({
        ...connection,
        purpose: "ui_demo",
        readiness: {
          ready: false,
          reason: "Demonstração somente leitura",
          reasonCode: "not_authorized",
        },
        state: "sandbox",
      }),
    ).toMatchObject({ purpose: "ui_demo", state: "sandbox" });
    expect(
      crmChannelConnectionSchema.safeParse({
        ...connection,
        purpose: "internal_fixture",
      }).success,
    ).toBe(false);
  });

  it("publishes the typed external-bot action registry", () => {
    expect(externalBotActionRegistry).toEqual([
      "message.send_text",
      "message.send_media",
      "message.send_template",
      "conversation.summarize",
      "fact.record",
      "vehicle_interest.record",
      "handoff.request",
      "opportunity.open",
      "task.create",
      "appointment.create",
    ]);
  });

  it("publishes the supported external-bot policy modes", () => {
    expect(externalBotPolicyModes).toEqual(["auto", "proposal", "disabled"]);
  });
});
