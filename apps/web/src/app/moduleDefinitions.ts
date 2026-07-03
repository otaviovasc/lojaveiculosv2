import type { ModuleDefinition, ModuleId } from "./modules";

export const defaultModuleId: ModuleId = "dashboard";

export const moduleDefinitions: Record<ModuleId, ModuleDefinition> = {
  "auto-entries": {
    action: "Mapear regras",
    description: "Lançamentos automáticos aguardando regras operacionais.",
    eyebrow: "Gestão",
    id: "auto-entries",
    title: "Lançamentos",
  },
  autobot: {
    action: "Preparar piloto",
    description: "Automações comerciais isoladas por tenant e permissão.",
    eyebrow: "Serviço",
    id: "autobot",
    title: "Autobot",
  },
  billing: {
    action: "Definir faturas",
    description: "Cobranças, planos e add-ons com estados de bloqueio claros.",
    eyebrow: "Financeiro",
    id: "billing",
    title: "Assinatura",
  },
  checklists: {
    action: "Criar modelos",
    description: "Checklist operacional para entrega, compra e pós-venda.",
    eyebrow: "Gestão",
    id: "checklists",
    title: "Checklists",
  },
  "custom-pages": {
    action: "Criar página",
    description:
      "Landing pages e páginas institucionais com Page Builder da loja.",
    eyebrow: "Canais",
    id: "custom-pages",
    title: "Páginas",
  },
  commissions: {
    action: "Modelar comissões",
    description: "Regras por vendedor, loja e status da venda.",
    eyebrow: "Financeiro",
    id: "commissions",
    title: "Comissões",
  },
  crm: {
    action: "Atender conversas",
    description: "Conversas de WhatsApp com continuidade para a equipe.",
    eyebrow: "Atendimento",
    id: "crm",
    title: "WhatsApp",
  },
  customers: {
    action: "Organizar leads",
    description: "Clientes, oportunidades e histórico comercial da loja.",
    eyebrow: "Atendimento",
    id: "customers",
    title: "Clientes",
  },
  dashboard: {
    action: "Acompanhar operação",
    description: "Visão inicial com indicadores e alertas da operação.",
    eyebrow: "Painel",
    id: "dashboard",
    title: "Início",
  },
  documents: {
    action: "Organizar arquivos",
    description: "Documentos de venda, compra e financiamento por unidade.",
    eyebrow: "Operação",
    id: "documents",
    title: "Documentos",
  },
  domain: {
    action: "Validar DNS",
    description: "Domínio próprio para o site público e canais conectados.",
    eyebrow: "Canais",
    id: "domain",
    title: "Domínio",
  },
  expenses: {
    action: "Classificar gastos",
    description: "Gastos operacionais vinculados a loja, veículo e categoria.",
    eyebrow: "Financeiro",
    id: "expenses",
    title: "Gastos",
  },
  fiscal: {
    action: "Preparar NF-e",
    description:
      "Emissão fiscal com configuração guiada e trilha de auditoria.",
    eyebrow: "Serviço",
    id: "fiscal",
    title: "NF-e",
  },
  inventory: {
    action: "Cadastrar estoque",
    description: "Inventário de veículos com fotos, precificação e status.",
    eyebrow: "Operação",
    id: "inventory",
    title: "Inventário",
  },
  marketplaces: {
    action: "Conectar canais",
    description: "Publicação de estoque em marketplaces com controle por loja.",
    eyebrow: "Canais",
    id: "marketplaces",
    title: "Marketplaces",
  },
  "paid-traffic": {
    action: "Planejar mídia",
    description: "Tráfego pago orientado por estoque, margem e origem do lead.",
    eyebrow: "Serviço",
    id: "paid-traffic",
    title: "Tráfego",
  },
  "public-api": {
    action: "Publicar chaves",
    description: "API pública versionada para estoque, leads e integrações.",
    eyebrow: "Plataforma",
    id: "public-api",
    title: "Public API",
  },
  "public-site": {
    action: "Personalizar vitrine",
    description:
      "Personalização da vitrine pública, SEO local e identidade da loja.",
    eyebrow: "Canais",
    id: "public-site",
    title: "Personalizar",
  },
  reports: {
    action: "Montar relatórios",
    description:
      "Relatórios gerenciais com filtros por período, loja e origem.",
    eyebrow: "Gestão",
    id: "reports",
    title: "Relatórios",
  },
  sales: {
    action: "Fechar venda",
    description: "Rascunhos, reservas e fechamento com lead e veículo ligados.",
    eyebrow: "Operação",
    id: "sales",
    title: "Vendas",
  },
  settings: {
    action: "Revisar parâmetros",
    description: "Configurações de loja, usuários, papéis e preferências.",
    eyebrow: "Sistema",
    id: "settings",
    title: "Configurações",
  },
  simulations: {
    action: "Simular venda",
    description: "Cenários comerciais e financiamento antes da proposta final.",
    eyebrow: "Operação",
    id: "simulations",
    title: "Simulações",
  },
};
