import type { PermissionDescriptor } from "./permissionCatalog.js";

export const crmWhatsappPermissionDescriptors = [
  {
    description: "Ver fila, conexoes e contexto inicial do WhatsApp.",
    key: "crm.whatsapp.list",
    label: "Listar WhatsApp",
    risk: "low",
  },
  {
    description: "Abrir conversas e mensagens do WhatsApp.",
    key: "crm.whatsapp.read",
    label: "Ler WhatsApp",
    risk: "low",
  },
  {
    description: "Criar conversas e enviar mensagens de WhatsApp.",
    key: "crm.whatsapp.send",
    label: "Enviar WhatsApp",
    risk: "medium",
  },
  {
    description: "Atribuir conversas de WhatsApp.",
    key: "crm.whatsapp.assign",
    label: "Atribuir WhatsApp",
    risk: "medium",
  },
  {
    description: "Encerrar conversas de WhatsApp.",
    key: "crm.whatsapp.close",
    label: "Fechar WhatsApp",
    risk: "medium",
  },
  {
    description: "Alternar atendimento manual em conversas de WhatsApp.",
    key: "crm.whatsapp.toggle_intervention",
    label: "Intervencao WhatsApp",
    risk: "high",
  },
] satisfies readonly PermissionDescriptor[];
