import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmMessage } from "../../ports/crmConversationRepository.js";
import { sendOutboundMessage } from "../../messaging/sendOutboundMessage.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import {
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "../CrmMessagingService/serviceSupport.js";

const permission = "crm.messages.send";

export type SendWhatsappLocationInput = {
  address?: string;
  latitude: number;
  longitude: number;
  name?: string;
  cycleId: string;
  url?: string;
};

export async function sendWhatsappLocation(
  context: ServiceContext,
  input: SendWhatsappLocationInput,
  ports: CrmServicePorts,
): Promise<CrmMessage> {
  return sendStructuredText(context, ports, {
    action: "crm.channel.whatsapp.message.send_location",
    content: input.name ?? "Localizacao",
    leadActivityContent: input.name ?? "Localizacao enviada",
    metadata: {
      fallbackTransport: "text",
      location: {
        address: input.address ?? null,
        latitude: input.latitude,
        longitude: input.longitude,
        name: input.name ?? null,
        url: input.url ?? mapsUrl(input.latitude, input.longitude),
      },
    },
    cycleId: input.cycleId,
    summary: "Sent CRM WhatsApp location message",
    text: formatLocationText(input),
    type: "LOCATION",
  });
}

async function sendStructuredText(
  context: ServiceContext,
  ports: CrmServicePorts,
  input: {
    action: string;
    content: string;
    leadActivityContent: string;
    metadata: Record<string, unknown>;
    cycleId: string;
    summary: string;
    text: string;
    type: "CATALOG" | "LOCATION";
  },
) {
  assertPermission(context, permission);
  logCrmServiceEvent(context, `${input.action}.started`, {
    cycleId: input.cycleId,
  });
  return recordCrmServiceMutation(
    context,
    {
      action: input.action,
      category: "data_change",
      entityId: input.cycleId,
      entityType: "crm_conversation_cycle",
      metadata: { textLength: input.text.length },
      permission,
      summary: input.summary,
    },
    () =>
      sendOutboundMessage(
        context,
        {
          idempotencyPayload: input,
          senderOrigin: "human_crm",
          prepare: async ({ connection, gateway, phone }) => {
            const sent = await gateway.sendText(connection, {
              phone,
              text: input.text,
            });
            return {
              content: input.content,
              leadActivityContent: input.leadActivityContent,
              metadata: {
                ...input.metadata,
                provider: connection.provider,
                sentByActorId: context.actor.id,
              },
              sent,
              type: input.type,
            };
          },
          cycleId: input.cycleId,
        },
        ports,
      ),
  );
}

function formatLocationText(input: SendWhatsappLocationInput) {
  const url = input.url ?? mapsUrl(input.latitude, input.longitude);
  return [input.name ?? "Localizacao da loja", input.address, `Mapa: ${url}`]
    .filter(Boolean)
    .join("\n");
}

function mapsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}
