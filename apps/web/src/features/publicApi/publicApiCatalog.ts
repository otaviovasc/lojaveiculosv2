import {
  Bot,
  BookOpen,
  CarFront,
  FileJson,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { PublicApiScope } from "./types";

export type PublicApiScopeOption = {
  description: string;
  group: "CRM" | "Financeiro" | "Inventário" | "Operação";
  label: string;
  scope: PublicApiScope;
};

export type PublicApiScopeGroup = {
  label: PublicApiScopeOption["group"];
  options: PublicApiScopeOption[];
};

export type PublicApiScopePreset = {
  description: string;
  icon: LucideIcon;
  label: string;
  name: string;
  scopes: PublicApiScope[];
};

export const publicApiBasePath = "/api/v1/external-api";

export const scopeOptions: PublicApiScopeOption[] = [
  option(
    "Inventário",
    "inventory.read",
    "Ler veículos",
    "Listas, busca e detalhes seguros para aplicativos externos.",
  ),
  option(
    "Financeiro",
    "financing.simulation.read",
    "Consultar Credere",
    "Prontidão, dados exigidos e retorno oficial das simulações.",
  ),
  option(
    "Financeiro",
    "financing.simulation.create",
    "Criar simulação Credere",
    "Envio consentido aos bancos habilitados da loja.",
  ),
  option("CRM", "lead.read", "Ler leads", "Listagem e detalhe de leads."),
  option(
    "CRM",
    "lead.create",
    "Criar leads",
    "Formulários, chatbots, marketplaces e agentes.",
  ),
  option(
    "CRM",
    "lead.update",
    "Editar leads",
    "Status e dados de contato do comprador.",
  ),
];

const scopeGroupOrder: PublicApiScopeOption["group"][] = [
  "Inventário",
  "Financeiro",
  "CRM",
];

export const scopeGroups: PublicApiScopeGroup[] = scopeGroupOrder.map(
  (label) => ({
    label,
    options: scopeOptions.filter((option) => option.group === label),
  }),
);

export const scopePresets: PublicApiScopePreset[] = [
  {
    description: "Busca de veículos, detalhes seguros e criação de leads.",
    icon: Bot,
    label: "Agente de vendas IA",
    name: "ai-sales-agent",
    scopes: ["inventory.read", "lead.create", "lead.read"],
  },
  {
    description: "Contrato seguro para landing pages, chat e simuladores.",
    icon: Sparkles,
    label: "Site e chat externo",
    name: "public-commerce",
    scopes: ["inventory.read", "lead.create"],
  },
  {
    description: "Leitura segura do catálogo, disponibilidade e mídia pública.",
    icon: CarFront,
    label: "Catálogo de estoque",
    name: "inventory-catalog",
    scopes: ["inventory.read"],
  },
  {
    description: "Leitura e avanços de leads por CRM próprio.",
    icon: UsersRound,
    label: "CRM externo",
    name: "external-crm",
    scopes: ["lead.create", "lead.read", "lead.update"],
  },
];

export const publicApiResources = [
  {
    description: "Documentação Markdown única para pessoas e agentes.",
    icon: BookOpen,
    label: "Docs",
    path: `${publicApiBasePath}/docs`,
  },
  {
    description: "OpenAPI escopado para gerar SDKs e clientes tipados.",
    icon: FileJson,
    label: "OpenAPI",
    path: `${publicApiBasePath}/openapi.json`,
  },
  {
    description: "Índice compacto para LLMs e agentes de código.",
    icon: Bot,
    label: "llms.txt",
    path: `${publicApiBasePath}/llms.txt`,
  },
  {
    description: "Manifesto de capacidades, autenticação, escopos e fluxos.",
    icon: ShieldCheck,
    label: "Manifest",
    path: `${publicApiBasePath}/manifest`,
  },
  {
    description: "Definições de ferramentas para buscar veículos e leads.",
    icon: Zap,
    label: "AI tools",
    path: `${publicApiBasePath}/ai-tools`,
  },
] as const;

function option(
  group: PublicApiScopeOption["group"],
  scope: PublicApiScope,
  label: string,
  description: string,
): PublicApiScopeOption {
  return { description, group, label, scope };
}
