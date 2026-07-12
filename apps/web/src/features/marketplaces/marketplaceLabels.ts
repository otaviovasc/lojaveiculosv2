import type {
  MarketplaceAccountConnectionStatus,
  MarketplaceAccountRequirement,
  MarketplaceAccountStatus,
  MarketplaceJobStatus,
  MarketplaceListingBlocker,
  MarketplaceProvider,
  MarketplaceSyncJobType,
} from "./types";

export const providerLabels: Record<MarketplaceProvider, string> = {
  mercado_livre: "Mercado Livre",
  olx: "OLX",
};

export const jobLabels: Record<MarketplaceSyncJobType, string> = {
  listing_publish: "Publicar anúncio",
  listing_unpublish: "Remover anúncio",
  listing_update: "Atualizar anúncio",
};

const connectionStatusLabels: Record<
  MarketplaceAccountConnectionStatus,
  string
> = {
  blocked: "Conta bloqueada",
  connected: "Conta conectada",
  degraded: "Conexão instável",
  not_configured: "Integração indisponível",
  not_connected: "Conta não conectada",
  paused: "Publicação pausada",
  reconnect_required: "Reconexão necessária",
  refreshable: "Conta conectada",
};

const accountStatusLabels: Record<MarketplaceAccountStatus, string> = {
  active: "Conta ativa",
  error: "Conta com falha",
  inactive: "Conta pausada",
};

const jobStatusLabels: Record<MarketplaceJobStatus, string> = {
  cancelled: "Cancelada",
  failed: "Falhou",
  queued: "Na fila",
  running: "Em andamento",
  succeeded: "Concluída",
};

export function getMarketplaceConnectionLabel(
  connectionStatus: MarketplaceAccountConnectionStatus | undefined,
  accountStatus: MarketplaceAccountStatus | undefined,
) {
  if (connectionStatus) return connectionStatusLabels[connectionStatus];
  if (accountStatus) return accountStatusLabels[accountStatus];
  return "Conta não conectada";
}

export function getMarketplaceJobStatusLabel(status: MarketplaceJobStatus) {
  return jobStatusLabels[status];
}

export function getMarketplaceJobTypeLabel(jobType: MarketplaceSyncJobType) {
  return jobLabels[jobType];
}

export function getMarketplaceRequirementCopy(
  requirement: MarketplaceAccountRequirement,
) {
  if (requirement.severity === "ok") {
    return {
      action: "Nenhuma ação necessária.",
      message: "Conta pronta para sincronizar",
    };
  }

  switch (requirement.code) {
    case "MARKETPLACE_ACCOUNT_NOT_CONNECTED":
      return {
        action: "Conecte a conta antes de publicar o estoque.",
        message: "Conta não conectada",
      };
    case "MARKETPLACE_ACCOUNT_PAUSED":
      return {
        action: "Ative a conta para retomar as publicações.",
        message: "Publicação pausada",
      };
    case "MARKETPLACE_ACCOUNT_RECONNECT_REQUIRED":
    case "MARKETPLACE_TOKEN_REFRESH_FAILED":
      return {
        action: "Reconecte a conta antes de sincronizar o estoque.",
        message: "Reconexão necessária",
      };
    case "MARKETPLACE_PROVIDER_NOT_CONFIGURED":
    case "MARKETPLACE_PROVIDER_CONTRACT_MISSING":
      return {
        action: "Peça a um administrador para concluir a integração.",
        message: "Integração ainda indisponível",
      };
    case "MARKETPLACE_PROVIDER_ACCOUNT_BLOCKED":
      return {
        action: "Regularize a conta diretamente no canal de venda.",
        message: "Conta bloqueada pelo canal",
      };
    case "MARKETPLACE_PROVIDER_RATE_LIMITED":
      return {
        action: "Aguarde alguns minutos antes de tentar novamente.",
        message: "Limite temporário do canal",
      };
    case "MARKETPLACE_PROVIDER_UNAVAILABLE":
      return {
        action: "Tente novamente quando o canal estiver disponível.",
        message: "Canal temporariamente indisponível",
      };
    case "MARKETPLACE_LISTING_NOT_READY":
    case "MARKETPLACE_LISTING_MAPPING_REQUIRED":
    case "MARKETPLACE_LISTING_NOT_FOUND":
      return {
        action: "Revise o cadastro e gere uma nova prévia de estoque.",
        message: "Anúncio precisa de revisão",
      };
    case "MARKETPLACE_PROVIDER_VALIDATION_FAILED":
    case "MARKETPLACE_REQUEST_VALIDATION_FAILED":
      return {
        action: "Revise os dados informados antes de tentar novamente.",
        message: "Dados recusados pelo canal",
      };
    case "MARKETPLACE_PROVIDER_CONFLICT":
      return {
        action: "Atualize a página e gere uma nova prévia.",
        message: "Dados alterados durante a sincronização",
      };
    case "MARKETPLACE_SYNC_JOB_NOT_RETRYABLE":
    case "MARKETPLACE_SYNC_JOB_STALE":
      return {
        action: "Gere uma nova prévia antes de reenviar o estoque.",
        message: "Sincronização precisa ser refeita",
      };
    case "MARKETPLACE_SYNC_JOB_INVALID_METADATA":
    case "MARKETPLACE_SYNC_PARTIAL_FAILURE":
    case "MARKETPLACE_ACCOUNT_REQUIREMENT_FAILED":
      return {
        action: "Revise o checklist e tente novamente.",
        message: "Revisão operacional necessária",
      };
  }
}

export function getMarketplaceBlockerCopy(blocker: MarketplaceListingBlocker) {
  switch (blocker.code) {
    case "MARKETPLACE_LISTING_NOT_PUBLIC":
      return {
        action: "Publique o veículo na vitrine da loja.",
        message: "Veículo fora da vitrine pública",
      };
    case "MARKETPLACE_LISTING_NO_PUBLIC_PHOTOS":
      return {
        action: "Adicione e selecione fotos públicas do veículo.",
        message: "Fotos públicas obrigatórias",
      };
    case "MARKETPLACE_LISTING_PRICE_MISSING":
      return {
        action: "Informe o preço de venda do veículo.",
        message: "Preço de venda ausente",
      };
    case "MARKETPLACE_LISTING_FIPE_CATALOG_MISSING":
      return {
        action: "Vincule o veículo ao catálogo FIPE.",
        message: "Referência FIPE ausente",
      };
    case "MARKETPLACE_LISTING_CATALOG_FIELD_MISSING":
      return {
        action: "Complete os dados de marca, modelo e versão.",
        message: "Dados de catálogo incompletos",
      };
    case "MARKETPLACE_LISTING_TECHNICAL_FIELD_MISSING":
      return {
        action: "Complete os dados técnicos exigidos pelo canal.",
        message: "Ficha técnica incompleta",
      };
    case "MARKETPLACE_LISTING_CONTACT_PHONE_MISSING":
      return {
        action: "Informe um telefone comercial nas configurações da loja.",
        message: "Telefone de contato ausente",
      };
    case "MARKETPLACE_LISTING_LOCATION_ZIPCODE_MISSING":
      return {
        action: "Informe o CEP da loja nas configurações.",
        message: "Localização da loja incompleta",
      };
    case "MARKETPLACE_LISTING_LICENSE_PLATE_MISSING":
      return {
        action: "Informe a placa do veículo antes de publicar.",
        message: "Placa do veículo ausente",
      };
    case "MARKETPLACE_LISTING_MAPPING_REQUIRED":
      return {
        action: "Revise a categoria sugerida e gere uma nova prévia.",
        message: "Categoria do canal precisa de revisão",
      };
  }
}
