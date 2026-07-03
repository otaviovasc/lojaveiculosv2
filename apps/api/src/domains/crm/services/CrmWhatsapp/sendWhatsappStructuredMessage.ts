import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { WhatsappMessage } from "../../whatsapp/whatsappModels.js";
import { sendWhatsappOutboundMessage } from "../../whatsapp/sendWhatsappOutboundMessage.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";

const permission = "crm.whatsapp.send";

export type SendWhatsappLocationInput = {
  address?: string;
  latitude: number;
  longitude: number;
  name?: string;
  sessionId: string;
  url?: string;
};

export async function sendWhatsappLocation(
  context: ServiceContext,
  input: SendWhatsappLocationInput,
  ports: CrmServicePorts,
): Promise<WhatsappMessage> {
  return sendStructuredText(context, ports, {
    action: "crm.whatsapp.message.send_location",
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
    sessionId: input.sessionId,
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
    sessionId: string;
    summary: string;
    text: string;
    type: "CATALOG" | "LOCATION";
  },
) {
  assertPermission(context, permission);
  logWhatsappServiceEvent(context, `${input.action}.started`, {
    sessionId: input.sessionId,
  });
  return recordWhatsappServiceMutation(
    context,
    {
      action: input.action,
      category: "data_change",
      entityId: input.sessionId,
      entityType: "crm_whatsapp_session",
      metadata: { textLength: input.text.length },
      permission,
      summary: input.summary,
    },
    () =>
      sendWhatsappOutboundMessage(
        context,
        {
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
                raw: sent.raw,
                sentByActorId: context.actor.id,
              },
              sent,
              type: input.type,
            };
          },
          sessionId: input.sessionId,
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
