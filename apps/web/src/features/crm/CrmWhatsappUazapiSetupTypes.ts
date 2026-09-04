import type { CrmProviderConnection } from "./crmConversationTypes";
import type { CrmConnectionSelfServiceHandlers } from "./CrmConnectionSelfServiceSetup";
import type { PairingBlock } from "./CrmWhatsappZapiSetupTypes";

export type { PairingBlock };

export type CrmWhatsappUazapiSetupProps = {
  canPair: boolean;
  canSetup: boolean;
  connection: CrmProviderConnection | null;
  handlers: CrmConnectionSelfServiceHandlers;
  onBack: () => void;
  onConnection: (connection: CrmProviderConnection) => void;
};

export function readUazapiConnectionStateKey(
  connection: CrmProviderConnection | null,
) {
  return [
    connection?.id ?? "none",
    connection?.externalInstanceId ?? "none",
    connection?.setup?.status ?? "none",
    connection?.live?.providerStatus ?? "unknown",
    connection?.readiness?.ready ?? connection?.ready ?? "unknown",
    connection?.state ?? connection?.status ?? "unknown",
  ].join(":");
}
