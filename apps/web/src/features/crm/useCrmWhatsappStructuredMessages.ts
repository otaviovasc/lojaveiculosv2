import type { Dispatch, SetStateAction } from "react";
import type { CrmConversationApi } from "./crmConversationApi";
import {
  createOptimisticStructuredMessage,
  type CrmMessageView,
} from "./crmConversationModel";
import { createOptimisticQuickMessage } from "./crmQuickMessageOptimistic";
import { sendOptimisticStructuredMessage } from "./crmStructuredSender";
import type {
  CrmWhatsappCatalogProductsPage,
  CrmWhatsappListCatalogProductsInput,
  CrmMessage,
  CrmQuickMessage,
  CrmWhatsappSendCatalogInput,
  CrmWhatsappSendCatalogProductInput,
  CrmWhatsappSendLocationInput,
  CrmWhatsappSendVehicleInput,
  CrmConversationCycle,
  CrmConversationCycleId,
} from "./crmConversationTypes";

type StructuredOptions = {
  activeSession: CrmConversationCycle | null;
  activeCycleId: CrmConversationCycleId | null;
  api: CrmConversationApi;
  canLoadMessages: boolean;
  canSendMessages: boolean;
  mergeCycles: (nextSessions: CrmConversationCycle[]) => void;
  setError: (error: Error) => void;
  setIsSending: Dispatch<SetStateAction<boolean>>;
  setMessages: Dispatch<SetStateAction<CrmMessageView[]>>;
};

export function useCrmWhatsappStructuredMessages({
  activeSession,
  activeCycleId,
  api,
  canLoadMessages,
  canSendMessages,
  mergeCycles,
  setError,
  setIsSending,
  setMessages,
}: StructuredOptions) {
  const canSendStructured = Boolean(
    activeCycleId && activeSession && canLoadMessages && canSendMessages,
  );
  const sendStructuredMessage = (input: {
    optimistic: CrmMessageView;
    request: (idempotencyKey: string) => Promise<CrmMessage>;
  }) =>
    sendOptimisticStructuredMessage({
      activeSession: activeSession!,
      mergeCycles,
      optimistic: input.optimistic,
      request: input.request,
      setError,
      setIsSending,
      setMessages,
    });

  const sendLocation = async (
    input: Omit<CrmWhatsappSendLocationInput, "cycleId">,
  ) => {
    if (!canSendStructured) return false;
    return sendStructuredMessage({
      request: (idempotencyKey) =>
        api.sendLocation({
          ...input,
          idempotencyKey,
          cycleId: String(activeCycleId),
        }),
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
    input: Omit<CrmWhatsappSendCatalogInput, "cycleId">,
  ) => {
    if (!canSendStructured) return false;
    return sendStructuredMessage({
      request: (idempotencyKey) =>
        api.sendCatalog({
          ...input,
          idempotencyKey,
          cycleId: String(activeCycleId),
        }),
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
    input: Omit<CrmWhatsappListCatalogProductsInput, "cycleId"> = {},
  ): Promise<CrmWhatsappCatalogProductsPage | null> => {
    if (!canSendStructured) return null;
    return api.listCatalogProducts({
      ...input,
      cycleId: String(activeCycleId),
    });
  };

  const sendCatalogProduct = async (
    input: Omit<CrmWhatsappSendCatalogProductInput, "cycleId">,
  ) => {
    if (!canSendStructured) return false;
    return sendStructuredMessage({
      request: (idempotencyKey) =>
        api.sendCatalogProduct({
          ...input,
          idempotencyKey,
          cycleId: String(activeCycleId),
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
    input: Omit<CrmWhatsappSendVehicleInput, "cycleId">,
  ) => {
    if (!canSendStructured) return false;
    const title = input.title ?? "Veiculo";
    return sendStructuredMessage({
      request: (idempotencyKey) =>
        api.sendVehicle({
          ...input,
          idempotencyKey,
          cycleId: String(activeCycleId),
        }),
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

  const sendQuickMessage = async (quickMessage: CrmQuickMessage) => {
    if (!canSendStructured) return false;
    return sendStructuredMessage({
      request: (idempotencyKey) =>
        api.sendQuickMessage({
          idempotencyKey,
          quickMessageId: quickMessage.id,
          cycleId: String(activeCycleId),
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
