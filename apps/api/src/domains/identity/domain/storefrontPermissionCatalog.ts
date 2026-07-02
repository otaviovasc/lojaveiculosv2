import { crmWhatsappPermissionDescriptors } from "./crmWhatsappPermissionCatalog.js";
import { permission, type PermissionGroup } from "./permissionCatalogTypes.js";

export const crmPermissionGroup: PermissionGroup = {
  key: "crm",
  label: "Atendimento e Clientes (CRM)",
  permissions: [
    permission(
      "crm.access",
      "Acessar atendimento",
      "Abrir o painel de atendimento e contatos.",
      "low",
    ),
    permission(
      "crm.manage",
      "Configurar atendimento",
      "Configurar canais, filas e integrações de mensagens.",
      "medium",
    ),
    ...crmWhatsappPermissionDescriptors,
    permission(
      "lead.read",
      "Visualizar contatos",
      "Visualizar novas oportunidades e interesses recebidos.",
      "low",
    ),
    permission(
      "lead.create",
      "Cadastrar contatos",
      "Inserir novos clientes ou interesses manualmente.",
      "medium",
    ),
    permission(
      "lead.update",
      "Editar contatos",
      "Atualizar dados cadastrais e histórico de clientes.",
      "medium",
    ),
  ],
};

export const storefrontPermissionGroup: PermissionGroup = {
  key: "storefront",
  label: "Configurações da Loja",
  permissions: [
    permission(
      "store_profile.manage",
      "Dados da empresa",
      "Editar dados cadastrais, endereço e contatos da loja.",
      "high",
    ),
    permission(
      "store_public_site.manage",
      "Design da vitrine",
      "Personalizar visual, domínios e publicar o site da loja.",
      "high",
    ),
    permission(
      "store.manage",
      "Gerenciar filiais",
      "Controlar parametrização de filiais e unidades.",
      "high",
    ),
    permission(
      "users.manage",
      "Gerenciar equipe",
      "Configurar perfis de acesso, cargos e permissões de usuários.",
      "high",
    ),
  ],
};

export const platformPermissionGroup: PermissionGroup = {
  key: "platform",
  label: "Administração da Plataforma",
  permissions: [
    permission(
      "analytics.read",
      "Relatórios e métricas",
      "Consultar relatórios e métricas de desempenho comercial da loja.",
      "medium",
    ),
    permission(
      "billing.manage",
      "Assinatura e faturamento",
      "Gerenciar mensalidade, faturas e planos da plataforma.",
      "high",
    ),
    permission(
      "compliance.manage",
      "Privacidade e segurança (LGPD)",
      "Gerenciar termos de uso, LGPD e regras de proteção de dados.",
      "high",
    ),
    permission(
      "external_api.manage",
      "Integrações externas (API)",
      "Configurar chaves de acesso para integração de sistemas externos.",
      "high",
    ),
    permission(
      "audit.read",
      "Histórico de auditoria",
      "Consultar logs de ações executadas pelos usuários.",
      "high",
    ),
    permission(
      "fiscal.manage",
      "Emissão de notas fiscais",
      "Configurar dados de impostos e emissão de notas (NFe).",
      "high",
    ),
    permission(
      "fiscal.document.issue",
      "Emitir documentos fiscais",
      "Criar tentativas de emissão de NF-e e NFS-e pela integração fiscal.",
      "high",
    ),
    permission(
      "fiscal.document.cancel",
      "Cancelar documentos fiscais",
      "Solicitar cancelamento de documentos fiscais emitidos.",
      "high",
    ),
    permission(
      "fiscal.recipient.manage",
      "Gerenciar tomadores fiscais",
      "Cadastrar e atualizar financeiras, bancos e tomadores de serviço.",
      "high",
    ),
    permission(
      "fiscal.template.manage",
      "Gerenciar modelos de NFS-e",
      "Cadastrar modelos de discriminação, retenções e códigos de serviço.",
      "high",
    ),
    permission(
      "tenant.manage",
      "Configurações globais da conta",
      "Ajustar regras gerais da conta master da loja.",
      "high",
    ),
  ],
};
