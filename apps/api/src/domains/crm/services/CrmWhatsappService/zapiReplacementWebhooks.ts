import { CrmConnectionSetupProviderError } from "../../ports/crmConnectionSetupProvider.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import type { CrmMessagingWebhookConfigResult } from "../../ports/crmMessagingGateway.js";
import {
  buildWhatsappWebhookEndpoints,
  resolveWebhookBaseUrl,
} from "../../whatsapp/whatsappWebhookEndpoints.js";
import { openZapiWebhookSecret } from "../../whatsapp/zapiWebhookSecret.js";
import { assertTrustedZapiWebhookDestination } from "../../whatsapp/zapiWebhookDestination.js";
import {
  getCrmMessagingGateway,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import type { StartZapiReplacementInput } from "./replaceZapiConnection.js";

export async function verifyCandidateWebhooks(
  current: CrmConnection,
  input: StartZapiReplacementInput,
  credentialsRef: Record<string, unknown>,
  operationId: string,
  ports: CrmServicePorts,
) {
  assertTrustedZapiWebhookDestination(
    current.webhookUrl,
    input.canonicalApiOrigin,
  );
  const candidate: CrmConnection = {
    ...current,
    credentialsRef,
    externalInstanceId: null,
  };
  const baseUrl = resolveWebhookBaseUrl({
    basePath: input.basePath,
    requestOrigin: input.canonicalApiOrigin,
    webhookUrl: current.webhookUrl,
  });
  const endpoints = buildWhatsappWebhookEndpoints({
    baseUrl,
    connectionId: current.id,
    token: await openZapiWebhookSecret(candidate, ports),
  });
  let response: { results: readonly CrmMessagingWebhookConfigResult[] };
  try {
    response = await getCrmMessagingGateway(ports).configureWebhooks(
      candidate,
      {
        correlationId: operationId,
        webhooks: endpoints.map((endpoint) => ({
          type: endpoint.type,
          url: endpoint.url,
        })),
      },
    );
  } catch {
    throw new CrmConnectionSetupProviderError(
      "The replacement instance webhook configuration could not be verified.",
      "provider_outcome_indeterminate",
      undefined,
      undefined,
      undefined,
      true,
    );
  }
  const expectedTypes = new Set(endpoints.map((endpoint) => endpoint.type));
  const verified = response.results.filter(
    (result) =>
      expectedTypes.has(result.type as (typeof endpoints)[number]["type"]) &&
      result.ok &&
      result.verified === true,
  );
  if (verified.length !== expectedTypes.size) {
    throw new CrmConnectionSetupProviderError(
      "The replacement instance did not verify all WhatsApp callbacks.",
      "provider_rejected",
      undefined,
      undefined,
      undefined,
      true,
    );
  }
  return response.results;
}
