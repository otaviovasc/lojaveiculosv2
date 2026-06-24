import type { PermissionDescriptor } from "./permissionCatalog.js";

export const documentPermissionDescriptors = [
  {
    description: "Visualizar documentos compartilhados da loja.",
    key: "documents.read",
    label: "Ler documentos",
    risk: "medium",
  },
  {
    description: "Gerar link de download de documentos.",
    key: "documents.download",
    label: "Baixar",
    risk: "high",
  },
  {
    description: "Renderizar previa de documentos.",
    key: "documents.preview",
    label: "Pre-visualizar",
    risk: "medium",
  },
  {
    description: "Regenerar documento operacional.",
    key: "documents.regenerate",
    label: "Regenerar",
    risk: "high",
  },
  {
    description: "Alterar clausulas dos documentos da loja.",
    key: "documents.template_update",
    label: "Editar modelos",
    risk: "high",
  },
  {
    description: "Alterar titulo e tipo de documentos anexados.",
    key: "documents.update_metadata",
    label: "Editar metadados",
    risk: "high",
  },
  {
    description: "Alterar vinculos de documentos com loja e unidades.",
    key: "documents.update_links",
    label: "Gerenciar vinculos",
    risk: "high",
  },
  {
    description: "Enviar e registrar documentos externos.",
    key: "documents.upload",
    label: "Anexar documentos",
    risk: "high",
  },
  {
    description: "Cancelar documentos emitidos.",
    key: "documents.void",
    label: "Cancelar",
    risk: "high",
  },
] satisfies readonly PermissionDescriptor[];
