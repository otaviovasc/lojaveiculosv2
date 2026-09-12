import type {
  CrmChannel,
  CrmChannelRoutingDto,
  CrmConnectionState,
  CrmExternalBotRouteMode,
  CrmProvider,
  CrmResolvedRouteDto,
  CrmRoutingBlockedReasonCode,
  CrmRoutingConnectionDto,
  CrmRoutingPolicyPatchInput,
  CrmRoutingPolicyReadDto,
} from "@lojaveiculosv2/shared";
import { crmConnectionOverviewItemSchema } from "@lojaveiculosv2/shared";

export const crmRoutingChannels = [
  "whatsapp",
  "instagram",
  "olx_chat",
] as const;

export type CrmRoutingChannel = CrmChannel;
export type CrmRoutingBlockedCode = CrmRoutingBlockedReasonCode;
export type CrmRoutingConnection = CrmRoutingConnectionDto;
export type CrmResolvedRoute = CrmResolvedRouteDto;
export type CrmChannelRouting = CrmChannelRoutingDto;
export type CrmRoutingPolicy = CrmRoutingPolicyReadDto;
export type UpdateCrmRoutingPolicyInput = CrmRoutingPolicyPatchInput;
export type { CrmExternalBotRouteMode };

export type CrmRoutingCandidate = {
  channel: CrmRoutingChannel;
  connected: boolean;
  displayName: string;
  id: string;
  provider: CrmProvider;
  ready: boolean;
  state: CrmConnectionState;
};

export function readRoutingCandidates(
  connections: readonly unknown[],
): CrmRoutingCandidate[] {
  return connections.flatMap((value) => {
    const parsed = crmConnectionOverviewItemSchema.safeParse(value);
    if (!parsed.success) return [];
    const connection = parsed.data;
    return [
      {
        channel: connection.channel,
        connected: connection.readiness.ready,
        displayName: connection.displayName,
        id: String(connection.id),
        provider: connection.provider,
        ready: connection.readiness.ready,
        state: connection.state,
      },
    ];
  });
}

export function isCandidateForChannel(
  candidate: CrmRoutingCandidate,
  channel: CrmRoutingChannel,
) {
  return candidate.channel === channel;
}
