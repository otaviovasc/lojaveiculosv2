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
  return {
    ...toChannelConnectionDto(connection),
    setup: connection.setup,
  };
}
