import { permission, type PermissionGroup } from "./permissionCatalogTypes.js";

export const operationalPermissionGroups = [
  {
    key: "inventory",
    label: "Estoque de Veículos",
    permissions: [
      permission(
        "inventory.read",
        "Visualizar estoque",
        "Visualizar veículos cadastrados no estoque.",
        "low",
      ),
      permission(
        "inventory.create",
        "Cadastrar veículo",
        "Adicionar novos veículos ao estoque.",
        "medium",
      ),
      permission(
        "inventory.update_price",
        "Alterar preço",
        "Modificar o preço de venda de um veículo.",
        "high",
      ),
      permission(
        "inventory.update_description",
        "Editar descrição",
        "Alterar as especificações e textos públicos do anúncio.",
        "medium",
      ),
      permission(
        "inventory.update_internal_notes",
        "Editar notas internas",
        "Visualizar e editar observações internas e histórico privado do veículo.",
        "medium",
      ),
      permission(
        "inventory.reserve",
        "Reservar veículo",
        "Bloquear temporariamente um veículo para um cliente.",
        "high",
      ),
      permission(
        "inventory.sell",
        "Confirmar venda",
        "Marcar veículo como vendido no estoque.",
        "high",
      ),
      permission(
        "inventory.cost_create",
        "Registrar custos",
        "Lançar despesas ou custos de preparação e manutenção do veículo.",
        "medium",
      ),
      permission(
        "inventory.checklist_read",
        "Visualizar vistorias (Checklists)",
        "Consultar listas de checagem e vistorias dos veículos.",
        "low",
      ),
      permission(
        "inventory.checklist_update",
        "Realizar vistorias (Checklists)",
        "Preencher ou atualizar etapas de vistoria e preparação do veículo.",
        "medium",
      ),
      permission(
        "inventory.media_update",
        "Gerenciar fotos",
        "Adicionar, remover ou ordenar fotos e vídeos do veículo.",
        "medium",
      ),
      permission(
        "inventory.delete",
        "Excluir veículo",
        "Remover permanentemente um veículo do sistema.",
        "high",
      ),
    ],
  },
  {
    key: "finance",
    label: "Financeiro da Loja",
    permissions: [
      permission(
        "finance.read",
        "Visualizar financeiro",
        "Consultar relatórios, entradas, saídas e fluxo de caixa.",
        "medium",
      ),
      permission(
        "finance.create",
        "Lançar movimentações",
        "Registrar novas receitas, despesas ou pagamentos.",
        "high",
      ),
      permission(
        "finance.update",
        "Editar movimentações",
        "Alterar ou estornar registros financeiros cadastrados.",
        "high",
      ),
      permission(
        "finance.attach_document",
        "Anexar comprovantes",
        "Adicionar recibos, comprovantes ou notas fiscais a um lançamento financeiro.",
        "medium",
      ),
    ],
  },
  {
    key: "sales",
    label: "Processo de Vendas",
    permissions: [
      permission(
        "sale.read",
        "Visualizar vendas",
        "Visualizar propostas e histórico de vendas de veículos.",
        "low",
      ),
      permission(
        "sale.draft",
        "Criar propostas (Rascunhos)",
        "Elaborar e editar rascunhos de propostas de venda.",
        "medium",
      ),
      permission(
        "sale.reserve",
        "Reservar venda",
        "Bloquear veículo vinculado a uma proposta ativa.",
        "high",
      ),
      permission(
        "sale.close",
        "Finalizar venda",
        "Concluir o processo de venda e faturar o veículo.",
        "high",
      ),
      permission(
        "sale.correct",
        "Corrigir venda",
        "Alterar dados de uma venda já finalizada.",
        "high",
      ),
      permission(
        "sale.cancel",
        "Cancelar venda",
        "Desfazer uma venda ativa ou concluída.",
        "high",
      ),
      permission(
        "sale.override_required_fields",
        "Ignorar pendências",
        "Liberar prosseguimento de vendas com campos obrigatórios pendentes.",
        "high",
      ),
    ],
  },
] satisfies readonly PermissionGroup[];
