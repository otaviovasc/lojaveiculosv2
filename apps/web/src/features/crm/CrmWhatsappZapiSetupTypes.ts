import type {
  CrmConnectionAllowance,
  CrmProviderConnection,
  CrmWhatsappZapiAddonContract,
} from "./crmConversationTypes";
import type { CrmConnectionSelfServiceHandlers } from "./CrmConnectionSelfServiceSetup";

export type PairingBlock = "disconnect_required" | "waiting_disconnect" | null;

export type CrmWhatsappZapiSetupProps = {
  allowance: CrmConnectionAllowance;
  canPair: boolean;
  canRepairCredentials?: boolean;
  canSetup: boolean;
  connection: CrmProviderConnection | null;
  handlers: CrmConnectionSelfServiceHandlers;
  onBack: () => void;
  onConnection: (connection: CrmProviderConnection) => void;
  zapiAddonContract: CrmWhatsappZapiAddonContract | null;
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
