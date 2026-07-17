import type { AuditEvent, AuditSink } from "@lojaveiculosv2/audit";
import type { EntitlementKey, PermissionKey } from "@lojaveiculosv2/shared";
import { Hono } from "hono";
import { expect, vi } from "vitest";
import type { CrmBotIntegrationRepository } from "../../../domains/crm/ports/crmBotIntegrationRepository.js";
import type { CrmBotWebhookDispatcher } from "../../../domains/crm/ports/crmBotWebhookDispatcher.js";
import type { CrmConnectionRepository } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmPipelineRepository } from "../../../domains/crm/ports/crmPipelineRepository.js";
import type { CrmRealtimeBroker } from "../../../domains/crm/ports/crmRealtimePublisher.js";
import type { CrmRepository } from "../../../domains/crm/ports/crmRepository.js";
import type { CrmVisitRepository } from "../../../domains/crm/ports/crmVisitRepository.js";
import type { CrmWebhookEventRepository } from "../../../domains/crm/ports/crmWebhookEventRepository.js";
import type { CrmWhatsappGateway } from "../../../domains/crm/ports/crmWhatsappGateway.js";
import type { CrmWhatsappRepository } from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import type { ObjectStorage } from "../../../shared/storage/objectStorage.js";
import {
  createServiceContext,
  type ServiceLogger,
} from "../../../shared/serviceContext.js";
import { createMemoryCrmBotIntegrationRepository } from "../adapters/memory/crmBotIntegrationRepository.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createMemoryCrmVisitRepository } from "../adapters/memory/crmVisitRepository.js";
import { createMemoryCrmPipelineRepository } from "../adapters/memory/crmPipelineRepository.js";
import { createCrmFeature } from "./crm.controller.js";
import { createCrmServices } from "./crmServices.js";

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

export function createTestApp(
  options: {
    audit?: AuditSink;
    crmBotIntegrationRepository?: CrmBotIntegrationRepository;
    crmBotWebhookDispatcher?: CrmBotWebhookDispatcher;
    crmConnectionRepository?: CrmConnectionRepository;
    crmPipelineRepository?: CrmPipelineRepository;
    crmRealtimeBroker?: CrmRealtimeBroker;
    crmRepository?: CrmRepository;
    crmVisitRepository?: CrmVisitRepository;
    crmWebhookEventRepository?: CrmWebhookEventRepository;
    crmWhatsappGateway?: Partial<CrmWhatsappGateway>;
    crmWhatsappMediaStorage?: ObjectStorage;
    crmWhatsappRepository?: CrmWhatsappRepository;
    entitlements?: EntitlementKey[];
    logger?: ServiceLogger;
    permissions?: PermissionKey[];
    transaction?: CrmServicePorts["transaction"];
    vehicleInventory?: CrmServicePorts["vehicleInventory"];
  } = {},
) {
  const app = new Hono();
  app.route(
    "/api/v1/crm",
    createCrmFeature({
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
          { entitlements: options.entitlements ?? ["crm"] },
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
          crmBotIntegrationRepository:
            options.crmBotIntegrationRepository ??
            createMemoryCrmBotIntegrationRepository(),
          ...(options.crmBotWebhookDispatcher
            ? { crmBotWebhookDispatcher: options.crmBotWebhookDispatcher }
            : {}),
          ...(options.crmConnectionRepository
            ? { crmConnectionRepository: options.crmConnectionRepository }
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
          ...(options.vehicleInventory
            ? { vehicleInventory: options.vehicleInventory }
            : {}),
        },
      }),
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
    deleteMessage: vi.fn(async () => ({ raw: {} })),
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
