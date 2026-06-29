import { z } from "zod";

// ============================================
// Enums
// ============================================

export const PlanNameSchema = z.enum(["CORRETOR"]);
export type PlanName = z.infer<typeof PlanNameSchema>;

export const BillingCycleSchema = z.enum(["MONTHLY", "ANNUAL"]);
export type BillingCycle = z.infer<typeof BillingCycleSchema>;

export const SubscriptionStatusSchema = z.enum([
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "PAUSED",
  "CANCELLED",
  "EXPIRED",
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const ChargeStatusSchema = z.enum([
  "PENDING",
  "PROCESSING",
  "CONFIRMED",
  "RECEIVED",
  "OVERDUE",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
  "FAILED",
  "CANCELLED",
]);
export type ChargeStatus = z.infer<typeof ChargeStatusSchema>;

export const ChargeTypeSchema = z.enum([
  "SUBSCRIPTION_CYCLE",
  "SUBSCRIPTION_SETUP",
  "ONE_TIME",
  "METERED_OVERAGE",
]);
export type ChargeType = z.infer<typeof ChargeTypeSchema>;

export const ModuleSchema = z.enum([
  "CUSTOM_DOMAIN",
  "ANALYTICS_PRO",
  "WHATSAPP_CRM",
  "TEAM",
  "SOCIAL_MEDIA",
  "PORTAL",
  "UTM_TRACKING",
  "META_ADS",
]);
export type Module = z.infer<typeof ModuleSchema>;

// ============================================
// PRICING CONFIGURATION - Easy to change
// ============================================
// Update these values to change pricing across the platform
// All prices in BRL (R$)

export const MODULE_PRICES: Record<Module, number> = {
  CUSTOM_DOMAIN: 49, // Domínio próprio
  ANALYTICS_PRO: 29, // Analytics avançado
  WHATSAPP_CRM: 199, // CRM integrado com WhatsApp
  TEAM: 15, // Membro adicional de equipe
  SOCIAL_MEDIA: 39, // Integração com redes sociais
  PORTAL: 29, // Listagem no Portal
  UTM_TRACKING: 19, // Rastreamento UTM/Resultados
  META_ADS: 49, // Meta Ads Intelligence
};

export const PRO_BUNDLE_PRICE = 99; // Preço do bundle PRO com todos os módulos

// Base plan configuration
export const BASE_PLAN_CONFIG = {
  name: "Base",
  description: "Plano essencial para corretores",
  basePrice: 79,
  maxProperties: 10,
  features: [
    "Até 10 imóveis ativos",
    "Personalização de tema",
    "Domínio próprio",
    "CRM de Leads",
    "Notificações",
    "Páginas personalizadas",
    "Property Acquisition (CRECI)",
  ] as const,
} as const;

// Property limit increase pricing
export const PROPERTY_LIMIT_PRICING = {
  baseLimit: 10,
  maxLimit: 100,
  pricePer10Properties: 25, // R$25 for each additional 10 properties
  step: 10, // Increments of 10 properties
} as const;

// Module descriptions for UI display
export const MODULE_DESCRIPTIONS: Record<
  Module,
  { name: string; description: string; icon?: string }
> = {
  CUSTOM_DOMAIN: {
    name: "Domínio Próprio",
    description: "Use seu próprio domínio personalizado",
    icon: "Globe",
  },
  ANALYTICS_PRO: {
    name: "Analytics Pro",
    description: "Analytics avançado e relatórios detalhados",
    icon: "BarChart3",
  },
  WHATSAPP_CRM: {
    name: "WhatsApp CRM",
    description: "CRM integrado com WhatsApp",
    icon: "MessageCircle",
  },
  TEAM: {
    name: "Equipe",
    description: "Adicione membros à sua equipe",
    icon: "Users",
  },
  SOCIAL_MEDIA: {
    name: "Redes Sociais",
    description: "Integração com redes sociais",
    icon: "Share2",
  },
  PORTAL: {
    name: "Listagem no Portal",
    description: "Exiba seus imóveis no portal Centro Imóvel",
    icon: "Building2",
  },
  UTM_TRACKING: {
    name: "Resultados",
    description: "Rastreamento UTM e análise de resultados",
    icon: "Target",
  },
  META_ADS: {
    name: "Meta Ads",
    description: "Gestão profissional de tráfego pago no Facebook e Instagram",
    icon: "Megaphone",
  },
};

export const BASE_PLAN_PRICE = 79;

export const PLAN_LIMITS = {
  CORRETOR: {
    maxActiveListings: BASE_PLAN_CONFIG.maxProperties,
    maxTeamMembers: 1,
    baseFeatures: BASE_PLAN_CONFIG.features,
  },
} as const;

// ============================================
// Property Limit Functions
// ============================================

export function calculatePropertyLimitPrice(
  additionalProperties: number,
): number {
  const steps = Math.ceil(additionalProperties / PROPERTY_LIMIT_PRICING.step);
  return steps * PROPERTY_LIMIT_PRICING.pricePer10Properties;
}

export function calculateTotalPropertyLimit(
  baseLimit: number,
  additionalProperties: number,
): number {
  return baseLimit + additionalProperties;
}

export function getAvailablePropertyLimitSteps(): number[] {
  const steps: number[] = [];
  for (
    let i = PROPERTY_LIMIT_PRICING.step;
    i <= PROPERTY_LIMIT_PRICING.maxLimit - BASE_PLAN_CONFIG.maxProperties;
    i += PROPERTY_LIMIT_PRICING.step
  ) {
    steps.push(i);
  }
  return steps;
}

export const BILLING_CYCLE_MULTIPLIERS: Record<BillingCycle, number> = {
  MONTHLY: 1,
  ANNUAL: 10,
};

export const BILLING_CYCLE_MONTHS: Record<BillingCycle, number> = {
  MONTHLY: 1,
  ANNUAL: 12,
};

export const TRIAL_DAYS = 14;

export const DUNNING_SCHEDULE = [
  { daysSinceOverdue: 1, action: "RETRY_CHARGE" as const },
  { daysSinceOverdue: 3, action: "RETRY_CHARGE" as const },
  { daysSinceOverdue: 5, action: "EMAIL_REMINDER" as const },
  { daysSinceOverdue: 7, action: "SOFT_BLOCK" as const },
  { daysSinceOverdue: 14, action: "CANCEL_SUBSCRIPTION" as const },
] as const;

export const MeteredMetricSchema = z.enum([
  "CONTACTS",
  "LEADS",
  "ADS",
  "TEAM_MEMBERS",
]);
export type MeteredMetric = z.infer<typeof MeteredMetricSchema>;

export const METERED_THRESHOLDS: Record<
  MeteredMetric,
  { included: number; overagePrice: number }
> = {
  CONTACTS: { included: 100, overagePrice: 0.5 },
  LEADS: { included: 50, overagePrice: 1.0 },
  ADS: { included: 10, overagePrice: 5.0 },
  TEAM_MEMBERS: { included: 1, overagePrice: 15 },
};

// ============================================
// Invite Schemas
// ============================================

export const CreateUserInviteSchema = z.object({
  partnerWorkspaceId: z.string().min(1, "Selecione um parceiro"),
  referrerName: z.string().min(1).max(100),
  code: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-zA-Z0-9-_]+$/),
  maxUses: z.number().int().min(1).max(10000).default(1),
  trialDays: z.number().int().min(0).max(365).default(14),
  discountPercent: z.number().int().min(0).max(100).default(0),
  discountMonths: z.number().int().min(0).max(24).default(0),
  includedModules: z.array(ModuleSchema).default([]),
  preferredBillingCycle: BillingCycleSchema.optional(),
  expiresAt: z.date().optional(),
});
export type CreateUserInvite = z.infer<typeof CreateUserInviteSchema>;

