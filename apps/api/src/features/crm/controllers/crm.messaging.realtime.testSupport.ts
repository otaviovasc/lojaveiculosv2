import { expect } from "vitest";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { CrmConnection } from "../../../domains/crm/ports/crmConnectionRepository.js";

export const realtimeStoreId = "store_1" as StoreId;
export const realtimeTenantId = "tenant_1" as TenantId;
export const realtimeConnectionId = "24000000-0000-4000-8000-000000000101";

export function createZapiConnection(
  overrides: Partial<CrmConnection> = {},
): CrmConnection {
  return {
    broker: "direct",
    channel: "whatsapp",
    credentialsRef: {},
    displayName: "ZAPI Test Connection",
    externalConnectionId: null,
    externalInstanceId: null,
    id: realtimeConnectionId,
    metadata: {},
    phone: null,
    provider: "zapi",
    status: "sandbox",
    storeId: realtimeStoreId,
    tenantId: realtimeTenantId,
    webhookUrl: null,
    ...overrides,
  };
}

export function createConnectionStatusEvent(
  status: string,
  eventConnectionId = realtimeConnectionId,
) {
  return {
    connectionId: eventConnectionId,
    phone: null,
    status,
    storeId: realtimeStoreId,
    tenantId: realtimeTenantId,
    type: "connection_status" as const,
  };
}

export async function readSseUntil(response: Response, expected: string) {
  const reader = response.body?.getReader();
  expect(reader).toBeDefined();
  const decoder = new TextDecoder();
  let text = "";
  for (let attempt = 0; attempt < 4 && !text.includes(expected); attempt += 1) {
    const chunk = await readChunk(reader!);
    if (chunk.done) break;
    text += decoder.decode(chunk.value);
  }
  await reader!.cancel();
  return text;
}

async function readChunk(reader: ReadableStreamDefaultReader<Uint8Array>) {
  return Promise.race([
    reader.read(),
    new Promise<ReadableStreamReadResult<Uint8Array>>((_, reject) => {
      setTimeout(() => reject(new Error("Timed out reading SSE.")), 1_000);
    }),
  ]);
}
