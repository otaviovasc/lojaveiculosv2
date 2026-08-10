import type { AuditEvent, AuditSink } from "@lojaveiculosv2/audit";
import type { PermissionKey } from "@lojaveiculosv2/shared";
import { Hono } from "hono";
import { expect, vi } from "vitest";
import type { CrmWhatsappGateway } from "../../../domains/crm/ports/crmWhatsappGateway.js";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createMemoryCrmBotIntegrationRepository } from "../adapters/memory/crmBotIntegrationRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmVisitRepository } from "../adapters/memory/crmVisitRepository.js";
import { createMemoryCrmPipelineRepository } from "../adapters/memory/crmPipelineRepository.js";
import { createCrmFeature } from "./crm.controller.js";
import { createTestCrmConnectionCredentialVault } from "./crm.whatsapp.connectionFixtures.js";
import { createCrmServices } from "./crmServices.js";
import type { CreateCrmWhatsappTestAppOptions } from "./crm.whatsapp.controller.testSupport.types.js";

export const defaultWhatsappPermissions = [
  "crm.whatsapp.assign",
  "crm.whatsapp.close",
  "crm.whatsapp.connection.manage",
  "crm.whatsapp.list",
  "crm.whatsapp.read",
  "crm.whatsapp.campaigns.manage",
  "crm.whatsapp.campaigns.read",
  "crm.whatsapp.integrations.manage",
  "crm.whatsapp.schedules.cancel",
  "crm.whatsapp.schedules.create",
  "crm.whatsapp.schedules.process",
  "crm.whatsapp.schedules.read",
  "crm.whatsapp.send",
  "crm.whatsapp.tags.assign",
  "crm.whatsapp.tags.manage",
  "crm.whatsapp.toggle_intervention",
  "crm.pipeline.manage",
  "crm.pipeline.move",
  "crm.pipeline.read",
  "crm.visits.manage",
  "crm.visits.read",
] satisfies PermissionKey[];

