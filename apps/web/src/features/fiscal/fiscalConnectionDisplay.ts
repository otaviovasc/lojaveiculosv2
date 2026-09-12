import type { FeatureStatusTone } from "../../components/ui/FeatureStates";
import type {
  FiscalConnection,
  FiscalConnectionStatus,
  FiscalDefaultsStatus,
} from "./types";

export type FiscalReadinessItem = {
  done: boolean;
  label: string;
};

export type FiscalCapabilityEntry = {
  key: string;
  label: string;
  value: string;
};

const connectionStatusLabels: Record<FiscalConnectionStatus, string> = {
  error: "Erro na integração",
  not_configured: "Não configurada",
  pending_review: "Revisão pendente",
  ready: "Pronta para emitir",
};

const defaultsStatusLabels: Record<FiscalDefaultsStatus, string> = {
  confirmed: "Padrões confirmados",
  missing: "Padrões não importados",
  unconfirmed: "Padrões importados aguardando confirmação",
};

const capabilityLabels: Record<string, string> = {
  cancel: "Cancelamento de notas",
  cancellation: "Cancelamento de notas",
  emission: "Emissão de notas",
  nfe: "NF-e (produto)",
  nfse: "NFS-e (serviço)",
  requiresDigitalCertificate: "Exige certificado digital A1",
  status: "Consulta de status",
  statusQuery: "Consulta de status",
  webhook: "Retorno automático de eventos",
};

export function getFiscalConnectionStatusLabel(status: FiscalConnectionStatus) {
  return connectionStatusLabels[status];
}

export function getFiscalConnectionStatusTone(
  status: FiscalConnectionStatus,
): FeatureStatusTone {
  if (status === "ready") return "success";
  if (status === "error") return "danger";
  if (status === "pending_review") return "warning";
  return "neutral";
}

export function getFiscalDefaultsStatusLabel(status: FiscalDefaultsStatus) {
  return defaultsStatusLabels[status];
}

export function getFiscalDefaultsStatusTone(
  status: FiscalDefaultsStatus,
): FeatureStatusTone {
  if (status === "confirmed") return "success";
  if (status === "unconfirmed") return "warning";
  return "neutral";
}

/**
 * Mirrors the readiness rules enforced by the API in
 * `manageFiscalConnection.ts` so the UI can explain what still blocks
 * issuance before attempting an operation.
 */
export function buildFiscalReadinessChecklist(
  connection: FiscalConnection,
): FiscalReadinessItem[] {
  const items: FiscalReadinessItem[] = [
    { done: Boolean(connection.companyId), label: "Empresa emissora criada" },
    {
      done: connection.defaultsStatus === "confirmed",
      label: "Padrões fiscais revisados e confirmados",
    },
  ];
  if (requiresDigitalCertificate(connection.capabilities)) {
    items.push({
      done: hasValidCertificate(connection.certificateExpiresAt),
      label: "Certificado digital A1 válido",
    });
  }
  items.push({
    done: Boolean(connection.webhookRegisteredAt),
    label: "Retorno de eventos registrado",
  });
  return items;
}

export function listFiscalCapabilities(
  capabilities: Record<string, unknown>,
): FiscalCapabilityEntry[] {
  return Object.entries(capabilities)
    .filter(([, value]) => isMeaningfulCapability(value))
    .map(([key, value]) => ({
      key,
      label: capabilityLabels[key] ?? humanizeFiscalKey(key),
      value: formatFiscalDefaultValue(value),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

export function describeFiscalCertificate(
  certificateExpiresAt: string | null,
  now: Date = new Date(),
): { detail: string; label: string; tone: FeatureStatusTone } {
  if (!certificateExpiresAt) {
    return {
      detail: "Nenhum certificado A1 enviado para esta conexão.",
      label: "Não enviado",
      tone: "neutral",
    };
  }
  const expiresAt = new Date(certificateExpiresAt);
  if (Number.isNaN(expiresAt.getTime())) {
    return {
      detail: "A validade do certificado não foi informada pelo provedor.",
      label: "Validade desconhecida",
      tone: "warning",
    };
  }
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(expiresAt);
  if (expiresAt.getTime() <= now.getTime()) {
    return {
      detail: `O certificado A1 expirou em ${formatted}. Envie um novo arquivo para emitir.`,
      label: "Expirado",
      tone: "danger",
    };
  }
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  if (expiresAt.getTime() - now.getTime() <= thirtyDaysMs) {
    return {
      detail: `O certificado A1 expira em ${formatted}. Programe a renovação.`,
      label: "Expira em breve",
      tone: "warning",
    };
  }
  return {
    detail: `Certificado A1 válido até ${formatted}.`,
    label: "Válido",
    tone: "success",
  };
}

export function requiresDigitalCertificate(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(requiresDigitalCertificate);
  const record = value as Record<string, unknown>;
  return (
    record.requiresDigitalCertificate === true ||
    Object.values(record).some(requiresDigitalCertificate)
  );
}

export function hasValidCertificate(certificateExpiresAt: string | null) {
  if (!certificateExpiresAt) return false;
  const expiresAt = new Date(certificateExpiresAt);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() > Date.now();
}

export function getFiscalDefaultLabel(key: string) {
  const labels: Record<string, string> = {
    cfop: "CFOP padrão",
    cst: "CST padrão",
    csosn: "CSOSN padrão",
    ncm: "NCM padrão",
    origin: "Origem da mercadoria",
  };
  return labels[key] ?? humanizeFiscalKey(key);
}

export function formatFiscalDefaultValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "—";
  }
}

function isMeaningfulCapability(value: unknown) {
  if (value === false || value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function humanizeFiscalKey(key: string) {
  const words = key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return words
    ? words.charAt(0).toUpperCase() + words.slice(1)
    : "Capacidade do provedor";
}
