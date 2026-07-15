import {
  BarChart3,
  Bell,
  Bot,
  Calculator,
  Car,
  FileText,
  Gauge,
  Globe,
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
  Sparkles,
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
  | "domain"
  | "marketplaces"
  | "public-api"
  | "fiscal"
  | "paid-traffic"
  | "autobot"
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
      { icon: Car, id: "inventory", label: "Veículos" },
      { icon: BadgeDollarSign, id: "sales", label: "Vendas" },
      { icon: Users, id: "customers", label: "Clientes" },
      {
        entitlementKey: "crm",
        icon: MessageCircle,
        id: "crm",
        label: "WhatsApp",
      },
      { icon: FileText, id: "documents", label: "Documentos" },
      {
        entitlementKey: "simulations",
        icon: Calculator,
        id: "simulations",
        label: "Simulações",
      },
    ],
  },
  {
    label: "Gestão",
    items: [
      { icon: Bot, id: "auto-entries", label: "Lançamentos" },
      {
        entitlementKey: "automation",
        icon: Sparkles,
        id: "autobot",
        label: "Operador IA",
      },
      { icon: HandCoins, id: "commissions", label: "Comissões" },
      { icon: Receipt, id: "billing", label: "Assinatura" },
      { icon: Receipt, id: "expenses", label: "Gastos" },
      {
        entitlementKey: "analytics",
        icon: BarChart3,
        id: "reports",
        label: "Relatórios",
      },
      {
        icon: ShieldCheck,
        id: "checklists",
        label: "Checklists",
      },
    ],
  },
  {
    label: "Serviços",
    items: [
      {
        entitlementKey: "nfe",
        icon: FileText,
        id: "fiscal",
        label: "NF-e",
      },
    ],
  },
  {
    label: "Canais",
    items: [
      {
        entitlementKey: "subdomain",
        icon: Palette,
        id: "public-site",
        label: "Personalizar",
      },
      {
        entitlementKey: "subdomain",
        icon: FileText,
        id: "custom-pages",
        label: "Páginas",
      },
      {
        entitlementKey: "custom_domain",
        icon: Globe,
        id: "domain",
        label: "Domínio",
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
