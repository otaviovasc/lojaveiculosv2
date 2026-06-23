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
  Megaphone,
  MessageCircle,
  Palette,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";

export type NavigationGroup = {
  items: NavigationItem[];
  label: string;
};

export type ModuleId =
  | "dashboard"
  | "inventory"
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
  | "domain"
  | "marketplaces"
  | "public-api"
  | "fiscal"
  | "paid-traffic"
  | "autobot"
  | "settings";

export type NavigationItem = {
  entitlementKey?: string;
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
    label: "Operacao diaria",
    items: [
      { icon: Home, id: "dashboard", label: "Inicio" },
      { icon: Car, id: "inventory", label: "Veiculos" },
      { icon: Users, id: "customers", label: "Clientes" },
      {
        entitlementKey: "crm",
        icon: MessageCircle,
        id: "crm",
        label: "WhatsApp",
      },
      { icon: FileText, id: "documents", label: "Documentos" },
      { icon: Calculator, id: "simulations", label: "Simulacoes" },
    ],
  },
  {
    label: "Gestao",
    items: [
      { icon: Bot, id: "auto-entries", label: "Lancamentos" },
      { icon: HandCoins, id: "commissions", label: "Comissoes" },
      { icon: Receipt, id: "billing", label: "Billing" },
      { icon: Receipt, id: "expenses", label: "Gastos" },
      {
        entitlementKey: "analytics",
        icon: BarChart3,
        id: "reports",
        label: "Relatorios",
      },
      { icon: ShieldCheck, id: "checklists", label: "Checklists" },
    ],
  },
  {
    label: "Canais",
    items: [
      { icon: Palette, id: "public-site", label: "Personalizar" },
      { icon: Globe, id: "domain", label: "Dominio" },
      {
        entitlementKey: "marketplace",
        icon: Store,
        id: "marketplaces",
        label: "Marketplaces",
      },
      { icon: KeyRound, id: "public-api", label: "Public API" },
    ],
  },
  {
    label: "Servicos",
    items: [
      {
        entitlementKey: "nfe",
        icon: FileText,
        id: "fiscal",
        label: "NF-e",
      },
      { icon: Megaphone, id: "paid-traffic", label: "Trafego" },
      { icon: Bot, id: "autobot", label: "Autobot" },
    ],
  },
  {
    label: "Sistema",
    items: [{ icon: Settings, id: "settings", label: "Geral" }],
  },
];
