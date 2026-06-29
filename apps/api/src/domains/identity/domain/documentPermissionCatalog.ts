import type { PermissionDescriptor } from "./permissionCatalogTypes.js";

export const documentPermissionDescriptors = [
  {
    description: "Visualizar e consultar termos e contratos da loja.",
    key: "documents.read",
    label: "Visualizar documentos",
    risk: "medium",
  },
  {
    description: "Fazer o download dos documentos em formato PDF.",
    key: "documents.download",
    label: "Baixar documentos",
    risk: "high",
  },
  {
    description: "Visualizar prévia de arquivos antes de emitir ou salvar.",
    key: "documents.preview",
    label: "Pré-visualizar",
    risk: "medium",
  },
  {
    description: "Recriar o arquivo em PDF de um contrato gerado.",
    key: "documents.regenerate",
    label: "Regenerar arquivos",
    risk: "high",
  },
  {
    description: "Editar cláusulas e condições dos modelos de documentos.",
    key: "documents.template_update",
    label: "Editar modelos de contratos",
    risk: "high",
  },
  {
    description: "Alterar título, descrição e categorias de documentos.",
    key: "documents.update_metadata",
    label: "Editar informações",
    risk: "high",
  },
  {
    description: "Alterar associações de documentos com veículos e vendas.",
    key: "documents.update_links",
    label: "Gerenciar associações",
    risk: "high",
  },
  {
    description: "Registrar e anexar documentos externos ao sistema.",
    key: "documents.upload",
    label: "Anexar arquivos",
    risk: "high",
  },
  {
    description: "Cancelar e invalidar documentos oficiais emitidos.",
    key: "documents.void",
    label: "Invalidar documentos",
    risk: "high",
  },
] satisfies readonly PermissionDescriptor[];
