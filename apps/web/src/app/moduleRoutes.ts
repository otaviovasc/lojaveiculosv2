import type { ModuleId } from "./modules";

export type ModuleSurface =
  | "billing"
  | "checklists"
  | "crm-leads"
  | "crm-whatsapp"
  | "dashboard"
  | "documents"
  | "finance-auto-entries"
  | "finance-commissions"
  | "finance-expenses"
  | "fiscal"
  | "inventory"
  | "marketplaces"
  | "placeholder"
  | "public-api"
  | "reports"
  | "sales"
  | "settings"
  | "storefront-design"
  | "storefront-pages";

export const moduleSurfaceById = {
  "auto-entries": "finance-auto-entries",
  billing: "billing",
  checklists: "checklists",
  commissions: "finance-commissions",
  crm: "crm-whatsapp",
  "custom-pages": "storefront-pages",
  customers: "crm-leads",
  dashboard: "dashboard",
  documents: "documents",
  expenses: "finance-expenses",
  fiscal: "fiscal",
  inventory: "inventory",
  marketplaces: "marketplaces",
  "paid-traffic": "placeholder",
  "public-api": "public-api",
  "public-site": "storefront-design",
  reports: "reports",
  sales: "sales",
  settings: "settings",
  simulations: "placeholder",
} satisfies Record<ModuleId, ModuleSurface>;

export function isPlaceholderModule(moduleId: ModuleId) {
  return moduleSurfaceById[moduleId] === "placeholder";
}
