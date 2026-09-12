import { vi } from "vitest";
import type { CrmAudioNormalizer } from "../../../domains/crm/ports/crmAudioNormalizer.js";
import { createNoopServiceLogger } from "../../../shared/serviceContext.js";
import type { AuthorizedExternalBotEffect } from "../../db/crm/drizzleExternalBotEffectRuntime.js";
import { createExternalBotProviderEffectExecutor } from "./externalBotProviderEffectExecutor.js";

export function createExternalBotEffectExecutor(
  sendText: ReturnType<typeof vi.fn>,
  overrides: {
    audioNormalizer?: CrmAudioNormalizer;
    mediaFetcher?: {
      fetchMedia: ReturnType<typeof vi.fn>;
      validateUrl: ReturnType<typeof vi.fn>;
    };
    mediaStorage?: {
      deleteObject?: ReturnType<typeof vi.fn>;
      putObject: ReturnType<typeof vi.fn>;
    };
    sendMedia?: ReturnType<typeof vi.fn>;
    sendTemplate?: ReturnType<typeof vi.fn>;
  } = {},
) {
  return createExternalBotProviderEffectExecutor({
    audioNormalizer: overrides.audioNormalizer,
    db: {} as never,
    gateway: {
      sendMedia: overrides.sendMedia ?? vi.fn(),
      sendTemplate: overrides.sendTemplate ?? vi.fn(),
      sendText,
    } as never,
    logger: createNoopServiceLogger(),
    mediaFetcher: overrides.mediaFetcher,
    mediaStorage: overrides.mediaStorage,
    providerOperationPorts: {} as never,
  } as never);
}

export function externalBotEffectFixture(
  command: AuthorizedExternalBotEffect["command"],
): AuthorizedExternalBotEffect {
  return {
    canonicalCycleId: "cycle-1",
    command,
    connection: externalBotConnectionFixture({
      displayName: "Authorization-time connection",
    }),
    effectId: "effect-1",
    expectedRevision: 4,
    idempotencyKey: "idem-1",
    integrationId: "integration-1",
    modelVersion: "model-1",
    provider: "zapi",
    providerAddress: "5511999999999",
    providerConnectionId: "connection-1",
    requestDigest: "request-digest-1",
    storeId: "store-1",
    tenantId: "tenant-1",
    threadId: "thread-1",
  };
}

export function externalBotConnectionFixture(
  overrides: Partial<
    Pick<
      AuthorizedExternalBotEffect["connection"],
      "displayName" | "id" | "storeId" | "tenantId"
    >
  > = {},
): AuthorizedExternalBotEffect["connection"] {
  return {
    broker: "direct",
    canonical: {
      broker: "direct",
      capabilities: ["inbound", "outbound"],
      channel: "whatsapp",
      connected: true,
      degraded: false,
      errorCode: null,
      provider: "zapi",
      readiness: { ready: true, reason: null, reasonCode: "ready" },
      state: "active",
    },
    credentialsRef: {},
    channel: "whatsapp",
    displayName: "Execution-time connection",
    externalConnectionId: null,
    externalInstanceId: null,
    id: "connection-1",
    metadata: {},
    phone: null,
    provider: "zapi",
    status: "active",
    storeId: "store-1" as never,
    tenantId: "tenant-1" as never,
    webhookUrl: null,
    ...overrides,
  };
}

export const externalBotProviderResult = {
  externalId: "provider-message-1",
  providerTimestamp: new Date("2026-08-18T12:00:00.000Z"),
};

export function externalBotWorkerInput() {
  return {
    effectId: "effect-1",
    effectType: "message.send_text",
    idempotencyKey: "idem-1",
    provider: "zapi",
    providerConnectionId: "connection-1",
  };
}
