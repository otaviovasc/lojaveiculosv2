import type { PermissionKey } from "@lojaveiculosv2/shared";
import type {
  PermissionDescriptor,
  PermissionGroup,
  PermissionRisk,
} from "./permissionCatalog.js";

export const marketplacePermissionGroup: PermissionGroup = {
  key: "marketplace",
  label: "Marketplaces",
  permissions: [
    permission(
      "marketplace.read",
      "Ler canais",
      "Visualizar conexoes OLX e Mercado Livre.",
      "low",
    ),
    permission(
      "marketplace.manage",
      "Gerenciar canais",
      "Conectar, pausar e configurar contas de marketplaces.",
      "high",
    ),
    permission(
      "marketplace.listing_publish",
      "Publicar anuncios",
      "Enviar veiculos para marketplaces.",
      "high",
    ),
    permission(
      "marketplace.listing_update",
      "Atualizar anuncios",
      "Sincronizar preco, fotos e descricao.",
      "medium",
    ),
    permission(
      "marketplace.listing_unpublish",
      "Remover anuncios",
      "Tirar veiculos dos canais conectados.",
      "high",
    ),
    permission(
      "marketplace.inventory_sync",
      "Sincronizar estoque",
      "Executar sincronizacao de inventario.",
      "medium",
    ),
    permission(
      "marketplace.lead_sync",
      "Sincronizar leads",
      "Importar leads recebidos nos marketplaces.",
      "medium",
    ),
  ],
};

function permission(
  key: PermissionKey,
  label: string,
  description: string,
  risk: PermissionRisk,
): PermissionDescriptor {
  return { description, key, label, risk };
}
