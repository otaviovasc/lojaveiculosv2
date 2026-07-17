import type { RoleKey } from "../types";
import {
  Car,
  MessageSquare,
  Coins,
  Sliders,
  Crown,
  ShieldCheck,
  Handshake,
  TrendingUp,
  Building2,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type CustomRolePreset = {
  id: string;
  name: string;
  baseRole: RoleKey;
  overrides: { permission: string; allowed: boolean }[];
};

/**
 * Visual identity per role so cargos are distinguishable at a glance instead of
 * every card/avatar sharing the same accent (pink) tone. Class strings are kept
 * literal so Tailwind's JIT can pick them up.
 */
export type RoleVisual = {
  icon: LucideIcon;
  /** icon container: background + icon color */
  tile: string;
  /** selected card: border + tinted background */
  selected: string;
  /** compact role chip: background + text */
  chip: string;
  /** accent text for check marks / highlights */
  accent: string;
};

const ROLE_VISUALS: Record<RoleKey, RoleVisual> = {
  owner: {
    icon: Crown,
    tile: "bg-accent-soft text-accent-strong",
    selected: "border-accent bg-accent-soft/40",
    chip: "bg-accent-soft text-accent-strong",
    accent: "text-accent-strong",
  },
  supervisor: {
    icon: ShieldCheck,
    tile: "bg-blue-500/10 text-blue-500",
    selected: "border-blue-500 bg-blue-500/10",
    chip: "bg-blue-500/10 text-blue-500",
    accent: "text-blue-500",
  },
  salesman: {
    icon: Handshake,
    tile: "bg-emerald-500/10 text-emerald-500",
    selected: "border-emerald-500 bg-emerald-500/10",
    chip: "bg-emerald-500/10 text-emerald-500",
    accent: "text-emerald-500",
  },
  investor: {
    icon: TrendingUp,
    tile: "bg-amber-500/10 text-amber-600",
    selected: "border-amber-500 bg-amber-500/10",
    chip: "bg-amber-500/10 text-amber-600",
    accent: "text-amber-600",
  },
  agency: {
    icon: Building2,
    tile: "bg-violet-500/10 text-violet-500",
    selected: "border-violet-500 bg-violet-500/10",
    chip: "bg-violet-500/10 text-violet-500",
    accent: "text-violet-500",
  },
  admin: {
    icon: Wrench,
    tile: "bg-slate-500/10 text-slate-400",
    selected: "border-slate-400 bg-slate-500/10",
    chip: "bg-slate-500/10 text-slate-400",
    accent: "text-slate-400",
  },
};

export function getRoleVisual(role: RoleKey): RoleVisual {
  return ROLE_VISUALS[role] ?? ROLE_VISUALS.owner;
}

export const featureBlocks = [
  {
    key: "inventory_marketplace",
    title: "Estoque, Portais e Anúncios",
    description:
      "Controle de veículos, checklists, vistorias e publicação em portais (OLX, Mercado Livre).",
    icon: Car,
    groups: ["inventory", "marketplace"],
  },
  {
    key: "sales_crm",
    title: "Vendas, Propostas e Atendimento (CRM)",
    description:
      "Visualização de vendas, criação de propostas, chats e interações de WhatsApp.",
    icon: MessageSquare,
    groups: ["sales", "crm"],
  },
  {
    key: "finance_docs",
    title: "Financeiro, Recibos e Contratos",
    description:
      "Lançamento de movimentações, fluxo de caixa e emissão de contratos ou termos em PDF.",
    icon: Coins,
    groups: ["finance", "documents"],
  },
  {
    key: "admin_platform",
    title: "Administração e Configurações Gerais",
    description:
      "Cadastro da empresa, gerenciamento da equipe, segurança, faturamento e integrações de API.",
    icon: Sliders,
    groups: ["storefront", "platform"],
  },
];
