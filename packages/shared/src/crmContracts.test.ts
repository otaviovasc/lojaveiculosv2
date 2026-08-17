import { describe, expect, it } from "vitest";
import {
  crmChannels,
  crmConnectionCapabilities,
  crmConnectionStates,
  crmProviders,
  externalBotActionRegistry,
  externalBotModes,
} from "./crmContracts.js";

describe("canonical CRM contracts", () => {
  it("publishes the supported channels and providers", () => {
    expect(crmChannels).toEqual(["whatsapp", "instagram", "olx_chat"]);
    expect(crmProviders).toEqual(["meta_cloud", "zapi", "olx"]);
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
      "inbound",
      "outbound",
      "text",
      "media",
      "templates",
      "scheduling",
      "conversation_start",
    ]);
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
    expect(externalBotModes).toEqual(["auto", "proposal", "disabled"]);
  });
});
