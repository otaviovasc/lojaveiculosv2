export const openApiTags = [
  { name: "System", description: "Operational endpoints." },
  { name: "Inventory", description: "Vehicle inventory endpoints." },
  {
    name: "Identity",
    description: "Store roles, permissions, and membership access.",
  },
  {
    name: "Billing",
    description: "Plans, subscriptions, and store feature entitlements.",
  },
  {
    name: "Analytics",
    description: "Store commercial, inventory, finance, and funnel metrics.",
  },
  {
    name: "Compliance",
    description: "LGPD, access review, audit export, and security posture.",
  },
  {
    name: "Documents",
    description: "Shared store-scoped documents linked to business entities.",
  },
  {
    name: "Public Storefront",
    description: "Public vehicle stock endpoints resolved from store host.",
  },
  {
    name: "External API Safety",
    description:
      "Scoped key management and guardrails for partner and automation-facing APIs.",
  },
  {
    name: "Internal Monitoring",
    description: "Scoped audit events, sink failures, and runtime health.",
  },
  {
    name: "Marketplaces",
    description: "OLX and Mercado Livre account and sync-job controls.",
  },
  {
    name: "Fiscal",
    description: "SPEDY/NF-e provider readiness and document lifecycle.",
  },
] as const;
