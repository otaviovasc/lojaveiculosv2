import type { PermissionKey, RoleKey } from "@lojaveiculosv2/shared";
import { defaultRolePermissions } from "./accessPolicy.js";
import { marketplacePermissionGroup } from "./marketplacePermissionCatalog.js";

export type PermissionRisk = "high" | "medium" | "low";

export type PermissionDescriptor = {
  description: string;
  key: PermissionKey;
  label: string;
  risk: PermissionRisk;
};

export type PermissionGroup = {
  key: string;
  label: string;
  permissions: readonly PermissionDescriptor[];
};

export const assignableRoleKeys = [
  "investor",
  "owner",
  "supervisor",
  "salesman",
] satisfies RoleKey[];

export const visibleRoleKeys = [
  "agency",
  "investor",
  "owner",
  "supervisor",
  "salesman",
] satisfies RoleKey[];

export const permissionGroups: readonly PermissionGroup[] = [
  {
    key: "inventory",
    label: "Inventario",
    permissions: [
      permission(
        "inventory.read",
        "Ler estoque",
        "Visualizar veiculos.",
        "low",
      ),
      permission(
        "inventory.create",
        "Criar veiculo",
        "Cadastrar veiculos.",
        "medium",
      ),
      permission(
        "inventory.update_price",
        "Editar preco",
        "Alterar preco de anuncio.",
        "high",
      ),
      permission(
        "inventory.update_description",
        "Editar descricao",
        "Alterar textos do anuncio.",
        "medium",
      ),
      permission("inventory.reserve", "Reservar", "Reservar veiculos.", "high"),
      permission("inventory.sell", "Vender", "Marcar venda.", "high"),
      permission("inventory.cost_create", "Custos", "Criar custos.", "medium"),
      permission(
        "inventory.media_update",
        "Midia",
        "Gerenciar fotos.",
        "medium",
      ),
      permission("inventory.delete", "Excluir", "Excluir veiculos.", "high"),
    ],
  },
  {
    key: "finance",
    label: "Financeiro",
    permissions: [
      permission(
        "finance.read",
        "Ler financeiro",
        "Ver lancamentos.",
        "medium",
      ),
      permission(
        "finance.create",
        "Criar lancamento",
        "Criar receitas/gastos.",
        "high",
      ),
      permission(
        "finance.update",
        "Editar lancamento",
        "Alterar financeiro.",
        "high",
      ),
      permission(
        "finance.attach_document",
        "Anexos",
        "Anexar comprovantes.",
        "medium",
      ),
    ],
  },
  {
    key: "crm",
    label: "CRM",
    permissions: [
      permission("crm.access", "Acessar CRM", "Abrir CRM.", "low"),
      permission("crm.manage", "Gerenciar CRM", "Configurar CRM.", "medium"),
      permission("lead.read", "Ler leads", "Ver oportunidades.", "low"),
      permission(
        "lead.create",
        "Criar leads",
        "Cadastrar oportunidades.",
        "medium",
      ),
      permission(
        "lead.update",
        "Editar leads",
        "Alterar oportunidades.",
        "medium",
      ),
    ],
  },
  {
    key: "storefront",
    label: "Loja e site",
    permissions: [
      permission(
        "store_profile.manage",
        "Perfil",
        "Editar dados da loja.",
        "high",
      ),
      permission(
        "store_public_site.manage",
        "Site publico",
        "Publicar vitrine.",
        "high",
      ),
      permission("store.manage", "Loja", "Gerenciar loja.", "high"),
      permission("users.manage", "Usuarios", "Gerenciar papeis.", "high"),
    ],
  },
  marketplacePermissionGroup,
  {
    key: "documents",
    label: "Documentos",
    permissions: [
      permission(
        "documents.read",
        "Ler documentos",
        "Visualizar documentos compartilhados da loja.",
        "medium",
      ),
      permission(
        "documents.download",
        "Baixar",
        "Gerar link de download de documentos.",
        "high",
      ),
      permission(
        "documents.preview",
        "Pre-visualizar",
        "Renderizar previa de documentos.",
        "medium",
      ),
      permission(
        "documents.regenerate",
        "Regenerar",
        "Regenerar documento operacional.",
        "high",
      ),
      permission(
        "documents.template_update",
        "Editar modelos",
        "Alterar clausulas dos documentos da loja.",
        "high",
      ),
      permission(
        "documents.void",
        "Cancelar",
        "Cancelar documentos emitidos.",
        "high",
      ),
    ],
  },
  {
    key: "platform",
    label: "Plataforma",
    permissions: [
      permission(
        "analytics.read",
        "Relatorios",
        "Ler dashboards e metricas comerciais.",
        "medium",
      ),
      permission("billing.manage", "Billing", "Gerenciar cobranca.", "high"),
      permission(
        "compliance.manage",
        "Compliance",
        "Gerenciar LGPD, retencao, revisoes de acesso e postura de seguranca.",
        "high",
      ),
      permission("external_api.manage", "Public API", "Gerenciar API.", "high"),
      permission("audit.read", "Auditoria", "Ler auditoria.", "high"),
      permission("fiscal.manage", "Fiscal", "Gerenciar fiscal.", "high"),
      permission("tenant.manage", "Tenant", "Gerenciar tenant.", "high"),
    ],
  },
] as const;

export function getDefaultPermissions(role: RoleKey): readonly PermissionKey[] {
  return defaultRolePermissions[role] ?? [];
}

function permission(
  key: PermissionKey,
  label: string,
  description: string,
  risk: PermissionRisk,
): PermissionDescriptor {
  return { description, key, label, risk };
}
