import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { WhatsappMessage } from "../../whatsapp/whatsappModels.js";
import { sendWhatsappOutboundMessage } from "../../whatsapp/sendWhatsappOutboundMessage.js";
import type {
  VehicleListing,
  VehicleMedia,
  VehicleUnit,
} from "../../../vehicle/ports/vehicleInventoryRepository.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";
import {
  clampMediaLimit,
  createVehicleSummary,
  fileNameFromUrl,
  formatVehicleText,
  mimeTypeFromUrl,
  resolveVehiclePackage,
  type SendWhatsappVehicleInput,
  type VehicleSummaryMessage,
  WhatsappVehicleNotFoundError,
  WhatsappVehiclePartialSendError,
} from "./sendWhatsappVehicleSupport.js";

export type { SendWhatsappVehicleInput };
export { WhatsappVehicleNotFoundError, WhatsappVehiclePartialSendError };

const permission = "crm.whatsapp.send";

export async function sendWhatsappVehicle(
  context: ServiceContext,
  input: SendWhatsappVehicleInput,
  ports: CrmServicePorts,
): Promise<WhatsappMessage> {
  assertPermission(context, permission);
  if (!input.listingId && !input.unitId) {
    return sendVehicleText(context, ports, createVehicleSummary(input));
  }

  const packageData = await resolveVehiclePackage(context, input, ports);
  const media = packageData.media.slice(0, clampMediaLimit(input.mediaLimit));
  logWhatsappServiceEvent(
    context,
    "crm.whatsapp.message.send_vehicle.started",
    {
      listingId: packageData.listing.id,
      mediaCount: media.length,
      sessionId: input.sessionId,
      unitId: packageData.unit?.id ?? null,
    },
  );

  return recordWhatsappServiceMutation(
    context,
    {
      action: "crm.whatsapp.message.send_vehicle",
      category: "data_change",
      entityId: input.sessionId,
      entityType: "crm_whatsapp_session",
      metadata: {
        listingId: packageData.listing.id,
        mediaCount: media.length,
        unitId: packageData.unit?.id ?? null,
      },
      permission,
      summary: "Sent CRM WhatsApp vehicle package",
    },
    async () => {
      for (const [index, item] of media.entries()) {
        try {
          await sendInventoryVehicleMedia(context, ports, {
            caption: index === 0 ? formatVehicleText(packageData.summary) : "",
            listing: packageData.listing,
            media: item,
            sessionId: input.sessionId,
            unit: packageData.unit,
          });
        } catch (error) {
          throw new WhatsappVehiclePartialSendError({
            failedMediaId: item.id,
            providerMessage: messageFromError(error),
            sentMediaCount: index,
            totalMediaCount: media.length,
          });
        }
      }

      return sendVehicleText(context, ports, {
        ...createVehicleSummary(packageData.summary),
        metadata: {
          fallbackTransport: "text",
          mediaSentCount: media.length,
          providerTransport: media.length ? "zapi_media_sequence" : "text",
          vehicle: {
            description: packageData.summary.description ?? null,
            listingId: packageData.listing.id,
            mediaIds: media.map((item) => item.id),
            mileageLabel: packageData.summary.mileageLabel ?? null,
            priceLabel: packageData.summary.priceLabel ?? null,
            publicSlug: packageData.listing.publicSlug ?? null,
            status: packageData.listing.status,
            thumbnailUrl: packageData.summary.thumbnailUrl ?? null,
            title: packageData.summary.title,
            unitId: packageData.unit?.id ?? null,
            unitStatus: packageData.unit?.status ?? null,
            url: packageData.summary.url ?? null,
            year: packageData.summary.year ?? null,
          },
        },
      });
    },
  );
}

function messageFromError(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "Unknown provider failure.";
}

async function sendVehicleText(
  context: ServiceContext,
  ports: CrmServicePorts,
  input: VehicleSummaryMessage,
) {
  logWhatsappServiceEvent(context, `${input.action}.summary_started`, {
    sessionId: input.sessionId,
  });
  return sendWhatsappOutboundMessage(
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
          type: "CATALOG",
        };
      },
      sessionId: input.sessionId,
    },
    ports,
  );
}

async function sendInventoryVehicleMedia(
  context: ServiceContext,
  ports: CrmServicePorts,
  input: {
    caption: string;
    listing: VehicleListing;
    media: VehicleMedia;
    sessionId: string;
    unit: VehicleUnit | null;
  },
) {
  const mediaType = input.media.kind === "video" ? "video" : "image";
  return sendWhatsappOutboundMessage(
    context,
    {
      prepare: async ({ connection, gateway, phone }) => {
        const sent = await gateway.sendMedia(connection, {
          ...(input.caption ? { caption: input.caption } : {}),
          fileName: fileNameFromUrl(input.media.url),
          mediaType,
          mediaUrl: input.media.url,
          mimeType: mimeTypeFromUrl(input.media.url, mediaType),
          phone,
        });
        return {
          content: input.caption || `[${mediaType}]`,
          leadActivityContent:
            input.caption ||
            `${mediaType === "video" ? "Video" : "Foto"} do veiculo`,
          mediaType,
          mediaUrl: input.media.url,
          metadata: {
            media: {
              ...(input.caption ? { caption: input.caption } : {}),
              fileName: fileNameFromUrl(input.media.url),
              inventoryMediaId: input.media.id,
              mimeType: mimeTypeFromUrl(input.media.url, mediaType),
              source: "vehicle_inventory",
            },
            provider: connection.provider,
            raw: sent.raw,
            sentByActorId: context.actor.id,
            vehicle: {
              listingId: input.listing.id,
              title: input.listing.title,
              unitId: input.unit?.id ?? null,
            },
          },
          sent,
          type: mediaType === "video" ? "VIDEO" : "IMAGE",
        };
      },
      sessionId: input.sessionId,
    },
    ports,
  );
}
