import { createHmac } from "node:crypto";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { createTestApp } from "./crm.controller.testSupport.js";

export const metaAppSecret = "meta-app-secret";
export const metaVerifyToken = "meta-verify-token";
export const metaStoreId = "store_1" as StoreId;
export const metaTenantId = "tenant_1" as TenantId;

export function whatsappPayload(value: Record<string, unknown>) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "phone-number-1" },
              ...value,
            },
          },
        ],
      },
    ],
  };
}

export function signedMetaRequest(
  app: ReturnType<typeof createTestApp>,
  payload: Record<string, unknown>,
) {
  const body = JSON.stringify(payload);
  const signature = createHmac("sha256", metaAppSecret)
    .update(body)
    .digest("hex");
  return app.request("/api/v1/crm/webhooks/meta", {
    body,
    headers: { "x-hub-signature-256": `sha256=${signature}` },
    method: "POST",
  });
}

export function createMetaConnection(
  channel: "instagram" | "whatsapp",
  externalConnectionId: string,
): CrmConnection {
  return {
    broker: "composio",
    channel,
    credentialsRef: {},
    displayName: channel,
    externalConnectionId,
    externalInstanceId: null,
    id:
      channel === "instagram"
        ? "25000000-0000-4000-8000-000000000202"
        : "25000000-0000-4000-8000-000000000201",
    metadata: {},
    phone: null,
    provider: "meta_cloud",
    status: "active",
    storeId: metaStoreId,
    tenantId: metaTenantId,
    webhookUrl: null,
  };
}

export function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
