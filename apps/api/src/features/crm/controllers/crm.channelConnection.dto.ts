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
    provider: connection.provider,
    readiness: connection.readiness,
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
