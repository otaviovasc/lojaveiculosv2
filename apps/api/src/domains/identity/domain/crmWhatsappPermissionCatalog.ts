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
    description: "Assumir atendimento manual pausando fluxos automáticos.",
    key: "crm.whatsapp.toggle_intervention",
    label: "Intervir em conversas",
    risk: "high",
  },
] satisfies readonly PermissionDescriptor[];
