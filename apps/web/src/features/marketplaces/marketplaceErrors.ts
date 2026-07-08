import { AppApiError } from "../../lib/apiErrors";
import { providerLabels } from "./marketplaceLabels";
import type { MarketplaceProvider } from "./types";

export type MarketplaceErrorDisplay = {
  failed: string;
  fix: string;
  provider: string;
  requestId: string;
  vehicleLabel: string;
};

export function formatMarketplaceError(
  error: unknown,
  fallback: string,
): MarketplaceErrorDisplay {
  if (error instanceof AppApiError) {
    const details = readErrorDetails(error.details);
    const provider = readProvider(details.provider);
    return {
      failed: error.userMessage || error.technicalMessage || fallback,
      fix: details.userAction ?? userActionForCode(error.code),
      provider: provider ? providerLabels[provider] : "Nao informado",
      requestId: error.requestId ?? details.requestId ?? "Nao informado",
      vehicleLabel:
        details.vehicleLabel ?? details.listingId ?? "Estoque da loja",
    };
  }

  if (error instanceof Error) {
    return {
      failed: error.message,
      fix: "Revise a configuracao da conta e tente novamente.",
      provider: "Nao informado",
      requestId: "Nao informado",
      vehicleLabel: "Estoque da loja",
    };
  }

  return {
    failed: fallback,
    fix: "Atualize a tela e tente novamente.",
    provider: "Nao informado",
    requestId: "Nao informado",
    vehicleLabel: "Estoque da loja",
  };
}

function readErrorDetails(details: unknown) {
  if (!details || typeof details !== "object") return {};
  const source = details as Record<string, unknown>;
  return {
    listingId: readString(source.listingId),
    provider: readString(source.provider),
    requestId: readString(source.requestId),
    userAction: readString(source.userAction),
    vehicleLabel: readString(source.vehicleLabel),
  };
}

function readProvider(value: string | undefined): MarketplaceProvider | null {
  if (value === "mercado_livre" || value === "olx") return value;
  return null;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function userActionForCode(code: string | undefined) {
  switch (code) {
    case "MARKETPLACE_ACCOUNT_NOT_CONNECTED":
      return "Conecte a conta do provedor antes de sincronizar.";
    case "MARKETPLACE_ACCOUNT_RECONNECT_REQUIRED":
    case "MARKETPLACE_TOKEN_REFRESH_FAILED":
      return "Reconecte a conta do provedor.";
    case "MARKETPLACE_PROVIDER_NOT_CONFIGURED":
    case "MARKETPLACE_PROVIDER_CONTRACT_MISSING":
      return "Peça para a administracao revisar a configuracao do provedor.";
    case "MARKETPLACE_PROVIDER_RATE_LIMITED":
      return "Aguarde o limite do provedor liberar e tente novamente.";
    case "MARKETPLACE_SYNC_JOB_NOT_RETRYABLE":
      return "Crie uma nova previa de estoque antes de tentar novamente.";
    default:
      return "Revise os bloqueios do estoque e tente novamente.";
  }
}
