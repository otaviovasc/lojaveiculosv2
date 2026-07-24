import type { FeatureStatusTone } from "../../components/ui/FeatureStates";
import type { FiscalDocument } from "./types";

const documentTypeLabels: Record<string, string> = {
  nfe: "Nota Fiscal eletrônica",
  nfe_sale: "NF-e de venda de veículo",
  nfe_vehicle_sale: "NF-e de venda de veículo",
};

const documentStatusLabels: Record<FiscalDocument["status"], string> = {
  authorized: "Autorizada",
  cancelled: "Cancelada",
  draft: "Aguardando emissão",
  error: "Erro na emissão",
  failed: "Falha na emissão",
  issued: "Emitida",
  processing: "Em processamento",
  queued: "Na fila de emissão",
  rejected: "Rejeitada",
};

const configurationLabels: Record<string, string> = {
  SPEDY_API_TOKEN: "Credencial de acesso à Spedy",
  SPEDY_API_URL: "Endereço do serviço da Spedy",
  SPEDY_CANCEL_PATH: "Rota de cancelamento de notas",
  SPEDY_HTTP_GATEWAY: "Conexão do servidor com o serviço fiscal",
  SPEDY_ISSUE_PATH: "Rota de emissão de notas",
  SPEDY_RUNTIME_IMPLEMENTATION: "Modo de conexão com a Spedy",
  SPEDY_STATUS_PATH: "Rota de consulta de notas",
  SPEDY_WEBHOOK_SECRET: "Validação dos retornos da Spedy",
};

export function getFiscalDocumentTypeLabel(documentType: string) {
  return documentTypeLabels[documentType] ?? "Documento fiscal";
}

export function getFiscalDocumentStatusLabel(status: FiscalDocument["status"]) {
  return documentStatusLabels[status];
}

export function getFiscalDocumentKindLabel(
  documentKind: FiscalDocument["documentKind"],
) {
  return documentKind === "nfse" ? "NFS-e" : "NF-e";
}

export function getFiscalDocumentStatusTone(
  status: FiscalDocument["status"],
): FeatureStatusTone {
  if (status === "authorized" || status === "issued") return "success";
  if (status === "error" || status === "failed" || status === "rejected") {
    return "danger";
  }
  if (status === "cancelled") return "neutral";
  return "warning";
}

export function getFiscalConfigurationLabels(keys: readonly string[]) {
  return Array.from(
    new Set(
      keys.map((value) => {
        const key = value.split("=", 1)[0] ?? value;
        return configurationLabels[key] ?? "Configuração técnica da integração";
      }),
    ),
  );
}

export function formatFiscalDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "data não informada";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
