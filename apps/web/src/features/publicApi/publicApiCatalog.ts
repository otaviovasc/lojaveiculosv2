import {
  Bot,
  BookOpen,
  CarFront,
  FileJson,
  Handshake,
  KeyRound,
  ListFilter,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { PublicApiScope } from "./types";

export type PublicApiScopeOption = {
  description: string;
  group: "CRM" | "Financeiro" | "Inventario" | "Operacao";
  label: string;
  scope: PublicApiScope;
};

export type PublicApiScopePreset = {
  description: string;
  icon: LucideIcon;
  label: string;
  name: string;
  scopes: PublicApiScope[];
};

export type PublicApiEndpoint = {
  description: string;
  method: "GET" | "PATCH" | "POST";
  path: string;
  samplePath: string;
  scopes: PublicApiScope[];
  title: string;
};

export const publicApiBasePath = "/api/v1/external-api";

export const scopeOptions: PublicApiScopeOption[] = [
  option(
    "Inventario",
    "inventory.read",
    "Ler veiculos",
    "Listas, busca e detalhes seguros para apps externos.",
  ),
  option(
    "Inventario",
    "inventory.create",
    "Criar estoque",
    "Criacao de anuncios e unidades pelo contrato V2.",
  ),
  option(
    "Inventario",
    "inventory.update_price",
    "Editar preco",
    "Atualizacao de precos com auditoria.",
  ),
  option(
    "Inventario",
    "inventory.update_description",
    "Editar descricao",
    "Campos publicos e descricoes comerciais.",
  ),
  option(
    "Inventario",
    "inventory.update_internal_notes",
    "Notas internas",
    "Campos internos de operacao.",
  ),
  option(
    "Inventario",
    "inventory.update_status",
    "Status do anuncio",
    "Publicar, arquivar ou preparar anuncios.",
  ),
  option(
    "Inventario",
    "inventory.update_unit",
    "Unidades",
    "Cor, status, placa, chassi e estoque fisico.",
  ),
  option(
    "Inventario",
    "inventory.media_update",
    "Midia",
    "Uploads, ordenacao e visibilidade de fotos.",
  ),
  option(
    "Inventario",
    "inventory.document_attach",
    "Documentos",
    "Anexos de unidade e documentos de veiculo.",
  ),
  option(
    "Operacao",
    "inventory.cost_create",
    "Custos",
    "Despesas operacionais ligadas ao veiculo.",
  ),
  option(
    "Operacao",
    "inventory.reserve",
    "Reservas",
    "Reservar e liberar unidades com idempotencia.",
  ),
  option(
    "Operacao",
    "inventory.sell",
    "Vendas",
    "Finalizar venda e gerar efeitos financeiros.",
  ),
  option(
    "Financeiro",
    "finance.read",
    "Ler financeiro",
    "Resumo, lancamentos, regras e documentos.",
  ),
  option(
    "Financeiro",
    "finance.create",
    "Criar financeiro",
    "Lancamentos, recorrencias e comissoes.",
  ),
  option(
    "Financeiro",
    "finance.update",
    "Editar financeiro",
    "Pagamento, cancelamento e atualizacao.",
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
    "Formularios, chatbots, marketplaces e agentes.",
  ),
  option(
    "CRM",
    "lead.update",
    "Editar leads",
    "Status e dados de contato do comprador.",
  ),
];

export const scopePresets: PublicApiScopePreset[] = [
  {
    description: "Busca de veiculos, detalhes seguros e criacao de leads.",
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
    description: "Sincronizacao completa de estoque e midia.",
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
    description: "Leitura e avancos de leads por CRM proprio.",
    icon: UsersRound,
    label: "CRM externo",
    name: "external-crm",
    scopes: ["lead.create", "lead.read", "lead.update"],
  },
];

export const publicApiResources = [
  {
    description: "Rota unica de documentacao Markdown para humanos e agentes.",
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
    description: "Indice compacto para LLMs e agentes de coding.",
    icon: Bot,
    label: "llms.txt",
    path: `${publicApiBasePath}/llms.txt`,
  },
  {
    description: "Manifesto de capacidades, auth, scopes e fluxos.",
    icon: ShieldCheck,
    label: "Manifest",
    path: `${publicApiBasePath}/manifest`,
  },
  {
    description: "Tool definitions para busca de veiculos e leads.",
    icon: Zap,
    label: "AI tools",
    path: `${publicApiBasePath}/ai-tools`,
  },
] as const;

export const publicApiEndpoints: PublicApiEndpoint[] = [
  endpoint(
    "GET",
    "/vehicles",
    "Listar veiculos",
    "Lista veiculos com DTO publico limpo.",
    ["inventory.read"],
    "?available=true&limit=20",
  ),
  endpoint(
    "GET",
    "/vehicles/search",
    "Buscar veiculos",
    "Aceita q, preco, ano, km, cor, combustivel, cambio e sort.",
    ["inventory.read"],
    "?q=toro&minPrice=100000&sort=price_asc",
  ),
  endpoint(
    "GET",
    "/vehicles/{listingId}",
    "Detalhe do veiculo",
    "Detalhe com midia publica, historico de preco e unidades seguras.",
    ["inventory.read"],
    "",
  ),
  endpoint(
    "GET",
    "/leads",
    "Listar leads",
    "Busca leads por status, origem, telefone, texto e veiculo.",
    ["lead.read"],
    "?status=new&limit=20",
  ),
  endpoint(
    "POST",
    "/leads",
    "Criar lead",
    "Cria lead por campos V2 ou aliases V1 name/email/phone/message/vehicleId.",
    ["lead.create"],
    "",
  ),
  endpoint(
    "GET",
    "/leads/{leadId}",
    "Detalhe do lead",
    "Leitura de um lead via chave escopada.",
    ["lead.read"],
    "",
  ),
  endpoint(
    "PATCH",
    "/leads/{leadId}",
    "Atualizar lead",
    "Atualiza status ou dados do comprador com Idempotency-Key.",
    ["lead.update"],
    "",
  ),
];

export function createCurlExample(endpoint: PublicApiEndpoint) {
  const url = `${publicApiBasePath}${endpoint.path.replace("{listingId}", "listing_123").replace("{leadId}", "lead_123")}${endpoint.samplePath}`;
  const body =
    endpoint.method === "POST"
      ? ' \\\n  -H "Idempotency-Key: lead-import-001" \\\n  -d \'{"name":"Ana","phone":"+5511999990000","message":"Tenho interesse"}\''
      : endpoint.method === "PATCH"
        ? ' \\\n  -H "Idempotency-Key: lead-update-001" \\\n  -d \'{"status":"contacted"}\''
        : "";
  return `curl -X ${endpoint.method} \\\n  -H "x-api-key: lv2_..." \\\n  -H "content-type: application/json"${body} \\\n  "https://app.lojaveiculos.com.br${url}"`;
}

function option(
  group: PublicApiScopeOption["group"],
  scope: PublicApiScope,
  label: string,
  description: string,
): PublicApiScopeOption {
  return { description, group, label, scope };
}

function endpoint(
  method: PublicApiEndpoint["method"],
  path: string,
  title: string,
  description: string,
  scopes: PublicApiScope[],
  samplePath: string,
): PublicApiEndpoint {
  return { description, method, path, samplePath, scopes, title };
}
