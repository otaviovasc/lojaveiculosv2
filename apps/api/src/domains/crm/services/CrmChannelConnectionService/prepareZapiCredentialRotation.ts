import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import { CrmMessageActionError } from "../../messaging/crmMessagingErrors.js";
import {
  completeZapiWebhookSetupAttempt,
  createZapiWebhookSetupIntent,
  markZapiWebhookSetupAttempt,
  withZapiWebhookSetupState,
} from "../../whatsapp/zapiWebhookSetupState.js";
import type { UpdateCrmChannelConnectionInput } from "../../channelConnections/channelConnectionUpdates.js";
import { getZapiConnectionSetupProvider } from "../CrmService/crmConnectionSetupSupport.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { verifyCandidateWebhooks } from "../CrmWhatsappService/zapiReplacementWebhooks.js";
import { crmChannelConnectionCapabilityFacts } from "../../channelConnections/connectionCreation.js";

export class CrmZapiCredentialVerificationError extends Error {
  constructor() {
    super("The supplied Z-API credentials could not be verified.");
    this.name = "CrmZapiCredentialVerificationError";
  }
}

export async function prepareZapiCredentialRotation(
  current: CrmConnection,
  input: UpdateCrmChannelConnectionInput,
  credentialsRef: Record<string, unknown>,
  ports: CrmServicePorts,
) {
  const credentials = input.instanceCredentials;
  const target = input.webhookSetupTarget;
  if (!credentials || !target) {
    throw new CrmMessageActionError(
      "Z-API credential rotation requires canonical webhook verification.",
      409,
    );
  }
  let results: Awaited<ReturnType<typeof verifyCandidateWebhooks>>;
  let providerStatus: Awaited<
    ReturnType<
      ReturnType<typeof getZapiConnectionSetupProvider>["validateStatus"]
    >
  >;
  try {
    providerStatus = await getZapiConnectionSetupProvider(ports).validateStatus(
      {
        clientToken: credentials.clientToken,
        instanceId: credentials.instanceId,
        instanceToken: credentials.instanceToken,
      },
    );
    results = await verifyCandidateWebhooks(
      current,
      {
        ...credentials,
        ...target,
        connectionId: current.id,
        expectedRevision: current.revision ?? 0,
        idempotencyKey: crypto.randomUUID(),
      },
      credentialsRef,
      crypto.randomUUID(),
      ports,
    );
  } catch {
    throw new CrmZapiCredentialVerificationError();
  }
  const setup = markZapiWebhookSetupAttempt(
    createZapiWebhookSetupIntent(current.id),
    { expiresAt: new Date(), owner: "credential_rotation_preflight" },
  );
  return {
    metadata: {
      ...withZapiWebhookSetupState(
        current.metadata,
        completeZapiWebhookSetupAttempt(setup, results),
      ),
      capabilities: crmChannelConnectionCapabilityFacts({
        broker: "direct",
        channel: "whatsapp",
        provider: "zapi",
      }),
      connected: providerStatus.connected,
      degraded: false,
      errorCode: providerStatus.connected ? null : "disconnected",
      providerConnected: providerStatus.connected,
    },
    phone: providerStatus.connectedPhone,
    status: providerStatus.connected
      ? ("active" as const)
      : ("disconnected" as const),
  };
}
