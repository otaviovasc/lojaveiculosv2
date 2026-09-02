import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import type { CrmConnection } from "../../domains/crm/ports/crmConnectionRepository.js";
import {
  UAZAPI_BASE_URL_CREDENTIAL_PURPOSE,
  UAZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
  UAZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
} from "../../domains/crm/ports/crmConnectionSetupProvider.js";
import { createCrmConnectionCredentialVault } from "./crmConnectionCredentialVault.js";

export const uazapiGatewayTestEnv = {
  CRM_CONNECTION_CREDENTIAL_ENCRYPTION_KEY: "uazapi-gateway-test-key",
  CRM_UAZAPI_BASE_URL: "https://free.uazapi.com",
};

export async function createUazapiGatewayTestConnection(
  baseUrlPlaintext = "https://free.uazapi.com",
): Promise<CrmConnection> {
  const scope = {
    storeId: "store-1" as StoreId,
    tenantId: "tenant-1" as TenantId,
  };
  const vault = createCrmConnectionCredentialVault(uazapiGatewayTestEnv);
  const [baseUrl, instanceId, instanceToken] = await Promise.all([
    vault.seal({
      ...scope,
      plaintext: baseUrlPlaintext,
      purpose: UAZAPI_BASE_URL_CREDENTIAL_PURPOSE,
    }),
    vault.seal({
      ...scope,
      plaintext: "instance-1",
      purpose: UAZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
    }),
    vault.seal({
      ...scope,
      plaintext: "instance-token",
      purpose: UAZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
    }),
  ]);
  return {
    broker: "direct",
    channel: "whatsapp",
    credentialsRef: {
      mode: "stored",
      stored: { baseUrl, instanceId, instanceToken },
    },
    displayName: "UAZAPI",
    externalConnectionId: null,
    externalInstanceId: null,
    id: "connection-1",
    metadata: {},
    phone: null,
    provider: "uazapi",
    status: "active",
    ...scope,
    webhookUrl: null,
  };
}
