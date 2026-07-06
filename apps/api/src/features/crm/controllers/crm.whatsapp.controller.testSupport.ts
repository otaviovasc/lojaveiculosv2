import type { AuditEvent, AuditSink } from "@lojaveiculosv2/audit";
import type { EntitlementKey, PermissionKey } from "@lojaveiculosv2/shared";
import { Hono } from "hono";
import { expect, vi } from "vitest";
import type { CrmConnectionRepository } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmRealtimeBroker } from "../../../domains/crm/ports/crmRealtimePublisher.js";
import type { CrmRepository } from "../../../domains/crm/ports/crmRepository.js";
import type { CrmWebhookEventRepository } from "../../../domains/crm/ports/crmWebhookEventRepository.js";
import type { CrmWhatsappGateway } from "../../../domains/crm/ports/crmWhatsappGateway.js";
import type { CrmWhatsappRepository } from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import type { ObjectStorage } from "../../../shared/storage/objectStorage.js";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createCrmFeature } from "./crm.controller.js";
import { createCrmServices } from "./crmServices.js";

export const defaultWhatsappPermissions = [
  "crm.whatsapp.assign",
  "crm.whatsapp.close",
  "crm.whatsapp.connection.update_credentials",
  "crm.whatsapp.connection.update_metadata",
  "crm.whatsapp.connection.update_status",
  "crm.whatsapp.connection.update_webhooks",
  "crm.whatsapp.list",
  "crm.whatsapp.read",
  "crm.whatsapp.schedule.cancel",
  "crm.whatsapp.schedule.create",
  "crm.whatsapp.schedule.process",
  "crm.whatsapp.schedule.read",
  "crm.whatsapp.send",
  "crm.whatsapp.tag.assign",
  "crm.whatsapp.tag.manage",
  "crm.whatsapp.toggle_intervention",
] satisfies PermissionKey[];

export function createTestApp(
  options: {
    audit?: AuditSink;
    crmConnectionRepository?: CrmConnectionRepository;
    crmRealtimeBroker?: CrmRealtimeBroker;
    crmRepository?: CrmRepository;
    crmWebhookEventRepository?: CrmWebhookEventRepository;
    crmWhatsappGateway?: Partial<CrmWhatsappGateway>;
    crmWhatsappMediaStorage?: ObjectStorage;
    crmWhatsappRepository?: CrmWhatsappRepository;
    entitlements?: EntitlementKey[];
    permissions?: PermissionKey[];
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
          permissions: ["crm.whatsapp.ingest"],
          request: { requestId: "req_1" },
          storeId: null,
          tenantId: null,
        }),
      services: createCrmServices({
        ports: {
          ...(options.crmConnectionRepository
            ? { crmConnectionRepository: options.crmConnectionRepository }
            : {}),
          crmRepository: options.crmRepository ?? createMemoryCrmRepository(),
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
