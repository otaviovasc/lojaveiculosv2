import type { PermissionDescriptor } from "./permissionCatalogTypes.js";

export const crmWhatsappPermissionDescriptors = [
  {
    description: "Visualizar a fila de atendimentos e conexões do WhatsApp.",
    key: "crm.whatsapp.list",
    label: "Visualizar conexões",
    risk: "low",
  },
  {
    description: "Abrir e ler mensagens recebidas no WhatsApp.",
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
    description: "Visualizar campanhas WhatsApp e seus indicadores.",
    key: "crm.whatsapp.campaigns.read",
    label: "Visualizar campanhas",
    risk: "low",
  },
  {
    description: "Criar, pausar, retomar e cancelar campanhas WhatsApp.",
    key: "crm.whatsapp.campaigns.manage",
    label: "Gerenciar campanhas",
    risk: "high",
  },
  {
    description: "Visualizar mensagens WhatsApp agendadas.",
    key: "crm.whatsapp.schedules.read",
    label: "Visualizar agendamentos",
    risk: "low",
  },
  {
    description: "Agendar mensagens WhatsApp para envio futuro.",
    key: "crm.whatsapp.schedules.create",
    label: "Agendar mensagens",
    risk: "medium",
  },
  {
    description: "Cancelar mensagens WhatsApp agendadas.",
    key: "crm.whatsapp.schedules.cancel",
    label: "Cancelar agendamentos",
    risk: "medium",
  },
  {
    description: "Processar e disparar mensagens WhatsApp vencidas.",
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
    description: "Criar, editar, excluir e reordenar etiquetas do WhatsApp.",
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
      "Editar metadados, status, credenciais por variavel de ambiente e webhooks ZAPI.",
    key: "crm.whatsapp.connection.manage",
    label: "Gerenciar conexao ZAPI",
    risk: "high",
  },
  {
    description: "Configurar bot externo, segredos write-only e Action API.",
    key: "crm.whatsapp.integrations.manage",
    label: "Gerenciar integracoes",
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
