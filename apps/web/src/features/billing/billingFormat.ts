import type { BillingEntitlementStatus, EntitlementKey } from "./types";

export const featureLabels: Record<EntitlementKey, string> = {
  analytics: "Relatorios",
  compliance: "Compliance",
  crm: "CRM",
  custom_domain: "Dominio proprio",
  external_api: "API externa",
  marketplace: "Marketplaces",
  nfe: "NF-e",
  plate_lookup: "Consulta placa",
  subdomain: "Subdominio",
};

export function isEnabled(status: BillingEntitlementStatus) {
  return status === "active" || status === "trialing";
}

export function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(cents / 100);
}
