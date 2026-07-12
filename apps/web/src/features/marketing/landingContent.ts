import {
  BarChart3,
  Car,
  Globe2,
  MessageCircle,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";

export const landingOutcomes = [
  ["Site profissional", "Vitrine pública com domínio, páginas e SEO."],
  ["Estoque em ordem", "Fotos, preços, status e histórico em um fluxo."],
  ["Leads no WhatsApp", "Contato direto por veículo, campanha e vendedor."],
  ["Portais integrados", "Pronto para publicar em OLX e Mercado Livre."],
] as const;

export const landingSteps = [
  ["Crie a conta", "Valide seu acesso e configure o perfil da loja."],
  ["Cadastre o estoque", "Inclua unidade, fotos, checklist e custo de compra."],
  [
    "Publique e acompanhe",
    "Site, CRM, marketplace e financeiro no mesmo painel.",
  ],
] as const;

export const landingFeatures = [
  {
    icon: Globe2,
    label: "Site e páginas",
    text: "Construtor visual para loja, páginas extras e domínio próprio.",
  },
  {
    icon: Car,
    label: "Inventário",
    text: "Cadastro completo com unidades, mídia, documentos e ciclo de venda.",
  },
  {
    icon: MessageCircle,
    label: "CRM comercial",
    text: "Leads, clientes, WhatsApp e test-drives conectados ao estoque.",
  },
  {
    icon: UploadCloud,
    label: "Marketplaces",
    text: "Fila auditada para publicar, atualizar e despublicar anúncios.",
  },
  {
    icon: BarChart3,
    label: "Gestão",
    text: "Financeiro, cobrança, relatórios e permissões por papel.",
  },
  {
    icon: ShieldCheck,
    label: "Conta segura",
    text: "Acesso protegido, convites para a equipe e permissões por loja.",
  },
] as const;
