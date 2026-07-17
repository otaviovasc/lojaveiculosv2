import {
  Car,
  FileText,
  Landmark,
  ListPlus,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { AutoEntryEvent, AutoEntryWorkspaceTab } from "./types";

/**
 * Semantic colour identity for each automatic-entry origin. Each tone maps to a
 * per-module accent already defined in tokens.css, so the palette stays
 * theme-aware (light/dark) and consistent with the rest of the product. Colour
 * coding the domains is the single biggest readability win over the old flat,
 * monochrome layout — a user can tell "financiamento" from "seguro" at a glance.
 */
export type AutoEntryTone =
  | "sale"
  | "financing"
  | "documentation"
  | "insurance"
  | "consortium"
  | "custom"
  | "neutral";

export type AutoEntryDomainMeta = {
  value: AutoEntryWorkspaceTab;
  event: AutoEntryEvent | null;
  tab: string;
  title: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  tone: AutoEntryTone;
};

/** The five operational origins that can trigger automatic entries. */
export const autoEntryDomains: readonly AutoEntryDomainMeta[] = [
  {
    description:
      "Mantenha a receita principal no fechamento e modele as comissões auxiliares.",
    event: "vehicle_sale_closed",
    eyebrow: "Origem automática",
    icon: Car,
    tab: "Venda",
    title: "Venda concluída",
    tone: "sale",
    value: "vehicle_sale_closed",
  },
  {
    description:
      "Organize a receita da loja e a comissão por vendedor nas faixas R1–R5.",
    event: "financing_approved",
    eyebrow: "Origem automática",
    icon: Landmark,
    tab: "Financiamento",
    title: "Financiamento aprovado",
    tone: "financing",
    value: "financing_approved",
  },
  {
    description:
      "Registre custos, receita e faixas de comissão da documentação cobrada.",
    event: "transfer_documentation_charged",
    eyebrow: "Origem automática",
    icon: FileText,
    tab: "Documentação",
    title: "Documentação de transferência",
    tone: "documentation",
    value: "transfer_documentation_charged",
  },
  {
    description:
      "Defina a participação da loja e do vendedor quando a apólice for emitida.",
    event: "insurance_issued",
    eyebrow: "Origem automática",
    icon: ShieldCheck,
    tab: "Seguro",
    title: "Seguro emitido",
    tone: "insurance",
    value: "insurance_issued",
  },
  {
    description:
      "Distribua a remuneração da carta entre a loja e o vendedor responsável.",
    event: "consortium_sold",
    eyebrow: "Origem automática",
    icon: Users,
    tab: "Consórcio",
    title: "Consórcio vendido",
    tone: "consortium",
    value: "consortium_sold",
  },
];

/** Manually authored rules that are not bound to a system origin. */
export const autoEntryCustomMeta: AutoEntryDomainMeta = {
  description:
    "Crie lançamentos sob medida para receitas, despesas e comissões auxiliares.",
  event: null,
  eyebrow: "Regras manuais",
  icon: ListPlus,
  tab: "Personalizadas",
  title: "Regras personalizadas",
  tone: "custom",
  value: "custom",
};

export const autoEntryTabsMeta: readonly AutoEntryDomainMeta[] = [
  ...autoEntryDomains,
  autoEntryCustomMeta,
];

const domainByTab = new Map<AutoEntryWorkspaceTab, AutoEntryDomainMeta>(
  autoEntryTabsMeta.map((meta) => [meta.value, meta]),
);

export function autoEntryMetaForTab(
  tab: AutoEntryWorkspaceTab,
): AutoEntryDomainMeta {
  return domainByTab.get(tab) ?? autoEntryCustomMeta;
}

const toneByEvent: Record<AutoEntryEvent, AutoEntryTone> = {
  consortium_sold: "consortium",
  financing_approved: "financing",
  insurance_issued: "insurance",
  transfer_documentation_charged: "documentation",
  vehicle_sale_closed: "sale",
};

export function autoEntryToneForEvent(event: AutoEntryEvent): AutoEntryTone {
  return toneByEvent[event] ?? "neutral";
}

/** Ordered list of the five origins used for coverage/summary widgets. */
export const autoEntryDomainEvents = autoEntryDomains.map(
  (domain) => domain.event,
) as readonly AutoEntryEvent[];
