import { createMemoryAuditSink } from "../../shared/auditSink.js";
import {
  createNoopServiceLogger,
  createServiceContext,
} from "../../shared/serviceContext.js";

export function olxOnboardingContext() {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    audit: createMemoryAuditSink(),
    entitlements: ["crm"],
    logger: createNoopServiceLogger(),
    permissions: ["crm.messaging.connection.setup"],
    request: { requestId: "request_1" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}

export function olxOnboardingInput(accessToken: string) {
  return {
    accessToken,
    canonicalApiOrigin: "https://v2.example.test",
    providerAccountId: "olx_account",
    scopes: ["autoservice", "chat"],
    storeId: "store_1",
    tenantId: "tenant_1",
  };
}
