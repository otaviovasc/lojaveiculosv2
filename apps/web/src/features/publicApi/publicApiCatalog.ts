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
    "Inventário",
    "inventory.create",
    "Criar estoque",
    "Criação de anúncios e unidades pelo contrato V2.",
  ),
  option(
    "Inventário",
    "inventory.update_price",
    "Editar preço",
    "Atualização de preços com auditoria.",
  ),
  option(
    "Inventário",
    "inventory.update_description",
    "Editar descrição",
    "Campos públicos e descrições comerciais.",
  ),
  option(
    "Inventário",
    "inventory.update_internal_notes",
    "Notas internas",
    "Campos internos de operação.",
  ),
  option(
    "Inventário",
    "inventory.update_status",
    "Status do anúncio",
    "Publicar, arquivar ou preparar anúncios.",
  ),
  option(
    "Inventário",
    "inventory.update_unit",
    "Unidades",
    "Cor, status, placa, chassi e estoque físico.",
  ),
  option(
    "Inventário",
    "inventory.media_update",
    "Mídia",
    "Uploads, ordenação e visibilidade de fotos.",
  ),
  option(
    "Inventário",
    "inventory.document_attach",
    "Documentos",
    "Anexos de unidade e documentos de veículo.",
  ),
  option(
    "Operação",
    "inventory.cost_create",
    "Custos",
    "Despesas operacionais ligadas ao veículo.",
  ),
  option(
    "Operação",
    "inventory.reserve",
    "Reservas",
    "Reservar e liberar unidades com chave de deduplicação.",
  ),
  option(
    "Operação",
    "inventory.sell",
    "Vendas",
    "Finalizar venda e gerar efeitos financeiros.",
  ),
  option(
    "Financeiro",
    "finance.read",
    "Ler financeiro",
    "Resumo, lançamentos, regras e documentos.",
  ),
  option(
    "Financeiro",
    "finance.create",
    "Criar financeiro",
    "Lançamentos, recorrências e comissões.",
  ),
  option(
    "Financeiro",
    "finance.update",
    "Editar financeiro",
    "Pagamento, cancelamento e atualização.",
  ),
  option(
    "Financeiro",
    "finance.attach_document",
    "Anexar financeiro",
    "Uploads e documentos financeiros.",
  ),
  option(
    "CRM",
    "crm.access",
    "Acesso CRM",
    "Entitlement operacional para fluxos de CRM.",
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
  "Operação",
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
    description: "Sincronização completa de estoque e mídia.",
    icon: CarFront,
    label: "DMS de estoque",
    name: "inventory-dms",
    scopes: [
      "inventory.create",
      "inventory.media_update",
      "inventory.read",
      "inventory.update_description",
      "inventory.update_price",
      "inventory.update_status",
      "inventory.update_unit",
    ],
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
