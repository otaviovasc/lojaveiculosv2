import type { PermissionKey, StoreId, TenantId } from "@lojaveiculosv2/shared";
import { expect } from "vitest";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";
import type { CrmWhatsappRepository } from "../../../domains/crm/ports/crmWhatsappRepository.js";
import { expectApiError } from "./crm.whatsapp.controller.testSupport.js";

export const actorUserId = "02020202-0202-4202-8202-020202020202";
export const otherUserId = "03030303-0303-4303-8303-030303030303";
export const connectionId = "24000000-0000-4000-8000-000000000101";
export const storeId = "store_1" as StoreId;
export const tenantId = "tenant_1" as TenantId;

export function createZapiConnection(): CrmConnection {
  return {
    credentialsRef: {},
    displayName: "ZAPI Test Connection",
    externalConnectionId: null,
    externalInstanceId: null,
    id: connectionId,
    metadata: {},
    phone: null,
    provider: "zapi",
    status: "sandbox",
    storeId,
    tenantId,
    webhookUrl: null,
  };
}

export function ingestText(
  repository: CrmWhatsappRepository,
  input: {
    buyerName: string;
    buyerPhone: string;
    content: string;
    externalId: string;
    providerTimestamp: Date;
  },
) {
  return repository.ingestMessage({
    ...input,
    channel: "WHATSAPP",
    connectionId,
    direction: "INBOUND",
    metadata: {},
    senderOrigin: "customer",
    senderType: "CUSTOMER",
    status: "DELIVERED",
    storeId,
    tenantId,
    type: "TEXT",
  });
}

export async function expectForbidden(
  responsePromise: Promise<Response> | Response,
  permission: PermissionKey,
) {
  const response = await responsePromise;
  expect(response.status).toBe(403);
  await expectApiError(response, {
    code: "AUTHORIZATION_DENIED",
    message: `Missing permission: ${permission}`,
  });
}

export function jsonPost(body: Record<string, unknown>) {
  return {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  };
}
