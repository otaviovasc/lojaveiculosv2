import type { PermissionDescriptor } from "./permissionCatalogTypes.js";

export const crmWhatsappPermissionDescriptors = [
  {
    description:
      "Visualizar os canais de mensagens e a fila unificada de atendimentos.",
    key: "crm.whatsapp.list",
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
    description: "Abrir e ler mensagens recebidas nos canais do CRM.",
    key: "crm.whatsapp.read",
    label: "Visualizar conversas",
    risk: "low",
  },
  {
    description: "Iniciar novas conversas e enviar mensagens aos clientes.",
    key: "crm.whatsapp.send",
    label: "Enviar mensagens",
    risk: "medium",
  },
  {
    description: "Visualizar campanhas de mensagens e seus indicadores.",
    key: "crm.whatsapp.campaigns.read",
    label: "Visualizar campanhas",
    risk: "low",
  },
  {
    description: "Criar, pausar, retomar e cancelar campanhas de mensagens.",
    key: "crm.whatsapp.campaigns.manage",
    label: "Gerenciar campanhas",
    risk: "high",
  },
  {
    description: "Visualizar mensagens agendadas nos canais do CRM.",
    key: "crm.whatsapp.schedules.read",
    label: "Visualizar agendamentos",
    risk: "low",
  },
  {
    description: "Agendar mensagens nos canais do CRM para envio futuro.",
    key: "crm.whatsapp.schedules.create",
    label: "Agendar mensagens",
    risk: "medium",
  },
  {
    description: "Cancelar mensagens agendadas nos canais do CRM.",
    key: "crm.whatsapp.schedules.cancel",
    label: "Cancelar agendamentos",
    risk: "medium",
  },
  {
    description: "Processar e disparar mensagens agendadas vencidas.",
    key: "crm.whatsapp.schedules.process",
    label: "Processar agendamentos",
    risk: "high",
  },
  {
    description: "Aplicar e remover etiquetas simples nas conversas.",
    key: "crm.whatsapp.tags.assign",
    label: "Aplicar etiquetas",
    risk: "medium",
  },
  {
    description: "Criar, editar, excluir e reordenar etiquetas do CRM.",
    key: "crm.whatsapp.tags.manage",
    label: "Gerenciar etiquetas",
    risk: "medium",
  },
  {
    description: "Transferir e direcionar conversas para outros atendentes.",
    key: "crm.whatsapp.assign",
    label: "Transferir atendimentos",
    risk: "medium",
  },
  {
    description: "Encerrar e finalizar conversas no painel de atendimento.",
    key: "crm.whatsapp.close",
    label: "Finalizar conversas",
    risk: "medium",
  },
  {
    description:
      "Configurar bots, automações e segredos write-only usados no atendimento.",
    key: "crm.whatsapp.integrations.manage",
    label: "Gerenciar automações",
    risk: "high",
  },
  {
    description: "Assumir atendimento manual pausando fluxos automáticos.",
    key: "crm.whatsapp.toggle_intervention",
    label: "Intervir em conversas",
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
