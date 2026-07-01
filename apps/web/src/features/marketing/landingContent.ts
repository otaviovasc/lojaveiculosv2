import {
  BarChart3,
  Car,
  Globe2,
  MessageCircle,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

export const landingOutcomes = [
  ["Site profissional", "Vitrine publica com dominio, paginas e SEO."],
  ["Estoque em ordem", "Fotos, precos, status e historico em um fluxo."],
  ["Leads no WhatsApp", "Contato direto por veiculo, campanha e vendedor."],
  ["Portais integrados", "Pronto para publicar em OLX e Mercado Livre."],
] as const;

export const landingSteps = [
  ["Crie a conta", "Clerk valida o usuario e abre o onboarding da loja."],
  ["Cadastre o estoque", "Inclua unidade, fotos, checklist e custo de compra."],
  [
    "Publique e acompanhe",
    "Site, CRM, marketplace e financeiro no mesmo painel.",
  ],
] as const;

export const landingFeatures = [
  {
    icon: Globe2,
    label: "Site e paginas",
    text: "Construtor visual para loja, paginas extras e dominio proprio.",
  },
  {
    icon: Car,
    label: "Inventario",
    text: "Cadastro completo com unidades, midia, documentos e ciclo de venda.",
  },
  {
    icon: MessageCircle,
    label: "CRM comercial",
    text: "Leads, clientes, WhatsApp e test-drives conectados ao estoque.",
  },
  {
    icon: UploadCloud,
    label: "Marketplaces",
    text: "Fila auditada para publicar, atualizar e despublicar anuncios.",
  },
  {
    icon: BarChart3,
    label: "Gestao",
    text: "Financeiro, cobranca, relatorios e permissoes por papel.",
  },
  {
    icon: ShieldCheck,
    label: "Conta segura",
    text: "Acesso por Clerk, convite real e escopo por loja/tenant.",
  },
] as const;
