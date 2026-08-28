import type {
  CrmConversationCycleDto,
  CrmMessageDto,
} from "@lojaveiculosv2/shared";
import type {
  CrmPresencePayload,
  CrmRealtimeEvent,
} from "../../../domains/crm/ports/crmRealtimePublisher.js";
import { toConversationCycleDto } from "./crm.conversationCycle.dto.js";
import { toCrmMessageDto } from "./crm.message.dto.js";

type CrmRealtimeEventDto =
  | {
      connectionId: string;
      conversationCycle: CrmConversationCycleDto;
      message: CrmMessageDto;
      type: "message";
    }
  | {
      connectionId: string;
      conversationCycle: CrmConversationCycleDto;
      type: "conversationCycle";
    }
  | {
      connectionId: string;
      cycleId: string;
      lastCustomerReadAt?: string;
      messageId: string;
      status: string;
      type: "message_status";
    }
  | {
      connectionId: string;
      phone: string | null;
      status: string;
      type: "connection_status";
    }
  | {
      connectionId: string;
      cycleId: string;
      payload: Pick<CrmPresencePayload, "state">;
      type: "presence";
    };

export function toCrmRealtimeEventDto(
  event: CrmRealtimeEvent,
): CrmRealtimeEventDto {
  switch (event.type) {
    case "message":
      return {
        connectionId: event.connectionId,
        conversationCycle: toConversationCycleDto(event.conversationCycle),
        message: toCrmMessageDto(event.message),
        type: event.type,
      };
    case "conversationCycle":
      return {
        connectionId: event.connectionId,
        conversationCycle: toConversationCycleDto(event.conversationCycle),
        type: event.type,
      };
    case "message_status":
      return {
        connectionId: event.connectionId,
        cycleId: event.cycleId,
        ...(event.lastCustomerReadAt
          ? { lastCustomerReadAt: event.lastCustomerReadAt }
          : {}),
        messageId: event.messageId,
        status: event.status,
        type: event.type,
      };
    case "connection_status":
      return {
        connectionId: event.connectionId,
        phone: event.phone,
        status: event.status,
        type: event.type,
      };
    case "presence":
      return {
        connectionId: event.connectionId,
        cycleId: event.cycleId,
        payload: { state: event.payload.state },
        type: event.type,
      };
  }
}
