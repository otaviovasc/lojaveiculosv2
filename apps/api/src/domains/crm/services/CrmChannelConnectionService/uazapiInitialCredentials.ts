import { randomBytes } from "node:crypto";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { getCrmConnectionCredentialVault } from "../CrmService/crmConnectionSetupSupport.js";
import {
  UAZAPI_BASE_URL_CREDENTIAL_PURPOSE,
  UAZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
  UAZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
  UAZAPI_WEBHOOK_SECRET_CREDENTIAL_PURPOSE,
} from "../../ports/crmConnectionSetupProvider.js";

export type UazapiProvisionedCredentials = {
  baseUrl: string;
  instanceId: string;
  instanceToken: string;
};

export async function sealUazapiCredentials(
  input: UazapiProvisionedCredentials,
  scope: { storeId: string; tenantId: string },
  ports: CrmServicePorts,
) {
  const vault = getCrmConnectionCredentialVault(ports);
  const credentialScope = {
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  };
  const [baseUrl, instanceId, instanceToken, webhookSecret] = await Promise.all(
    [
      vault.seal({
        ...credentialScope,
        plaintext: input.baseUrl,
        purpose: UAZAPI_BASE_URL_CREDENTIAL_PURPOSE,
      }),
      vault.seal({
        ...credentialScope,
        plaintext: input.instanceId,
        purpose: UAZAPI_INSTANCE_ID_CREDENTIAL_PURPOSE,
      }),
      vault.seal({
        ...credentialScope,
        plaintext: input.instanceToken,
        purpose: UAZAPI_INSTANCE_TOKEN_CREDENTIAL_PURPOSE,
      }),
      vault.seal({
        ...credentialScope,
        plaintext: randomBytes(32).toString("base64url"),
        purpose: UAZAPI_WEBHOOK_SECRET_CREDENTIAL_PURPOSE,
      }),
    ],
  );
  return {
    mode: "stored",
    stored: {
      baseUrl,
      instanceId,
      instanceToken,
      webhookSecret,
    },
  };
}