export const UpdateUserInviteSchema = z.object({
  id: z.string(),
  isActive: z.boolean().optional(),
  maxUses: z.number().int().min(1).optional(),
});
export type UpdateUserInvite = z.infer<typeof UpdateUserInviteSchema>;

export const ValidateInviteCodeSchema = z.object({
  code: z.string(),
});
export type ValidateInviteCode = z.infer<typeof ValidateInviteCodeSchema>;

export const ApplyInviteSchema = z.object({
  code: z.string(),
  userId: z.string(),
  workspaceId: z.string().optional(),
});
export type ApplyInvite = z.infer<typeof ApplyInviteSchema>;

// ============================================
// Input Schemas (for API validation)
// ============================================

export const CreateBillingCustomerSchema = z.object({
  workspaceId: z.string(),
  name: z.string().min(2).max(120),
  email: z.string().email(),
  cpfCnpj: z.string().min(11).max(18).optional(),
  phone: z.string().optional(),
  postalCode: z.string().optional(),
  address: z.string().optional(),
  addressNumber: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().max(2).optional(),
});
export type CreateBillingCustomer = z.infer<typeof CreateBillingCustomerSchema>;

export const CreateSubscriptionSchema = z.object({
  workspaceId: z.string(),
  billingCycle: BillingCycleSchema,
  modules: z.array(ModuleSchema).min(0),
  startTrial: z.boolean().default(true),
  discountPercent: z.number().int().min(0).max(100).default(0),
  discountMonths: z.number().int().min(0).max(24).default(0),
});
export type CreateSubscription = z.infer<typeof CreateSubscriptionSchema>;

export const UpdateSubscriptionModulesSchema = z.object({
  subscriptionId: z.string(),
  modules: z.array(ModuleSchema).min(0),
});
export type UpdateSubscriptionModules = z.infer<
  typeof UpdateSubscriptionModulesSchema
>;

export const CancelSubscriptionSchema = z.object({
  subscriptionId: z.string(),
  reason: z.string().max(500).optional(),
  immediate: z.boolean().default(false),
});
export type CancelSubscription = z.infer<typeof CancelSubscriptionSchema>;

