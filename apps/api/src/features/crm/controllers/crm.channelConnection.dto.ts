import type {
  CrmChannelConnectionDto,
  CrmConnectionOverviewItem,
} from "@lojaveiculosv2/shared";
import type { CrmChannelConnection } from "../../../domains/crm/channelConnections/channelConnectionModels.js";

export function toChannelConnectionDto(
  connection: CrmChannelConnection,
): CrmChannelConnectionDto {
  return {
    capabilities: connection.capabilities,
    channel: connection.channel,
    displayName: connection.displayName,
    id: connection.id,
    isDefault: connection.isDefault,
    ...(connection.memberUserIds
      ? { memberUserIds: connection.memberUserIds }
      : {}),
    ...(connection.phoneNumber !== undefined
      ? { phoneNumber: connection.phoneNumber }
      : {}),
    provider: connection.provider,
    ...(connection.state === "sandbox" &&
    connection.metadata.purpose === "crm_ui_demo"
      ? { purpose: "ui_demo" as const }
      : {}),
    ...(connection.revision !== undefined
      ? { revision: connection.revision }
      : {}),
    readiness: connection.readiness,
    routingStatus: connection.routingStatus,
    state: connection.state,
  };
}

export function toChannelConnectionOverviewItem(
  connection: CrmChannelConnection,
): CrmConnectionOverviewItem {
  const live =
    connection.live.providerStatus === "error"
      ? {
          ...connection.live,
          checkedAt: connection.live.checkedAt.toISOString(),
          errorMessage: "Não foi possível verificar o status do provedor.",
        }
      : {
          ...connection.live,
          checkedAt: connection.live.checkedAt.toISOString(),
        };
  return {
    ...toChannelConnectionDto(connection),
    live,
    setup: connection.setup,
  };
}
