import {
  BarChart3,
  Bell,
  Bot,
  Calculator,
  Car,
  FileText,
  Gauge,
  HandCoins,
  Home,
  KeyRound,
  MessageCircle,
  Palette,
  BadgeDollarSign,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";
import type { EntitlementKey } from "../features/billing/types";

export type NavigationGroup = {
  items: NavigationItem[];
  label: string;
};

export type ModuleId =
  | "dashboard"
  | "inventory"
  | "sales"
  | "customers"
  | "crm"
  | "documents"
  | "simulations"
  | "auto-entries"
  | "commissions"
  | "billing"
  | "expenses"
  | "reports"
  | "checklists"
  | "public-site"
  | "custom-pages"
  | "marketplaces"
  | "public-api"
  | "fiscal"
  | "paid-traffic"
  | "settings";

export type NavigationItem = {
  entitlementKey?: EntitlementKey;
  icon: ComponentType<{ className?: string }>;
  id: ModuleId;
  label: string;
};

export type ModuleDefinition = {
  action: string;
  description: string;
  eyebrow: string;
  id: ModuleId;
  title: string;
};

export const navigationGroups: NavigationGroup[] = [
  {
    label: "Operação diária",
    items: [
      { icon: Home, id: "dashboard", label: "Início" },
      {
        entitlementKey: "inventory",
        icon: Car,
        id: "inventory",
        label: "Veículos",
      },
      {
        entitlementKey: "sales",
        icon: BadgeDollarSign,
        id: "sales",
        label: "Vendas",
      },
      {
        entitlementKey: "sales",
        icon: Users,
        id: "customers",
        label: "Clientes",
      },
      {
        entitlementKey: "crm",
        icon: MessageCircle,
        id: "crm",
        label: "WhatsApp",
      },
      {
        entitlementKey: "documents",
        icon: FileText,
        id: "documents",
        label: "Documentos",
      },
      {
        entitlementKey: "financing",
        icon: Calculator,
        id: "simulations",
        label: "Simulações",
      },
    ],
  },
  {
    label: "Gestão",
    items: [
      {
        entitlementKey: "finance",
        icon: Bot,
        id: "auto-entries",
        label: "Lançamentos",
      },
      {
        entitlementKey: "commissions",
        icon: HandCoins,
        id: "commissions",
        label: "Comissões",
      },
      { icon: Receipt, id: "billing", label: "Assinatura" },
      {
        entitlementKey: "finance",
        icon: Receipt,
        id: "expenses",
        label: "Gastos",
      },
      {
        entitlementKey: "fiscal",
        icon: FileText,
        id: "fiscal",
        label: "NF-e",
      },
      {
        entitlementKey: "analytics",
        icon: BarChart3,
        id: "reports",
        label: "Relatórios",
      },
      {
        entitlementKey: "checklists",
        icon: ShieldCheck,
        id: "checklists",
        label: "Checklists",
      },
    ],
  },
  {
    label: "Canais",
    items: [
      {
        entitlementKey: "storefront",
        icon: Palette,
        id: "public-site",
        label: "Personalizar",
      },
      {
        entitlementKey: "storefront",
        icon: FileText,
        id: "custom-pages",
        label: "Páginas",
      },
      {
        entitlementKey: "marketplace",
        icon: Store,
        id: "marketplaces",
        label: "Marketplaces",
      },
      {
        entitlementKey: "external_api",
        icon: KeyRound,
        id: "public-api",
        label: "Public API",
      },
    ],
  },
  {
    label: "Sistema",
    items: [{ icon: Settings, id: "settings", label: "Geral" }],
  },
];
