import type { Dispatch, SetStateAction } from "react";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import {
  createOptimisticStructuredMessage,
  type WhatsappMessageView,
} from "./crmWhatsappModel";
import { createOptimisticQuickMessage } from "./crmWhatsappQuickMessageOptimistic";
import { sendOptimisticStructuredMessage } from "./crmWhatsappStructuredSender";
import type {
  CrmWhatsappCatalogProductsPage,
  CrmWhatsappListCatalogProductsInput,
  CrmWhatsappMessage,
  CrmWhatsappQuickMessage,
  CrmWhatsappSendCatalogInput,
  CrmWhatsappSendCatalogProductInput,
  CrmWhatsappSendLocationInput,
  CrmWhatsappSendVehicleInput,
  CrmWhatsappSession,
  CrmWhatsappSessionId,
} from "./crmWhatsappTypes";

type StructuredOptions = {
  activeSession: CrmWhatsappSession | null;
  activeSessionId: CrmWhatsappSessionId | null;
  api: CrmWhatsappApi;
  canLoadMessages: boolean;
  canSendMessages: boolean;
  mergeSessions: (nextSessions: CrmWhatsappSession[]) => void;
  setError: (error: Error) => void;
  setIsSending: Dispatch<SetStateAction<boolean>>;
  setMessages: Dispatch<SetStateAction<WhatsappMessageView[]>>;
};

export function useCrmWhatsappStructuredMessages({
  activeSession,
  activeSessionId,
  api,
  canLoadMessages,
  canSendMessages,
  mergeSessions,
  setError,
  setIsSending,
  setMessages,
}: StructuredOptions) {
  const canSendStructured = Boolean(
    activeSessionId && activeSession && canLoadMessages && canSendMessages,
  );
  const sendStructuredMessage = (input: {
    optimistic: WhatsappMessageView;
    request: () => Promise<CrmWhatsappMessage>;
  }) =>
    sendOptimisticStructuredMessage({
      activeSession: activeSession!,
      mergeSessions,
      optimistic: input.optimistic,
      request: input.request,
      setError,
      setIsSending,
      setMessages,
    });

  const sendLocation = async (
    input: Omit<CrmWhatsappSendLocationInput, "sessionId">,
  ) => {
    if (!canSendStructured) return false;
    return sendStructuredMessage({
      request: () =>
        api.sendLocation({ ...input, sessionId: String(activeSessionId) }),
      optimistic: createOptimisticStructuredMessage({
        content: input.name ?? "Localizacao",
        metadata: {
          location: {
            address: input.address ?? null,
            latitude: input.latitude,
            longitude: input.longitude,
            name: input.name ?? null,
            url: input.url ?? null,
          },
        },
        type: "LOCATION",
      }),
    });
  };

  const sendCatalog = async (
    input: Omit<CrmWhatsappSendCatalogInput, "sessionId">,
  ) => {
    if (!canSendStructured) return false;
    return sendStructuredMessage({
      request: () =>
        api.sendCatalog({ ...input, sessionId: String(activeSessionId) }),
      optimistic: createOptimisticStructuredMessage({
        content: input.title ?? "Catalogo",
        metadata: {
          catalog: {
            catalogUrl: input.catalogUrl,
            message: input.message ?? null,
            title: input.title ?? null,
          },
        },
        type: "CATALOG",
      }),
    });
  };

  const listCatalogProducts = async (
    input: Omit<CrmWhatsappListCatalogProductsInput, "sessionId"> = {},
  ): Promise<CrmWhatsappCatalogProductsPage | null> => {
    if (!canSendStructured) return null;
    return api.listCatalogProducts({
      ...input,
      sessionId: String(activeSessionId),
    });
  };

  const sendCatalogProduct = async (
    input: Omit<CrmWhatsappSendCatalogProductInput, "sessionId">,
  ) => {
    if (!canSendStructured) return false;
    return sendStructuredMessage({
      request: () =>
        api.sendCatalogProduct({
          ...input,
          sessionId: String(activeSessionId),
        }),
      optimistic: createOptimisticStructuredMessage({
        content: input.productName ?? "Produto do catalogo",
        metadata: {
          catalogProduct: {
            catalogPhone: input.catalogPhone ?? null,
            productId: input.productId,
            productName: input.productName ?? null,
          },
        },
        type: "CATALOG",
      }),
    });
  };

  const sendVehicle = async (
    input: Omit<CrmWhatsappSendVehicleInput, "sessionId">,
  ) => {
    if (!canSendStructured) return false;
    const title = input.title ?? "Veiculo";
    return sendStructuredMessage({
      request: () =>
        api.sendVehicle({ ...input, sessionId: String(activeSessionId) }),
      optimistic: createOptimisticStructuredMessage({
        content: title,
        metadata: {
          vehicle: {
            description: input.description ?? null,
            listingId: input.listingId ?? null,
            mileageLabel: input.mileageLabel ?? null,
            priceLabel: input.priceLabel ?? null,
            thumbnailUrl: input.thumbnailUrl ?? null,
            title,
            unitId: input.unitId ?? null,
            url: input.url ?? null,
            year: input.year ?? null,
          },
        },
        type: "CATALOG",
      }),
    });
  };

  const sendQuickMessage = async (quickMessage: CrmWhatsappQuickMessage) => {
    if (!canSendStructured) return false;
    return sendStructuredMessage({
      request: () =>
        api.sendQuickMessage({
          quickMessageId: quickMessage.id,
          sessionId: String(activeSessionId),
        }),
      optimistic: createOptimisticQuickMessage(quickMessage),
    });
  };

  return {
    listCatalogProducts,
    sendCatalog,
    sendCatalogProduct,
    sendLocation,
    sendQuickMessage,
    sendVehicle,
  };
}
