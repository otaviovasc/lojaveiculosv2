import { permission, type PermissionGroup } from "./permissionCatalogTypes.js";

export const marketplacePermissionGroup: PermissionGroup = {
  key: "marketplace",
  label: "Portais e Anúncios",
  permissions: [
    permission(
      "marketplace.read",
      "Visualizar integrações",
      "Visualizar status das conexões com OLX e Mercado Livre.",
      "low",
    ),
    permission(
      "marketplace.manage",
      "Gerenciar integrações",
      "Conectar, pausar e configurar contas nos portais parceiros.",
      "high",
    ),
    permission(
      "marketplace.listing_publish",
      "Publicar anúncios",
      "Enviar veículos cadastrados para os portais integrados.",
      "high",
    ),
    permission(
      "marketplace.listing_update",
      "Atualizar anúncios",
      "Sincronizar preços, fotos e descrições dos anúncios nos portais.",
      "medium",
    ),
    permission(
      "marketplace.listing_unpublish",
      "Remover anúncios",
      "Retirar os veículos dos canais e portais conectados.",
      "high",
    ),
    permission(
      "marketplace.inventory_sync",
      "Sincronizar estoque",
      "Executar a sincronização manual do estoque com os portais.",
      "medium",
    ),
    permission(
      "marketplace.lead_sync",
      "Sincronizar contatos",
      "Importar contatos e propostas recebidos por meio dos portais.",
      "medium",
    ),
  ],
};