export const UpdatePropertyLimitSchema = z.object({
  workspaceId: z.string(),
  additionalProperties: z.number().int().min(0).max(90), // Max 90 additional (10 + 90 = 100 total)
});
export type UpdatePropertyLimit = z.infer<typeof UpdatePropertyLimitSchema>;

export const CreateCheckoutSessionSchema = z.object({
  workspaceId: z.string(),
  billingCycle: BillingCycleSchema,
  modules: z.array(ModuleSchema).min(0),
  additionalProperties: z.number().int().min(0).max(90).default(0),
});
export type CreateCheckoutSession = z.infer<typeof CreateCheckoutSessionSchema>;

export const RecordUsageSchema = z.object({
  workspaceId: z.string(),
  metric: MeteredMetricSchema,
  quantity: z.number().int().positive().default(1),
  metadata: z.record(z.unknown()).optional(),
});
export type RecordUsage = z.infer<typeof RecordUsageSchema>;

// ============================================
// Gateway Interface Types (not Zod — used as TS interfaces)
// ============================================

export interface GatewayCustomerResult {
  gatewayCustomerId: string;
  raw: Record<string, unknown>;
}

export interface GatewaySubscriptionResult {
  gatewaySubscriptionId: string;
  checkoutUrl?: string;
  status: string;
  raw: Record<string, unknown>;
}

export interface GatewayChargeResult {
  gatewayChargeId: string;
  status: string;
  invoiceUrl?: string;
  raw: Record<string, unknown>;
}

export interface GatewayWebhookPayload {
  eventId: string;
  eventType: string;
  data: Record<string, unknown>;
}

// ============================================
// Pricing Functions
// ============================================

export function calculateMonthlyTotal(
  modules: Module[],
  teamMemberCount: number = 0,
): number {
  let total = BASE_PLAN_PRICE;
  for (const mod of modules) {
    total += MODULE_PRICES[mod];
  }
  if (modules.includes("TEAM")) {
    total += Math.max(0, teamMemberCount - 1) * MODULE_PRICES.TEAM;
  }
  return total;
}

/**
 * Apply a percentage discount to a monthly total.
 * Returns the discounted amount (what the customer pays).
 */
export function applyDiscount(
  monthlyTotal: number,
  discountPercent: number,
): number {
  if (discountPercent <= 0 || discountPercent > 100) return monthlyTotal;
  return Math.round(monthlyTotal * (1 - discountPercent / 100) * 100) / 100;
}

export function calculateBillingCycleTotal(
  monthlyTotal: number,
  cycle: BillingCycle,
): number {
  return monthlyTotal * BILLING_CYCLE_MULTIPLIERS[cycle];
}

export function isListingWithinLimit(
  activeCount: number,
  maxListings?: number,
): boolean {
  const limit = maxListings ?? PLAN_LIMITS.CORRETOR.maxActiveListings;
  return activeCount <= limit;
}

// ============================================
// Feature Flags & Module Mapping
// ============================================

export type Feature =
  // Base plan features (always available)
  | "property_listing"
  | "customization"
  | "custom_pages"
  | "leads_crm"
  | "notifications"
  | "custom_domain"
  | "ssl_certificate"
  | "property_acquisition"
  // Module-based features
  | "portal_submissions"
  | "utm_tracking"
  | "advanced_analytics"
  | "whatsapp_automation"
  | "team_collaboration"
  | "third_party_integrations"
  | "meta_ads_intelligence";

// Map features to their required modules
export const FEATURE_MODULE_MAP: Record<Feature, Module[]> = {
  // Base features (empty array = no module required)
  property_listing: [],
  customization: [],
  custom_pages: [],
  leads_crm: [],
  notifications: [],
  custom_domain: ["CUSTOM_DOMAIN"],
  ssl_certificate: [],
  property_acquisition: [],
  // Module features
  portal_submissions: ["PORTAL"],
  utm_tracking: ["UTM_TRACKING"],
  advanced_analytics: ["ANALYTICS_PRO"],
  whatsapp_automation: ["WHATSAPP_CRM"],
  team_collaboration: ["TEAM"],
  third_party_integrations: ["SOCIAL_MEDIA"],
  meta_ads_intelligence: ["META_ADS"],
};

// Check if a feature is available based on modules
export function isFeatureAvailable(
  feature: Feature,
  modules: Module[],
): boolean {
  const requiredModules = FEATURE_MODULE_MAP[feature];
  // If no modules required, feature is available
  if (requiredModules.length === 0) return true;
  // Check if any required module is active
  return requiredModules.some((module) => modules.includes(module));
}

// Get all available features for a given set of modules
export function getAvailableFeatures(modules: Module[]): Feature[] {
  return (Object.keys(FEATURE_MODULE_MAP) as Feature[]).filter((feature) =>
    isFeatureAvailable(feature, modules),
  );
}

export function calculateOverage(
  metric: MeteredMetric,
  usage: number,
): { overage: number; cost: number } {
  const threshold = METERED_THRESHOLDS[metric];
  const overage = Math.max(0, usage - threshold.included);
  return { overage, cost: overage * threshold.overagePrice };
}
