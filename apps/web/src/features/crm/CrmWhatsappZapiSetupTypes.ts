import type { CrmProviderConnection } from "./crmConversationTypes";
import type { CrmConnectionSelfServiceHandlers } from "./CrmConnectionSelfServiceSetup";

export type PairingBlock = "disconnect_required" | "waiting_disconnect" | null;

export type CrmWhatsappZapiSetupProps = {
  canPair: boolean;
  canRepairCredentials?: boolean;
  canSetup: boolean;
  connection: CrmProviderConnection | null;
  handlers: CrmConnectionSelfServiceHandlers;
  initialCredentialMode?: "repair" | "replacement";
  onBack: () => void;
  onConnection: (connection: CrmProviderConnection) => void;
};

export function readZapiConnectionStateKey(
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
