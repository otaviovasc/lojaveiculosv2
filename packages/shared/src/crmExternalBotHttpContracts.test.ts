import { describe, expect, it } from "vitest";
import {
  crmExternalBotActionAcceptedResultSchema,
  crmExternalBotConfigurationPatchSchema,
  crmExternalBotConfigurationReadSchema,
  crmExternalBotTestResultSchema,
} from "./crmExternalBotHttpContracts.js";

describe("CRM external-bot HTTP contracts", () => {
  it("parses the secret-safe configuration read model", () => {
    const input = {
      configuration: {
        createdAt: "2026-08-18T12:00:00.000Z",
        enabled: true,
        id: "bot_1",
        secretConfigured: true,
        secretUpdatedAt: "2026-08-18T12:01:00.000Z",
        updatedAt: "2026-08-18T12:02:00.000Z",
        webhookUrl: "https://bot.example.test/events",
      },
    };

    expect(crmExternalBotConfigurationReadSchema.parse(input)).toEqual(input);
    expect(
      crmExternalBotConfigurationReadSchema.safeParse({
        configuration: { ...input.configuration, webhookSecret: "secret" },
      }).success,
    ).toBe(false);
  });

  it("accepts partial updates and rejects unknown or weak secret fields", () => {
    expect(
      crmExternalBotConfigurationPatchSchema.safeParse({ enabled: false })
        .success,
    ).toBe(true);
    expect(
      crmExternalBotConfigurationPatchSchema.safeParse({
        webhookSecret: "too-short",
      }).success,
    ).toBe(false);
    expect(
      crmExternalBotConfigurationPatchSchema.safeParse({
        enabled: false,
        legacyUrl: "https://bot.example.test",
      }).success,
    ).toBe(false);
  });

  it("requires explicit synthetic-operation diagnostics", () => {
    const input = {
      action: "message.send_text",
      channel: "whatsapp",
      diagnostics: {
        code: "DRY_RUN_READY",
        message: "Synthetic validation completed; no operation occurred.",
        retryable: false,
      },
      officialOperationOccurred: false,
      requestId: "request_1",
      status: "dry_run_ready",
    };

    expect(crmExternalBotTestResultSchema.parse(input)).toEqual(input);
    expect(
      crmExternalBotTestResultSchema.safeParse({
        ...input,
        officialOperationOccurred: true,
      }).success,
    ).toBe(false);
  });

  it("parses accepted action diagnostics without legacy result aliases", () => {
    const input = {
      actionId: "action_1",
      providerOperationId: null,
      requestId: "request_1",
      status: "accepted",
    };

    expect(crmExternalBotActionAcceptedResultSchema.parse(input)).toEqual(
      input,
    );
    expect(
      crmExternalBotActionAcceptedResultSchema.safeParse({
        ...input,
        id: input.actionId,
      }).success,
    ).toBe(false);
  });
});
