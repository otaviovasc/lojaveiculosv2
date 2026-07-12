import { permission, type PermissionGroup } from "./permissionCatalogTypes.js";

export const automationPermissionGroup: PermissionGroup = {
  key: "automation",
  label: "Automação Assistida",
  permissions: [
    permission(
      "automation.read",
      "Visualizar automações",
      "Consultar prévias, etapas e decisões de automação da loja.",
      "low",
    ),
    permission(
      "automation.run",
      "Criar prévias",
      "Preparar um plano somente leitura sem executar ferramentas.",
      "medium",
    ),
    permission(
      "automation.cancel",
      "Cancelar prévias",
      "Cancelar uma prévia de automação ainda aguardando decisão.",
      "medium",
    ),
    permission(
      "automation.approve",
      "Decidir prévias",
      "Aprovar ou rejeitar uma proposta vinculada ao conteúdo revisado.",
      "high",
    ),
  ],
};