export function createTestApp(options: CreateCrmWhatsappTestAppOptions = {}) {
  const app = new Hono();
  app.route(
    "/api/v1/crm",
    createCrmFeature({
      accountContextFactory: async () =>
        createServiceContext({
          actor: { id: "platform_support", kind: "user" },
          permissions: options.supportPermissions ?? [],
          request: { requestId: "support_req_1" },
          storeId: null,
          tenantId: null,
        }),
      contextFactory: async () =>
        Object.assign(
          createServiceContext({
            actor: {
              id: "02020202-0202-4202-8202-020202020202",
              kind: "user",
            },
            ...(options.audit ? { audit: options.audit } : {}),
            ...(options.logger ? { logger: options.logger } : {}),
            permissions: options.permissions ?? defaultWhatsappPermissions,
            request: { requestId: "req_1" },
            storeId: "store_1",
            tenantId: "tenant_1",
          }),
          { entitlements: options.entitlements ?? ["crm", "crm_zapi"] },
        ),
      webhookContextFactory: async () =>
        createServiceContext({
          actor: {
            id: "zapi",
            kind: "integration",
          },
          ...(options.audit ? { audit: options.audit } : {}),
          ...(options.logger ? { logger: options.logger } : {}),
          permissions: ["crm.whatsapp.ingest"],
          request: { requestId: "req_1" },
          storeId: null,
          tenantId: null,
        }),
      services: createCrmServices({
        ports: {
          ...(options.billingQuotaGuard
            ? { billingQuotaGuard: options.billingQuotaGuard }
            : {}),
          ...(options.composioWhatsappOnboardingProvider
            ? {
                composioWhatsappOnboardingProvider:
                  options.composioWhatsappOnboardingProvider,
              }
            : {}),
          crmBotIntegrationRepository:
            options.crmBotIntegrationRepository ??
            createMemoryCrmBotIntegrationRepository(),
          ...(options.crmBotWebhookDispatcher
            ? { crmBotWebhookDispatcher: options.crmBotWebhookDispatcher }
            : {}),
          ...(options.crmConnectionRepository
            ? { crmConnectionRepository: options.crmConnectionRepository }
            : {}),
          ...(options.crmZapiSetupCompletionReporter
            ? {
                crmZapiSetupCompletionReporter:
                  options.crmZapiSetupCompletionReporter,
              }
            : {}),
          ...(options.crmZapiSupportAuthorizer
            ? { crmZapiSupportAuthorizer: options.crmZapiSupportAuthorizer }
            : {}),
          crmConnectionCredentialVault:
            options.crmConnectionCredentialVault ??
            createTestCrmConnectionCredentialVault(),
          ...((options.crmRealtimePublisher ?? options.crmRealtimeBroker)
            ? {
                crmRealtimePublisher:
                  options.crmRealtimePublisher ?? options.crmRealtimeBroker,
              }
            : {}),
          crmPipelineRepository:
            options.crmPipelineRepository ??
            createMemoryCrmPipelineRepository(),
          crmRepository: options.crmRepository ?? createMemoryCrmRepository(),
          crmVisitRepository:
            options.crmVisitRepository ?? createMemoryCrmVisitRepository(),
          ...(options.transaction ? { transaction: options.transaction } : {}),
          ...(options.crmWhatsappRepository
            ? { crmWhatsappRepository: options.crmWhatsappRepository }
            : {}),
          ...(options.crmWebhookEventRepository
            ? { crmWebhookEventRepository: options.crmWebhookEventRepository }
            : {}),
          ...(options.crmWhatsappGateway
            ? {
                crmWhatsappGateway: createTestWhatsappGateway(
                  options.crmWhatsappGateway,
                ),
              }
            : {}),
          ...(options.crmWhatsappMediaStorage
            ? { crmWhatsappMediaStorage: options.crmWhatsappMediaStorage }
            : {}),
          ...(options.crmWhatsappMediaFetcher
            ? { crmWhatsappMediaFetcher: options.crmWhatsappMediaFetcher }
            : {}),
          ...(options.financingBotActions
            ? { financingBotActions: options.financingBotActions }
            : {}),
          ...(options.vehicleInventory
            ? { vehicleInventory: options.vehicleInventory }
            : {}),
          ...(options.zapiConnectionSetupProvider
            ? {
                zapiConnectionSetupProvider:
                  options.zapiConnectionSetupProvider,
              }
            : {}),
        },
      }),
      resolveBotEntitlements:
        options.resolveBotEntitlements ??
        (async () => options.entitlements ?? ["crm", "crm_zapi"]),
      ...(options.crmRealtimeBroker
        ? { realtimeBroker: options.crmRealtimeBroker }
        : {}),
    }),
  );
  return app;
}

function createTestWhatsappGateway(
  overrides: Partial<CrmWhatsappGateway>,
): CrmWhatsappGateway {
  const send = vi.fn(async () => ({
    externalId: "test-whatsapp-outbound",
    providerTimestamp: new Date("2026-07-02T19:00:00.000Z"),
    raw: {},
  }));
  return {
    configureWebhooks: vi.fn(async () => ({ results: [] })),
    deleteMessage: vi.fn(async () => ({ deleted: true })),
    getConnectionStatus: vi.fn(async () => ({
      checkedAt: new Date("2026-07-02T19:00:00.000Z"),
      connected: false,
      connectedPhone: null,
      providerStatus: "unknown" as const,
      smartphoneConnected: null,
    })),
    listCatalogProducts: vi.fn(async () => ({
      cartEnabled: null,
      nextCursor: null,
      products: [],
      raw: {},
    })),
    sendCatalog: send,
    sendMedia: send,
    sendProduct: send,
    removeReaction: send,
    sendReaction: send,
    sendText: send,
    sendTemplate: send,
    ...overrides,
  };
}

export function createAuditSpy() {
  const record = vi.fn(async (_event: AuditEvent) => undefined);
  const audit: AuditSink = {
    record: async (event) => {
      await record(event);
    },
  };
  return { audit, record };
}

export async function expectApiError(
  response: Response,
  input: { code: string; message: string },
) {
  const body = (await response.json()) as {
    code?: string;
    message?: string;
    requestId?: unknown;
  };

  expect(body).toMatchObject({
    code: input.code,
    message: input.message,
  });
  expect(typeof body.requestId).toBe("string");
}
