import type { PermissionDescriptor } from "./permissionCatalogTypes.js";

export const crmPermissionDescriptors = [
  {
    description:
      "Visualizar os canais de mensagens e a fila unificada de atendimentos.",
    key: "crm.conversations.read",
    label: "Visualizar canais",
    risk: "low",
  },
  {
    description:
      "Cadastrar a configuração inicial e gravar credenciais write-only de um canal.",
    key: "crm.messaging.connection.setup",
    label: "Configurar novo canal",
    risk: "high",
  },
  {
    description:
      "Solicitar QR Code ou código por telefone e atualizar o estado de conexão do canal.",
    key: "crm.messaging.connection.pair",
    label: "Conectar canal",
    risk: "high",
  },
  {
    description:
      "Escolher a conexão padrão usada para operações de saída em cada canal do CRM.",
    key: "crm.routing.default.manage",
    label: "Gerenciar rotas padrão",
    risk: "high",
  },
  {
    description: "Iniciar novas conversas e enviar mensagens aos clientes.",
    key: "crm.messages.send",
    label: "Enviar mensagens",
    risk: "medium",
  },
  {
    description: "Visualizar campanhas de mensagens e seus indicadores.",
    key: "crm.campaigns.read",
    label: "Visualizar campanhas",
    risk: "low",
  },
  {
    description: "Criar, pausar, retomar e cancelar campanhas de mensagens.",
    key: "crm.campaigns.manage",
    label: "Gerenciar campanhas",
    risk: "high",
  },
  {
    description: "Visualizar mensagens agendadas nos canais do CRM.",
    key: "crm.scheduled_messages.read",
    label: "Visualizar agendamentos",
    risk: "low",
  },
  {
    description: "Agendar mensagens nos canais do CRM para envio futuro.",
    key: "crm.scheduled_messages.create",
    label: "Agendar mensagens",
    risk: "medium",
  },
  {
    description: "Cancelar mensagens agendadas nos canais do CRM.",
    key: "crm.scheduled_messages.cancel",
    label: "Cancelar agendamentos",
    risk: "medium",
  },
  {
    description: "Processar e disparar mensagens agendadas vencidas.",
    key: "crm.scheduled_messages.process",
    label: "Processar agendamentos",
    risk: "high",
  },
  {
    description: "Aplicar e remover etiquetas simples nas conversas.",
    key: "crm.tags.assign",
    label: "Aplicar etiquetas",
    risk: "medium",
  },
  {
    description: "Criar, editar, excluir e reordenar etiquetas do CRM.",
    key: "crm.tags.manage",
    label: "Gerenciar etiquetas",
    risk: "medium",
  },
  {
    description: "Transferir e direcionar conversas para outros atendentes.",
    key: "crm.conversations.assign",
    label: "Transferir atendimentos",
    risk: "medium",
  },
  {
    description: "Encerrar e finalizar conversas no painel de atendimento.",
    key: "crm.conversations.manage",
    label: "Finalizar conversas",
    risk: "medium",
  },
  {
    description:
      "Visualizar a configuração, cobertura e diagnóstico do Bot Externo.",
    key: "crm.bot.read",
    label: "Visualizar Bot Externo",
    risk: "low",
  },
  {
    description:
      "Configurar o Bot Externo, suas políticas e segredos write-only.",
    key: "crm.bot.manage",
    label: "Gerenciar Bot Externo",
    risk: "high",
  },
  {
    description: "Aprovar ou rejeitar propostas pendentes do Bot Externo.",
    key: "crm.bot.proposals.decide",
    label: "Decidir propostas do Bot Externo",
    risk: "high",
  },
  {
    description: "Gerenciar atendimento humano e bloqueio de automações.",
    key: "crm.attendances.manage",
    label: "Gerenciar atendimento humano",
    risk: "high",
  },
  {
    description: "Visualizar etapas e configurações do pipeline CRM.",
    key: "crm.pipeline.read",
    label: "Visualizar pipeline",
    risk: "low",
  },
  {
    description: "Mover leads entre etapas persistidas do pipeline CRM.",
    key: "crm.pipeline.move",
    label: "Mover leads no pipeline",
    risk: "medium",
  },
  {
    description: "Criar, editar, excluir e reordenar etapas do pipeline CRM.",
    key: "crm.pipeline.manage",
    label: "Gerenciar pipeline",
    risk: "high",
  },
  {
    description: "Visualizar visitas vinculadas aos leads da loja.",
    key: "crm.visits.read",
    label: "Visualizar visitas",
    risk: "low",
  },
  {
    description:
      "Criar, reagendar, concluir e cancelar visitas vinculadas a leads.",
    key: "crm.visits.manage",
    label: "Gerenciar visitas",
    risk: "medium",
  },
] satisfies readonly PermissionDescriptor[];
