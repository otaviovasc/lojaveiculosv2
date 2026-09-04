import type { EntitlementKey } from "@lojaveiculosv2/shared";
import {
  createPlanFeatures,
  defineBillingCatalog,
} from "../billingCatalogDefinition.js";

const free = [
  "storefront",
  "inventory",
  "lead_capture",
  "plate_lookup",
] as const;
const essencial = [...free, "custom_domain", "sales", "financing"] as const;
const operacao = [...essencial, "crm", "documents"] as const;
const gestao = [
  ...operacao,
  "fiscal",
  "finance",
  "commissions",
  "analytics",
  "compliance",
  "checklists",
] as const;
const escala = [
  ...gestao,
  "marketplace",
  "external_api",
  "automation",
  "ai",
] as const;

const freeCapabilities = [
  "storefront_builder",
  "vehicle_listing_control",
  "public_interest_capture",
  "basic_lead_inbox",
] as const;
const essencialCapabilities = [
  ...freeCapabilities,
  "custom_domain",
  "reservations_and_sales",
  "customers",
  "internal_financing_workflow",
  "connected_financing_when_verified",
] as const;
const operacaoCapabilities = [
  ...essencialCapabilities,
  "full_crm",
  "official_channels",
  "byok_zapi",
  "document_workspace",
  "document_templates",
] as const;
const gestaoCapabilities = [
  ...operacaoCapabilities,
  "fiscal",
  "finance",
  "commissions",
  "analytics",
  "compliance",
  "checklists",
  "finance_auto_entry_rules",
] as const;
const escalaCapabilities = [
  ...gestaoCapabilities,
  "marketplaces",
  "public_api_and_webhooks",
  "advanced_automation",
  "ai_studio",
  "resale_analysis_ai",
] as const;

export const billingCatalog2026_08_v3 = defineBillingCatalog({
  addons: [],
  plans: [
    plan({
      capabilities: freeCapabilities,
      code: "free",
      checkoutMode: "free",
      id: "83262608-0000-4000-8000-000000000001",
      included: free,
      isDefault: true,
      monthlyPriceCents: 0,
      name: "Free",
      plateLookupLimit: 3,
      selectionRank: 1,
      sellerLimit: 1,
      vehicleLimit: 10,
    }),
    plan({
      capabilities: essencialCapabilities,
      code: "essencial",
      id: "83262608-0000-4000-8000-000000000002",
      included: essencial,
      monthlyPriceCents: 19_700,
      name: "Essencial",
      plateLookupLimit: 25,
      selectionRank: 2,
      sellerLimit: 3,
      vehicleLimit: 75,
    }),
    plan({
      capabilities: operacaoCapabilities,
      code: "operacao",
      id: "83262608-0000-4000-8000-000000000003",
      included: operacao,
      monthlyPriceCents: 39_700,
      name: "Operação",
      plateLookupLimit: 75,
      selectionRank: 3,
      sellerLimit: 5,
      vehicleLimit: 150,
    }),
    plan({
      capabilities: gestaoCapabilities,
      code: "gestao",
      id: "83262608-0000-4000-8000-000000000004",
      included: gestao,
      monthlyPriceCents: 59_700,
      name: "Gestão",
      plateLookupLimit: 150,
      selectionRank: 4,
      sellerLimit: 10,
      vehicleLimit: 300,
    }),
    plan({
      capabilities: escalaCapabilities,
      checkoutMode: "quote_required",
      code: "escala",
      id: "83262608-0000-4000-8000-000000000005",
      included: escala,
      monthlyPriceCents: 89_700,
      name: "Escala",
      plateLookupLimit: null,
      selectionRank: 5,
      sellerLimit: null,
      vehicleLimit: null,
    }),
  ],
  publishedAt: "2026-08-25T03:00:00.000Z",
  version: "2026-08-v3",
});

function plan(input: {
  capabilities: readonly string[];
  checkoutMode?: "checkout" | "free" | "quote_required";
  code: string;
  id: string;
  included: readonly EntitlementKey[];
  isDefault?: boolean;
  monthlyPriceCents: number;
  name: string;
  plateLookupLimit: number | null;
  selectionRank: number;
  sellerLimit: number | null;
  vehicleLimit: number | null;
}) {
  return {
    capabilities: input.capabilities,
    checkoutMode: input.checkoutMode ?? ("checkout" as const),
    code: input.code,
    features: createPlanFeatures({
      included: input.included,
      includedInTrial: [],
      ...(input.plateLookupLimit === null
        ? {}
        : { limits: { plate_lookup: input.plateLookupLimit } }),
    }),
    id: input.id,
    isDefault: input.isDefault ?? false,
    limits: {
      sellerLimit: input.sellerLimit,
      vehicleLimit: input.vehicleLimit,
    },
    monthlyPriceCents: input.monthlyPriceCents,
    name: input.name,
    selectionRank: input.selectionRank,
    status: "active" as const,
  };
}
