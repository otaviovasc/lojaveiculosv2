import type { PermissionKey } from "@lojaveiculosv2/shared";
import { Hono } from "hono";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { resolveCrmWebhookActor } from "../../../infrastructure/http/crmWebhookContextFactory.js";
import { createCrmFeature } from "./crm.controller.js";
import { createCrmServices } from "./crmServices.js";
import type { CreateCrmTestAppOptions } from "./crm.controller.testSupport.types.js";
import { buildTestCrmServicePorts } from "./crm.controller.testSupportPorts.js";
export {
  createAuditSpy,
  expectApiError,
} from "./crm.controller.testSupportHelpers.js";

export const defaultWhatsappPermissions = [
  "crm.conversations.assign",
  "crm.conversations.manage",
  "crm.attendances.manage",
  "crm.messaging.connection.pair",
  "crm.messaging.connection.setup",
  "crm.messaging.credentials.rotate",
  "crm.routing.default.manage",
  "crm.conversations.read",
  "crm.conversations.read",
  "crm.campaigns.manage",
  "crm.campaigns.read",
  "crm.messaging.connection.setup",
  "crm.scheduled_messages.cancel",
  "crm.scheduled_messages.create",
  "crm.scheduled_messages.process",
  "crm.scheduled_messages.read",
  "crm.messages.send",
  "crm.bot.read",
  "crm.bot.manage",
  "crm.bot.proposals.decide",
  "crm.tags.assign",
  "crm.tags.manage",
  "crm.conversations.manage",
  "crm.pipeline.manage",
  "crm.pipeline.move",
  "crm.pipeline.read",
  "crm.visits.manage",
  "crm.visits.read",
] satisfies PermissionKey[];

export function createTestApp(options: CreateCrmTestAppOptions = {}) {
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
              ...(options.actorDisplayName
                ? { displayName: options.actorDisplayName }
                : {}),
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
      webhookContextFactory: async (context) => {
        const actor = resolveCrmWebhookActor(new URL(context.req.url).pathname);
        return createServiceContext({
          actor: {
            id: actor.actorId,
            kind: "integration",
            displayName: actor.displayName,
          },
          ...(options.audit ? { audit: options.audit } : {}),
          ...(options.logger ? { logger: options.logger } : {}),
          permissions: ["crm.messages.ingest", "crm.conversations.manage"],
          request: { requestId: "req_1" },
          storeId: null,
          tenantId: null,
        });
      },
      pushPublicConfig: options.pushPublicConfig ?? {
        appId: null,
        deliveryMode: "off",
      },
      services: createCrmServices({
        ports: buildTestCrmServicePorts(options),
      }),
      resolveBotEntitlements:
        options.resolveBotEntitlements ??
        (async () => options.entitlements ?? ["crm"]),
      ...(options.crmRealtimeBroker
        ? { realtimeBroker: options.crmRealtimeBroker }
        : {}),
    }),
  );
  return app;
}
