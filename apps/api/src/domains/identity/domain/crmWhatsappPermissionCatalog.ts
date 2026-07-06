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
    description: "Visualizar mensagens WhatsApp agendadas.",
    key: "crm.whatsapp.schedule.read",
    label: "Visualizar agendamentos",
    risk: "low",
  },
  {
    description: "Agendar mensagens WhatsApp para envio futuro.",
    key: "crm.whatsapp.schedule.create",
    label: "Agendar mensagens",
    risk: "medium",
  },
  {
    description: "Cancelar mensagens WhatsApp agendadas.",
    key: "crm.whatsapp.schedule.cancel",
    label: "Cancelar agendamentos",
    risk: "medium",
  },
  {
    description: "Processar e disparar mensagens WhatsApp vencidas.",
    key: "crm.whatsapp.schedule.process",
    label: "Processar agendamentos",
    risk: "high",
  },
  {
    description: "Aplicar e remover etiquetas simples nas conversas.",
    key: "crm.whatsapp.tag.assign",
    label: "Aplicar etiquetas",
    risk: "medium",
  },
  {
    description: "Criar, editar, excluir e reordenar etiquetas do WhatsApp.",
    key: "crm.whatsapp.tag.manage",
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
    description: "Editar nome, telefone, identificadores e metadados da ZAPI.",
    key: "crm.whatsapp.connection.update_metadata",
    label: "Editar metadados ZAPI",
    risk: "high",
  },
  {
    description: "Alterar o status operacional configurado da conexao ZAPI.",
    key: "crm.whatsapp.connection.update_status",
    label: "Alterar status ZAPI",
    risk: "high",
  },
  {
    description: "Editar referencias de variaveis de ambiente da ZAPI.",
    key: "crm.whatsapp.connection.update_credentials",
    label: "Editar credenciais ZAPI",
    risk: "high",
  },
  {
    description: "Editar base externa usada para webhooks da ZAPI.",
    key: "crm.whatsapp.connection.update_webhooks",
    label: "Editar webhooks ZAPI",
    risk: "high",
  },
  {
    description: "Assumir atendimento manual pausando fluxos automáticos.",
    key: "crm.whatsapp.toggle_intervention",
    label: "Intervir em conversas",
    risk: "high",
  },
] satisfies readonly PermissionDescriptor[];
