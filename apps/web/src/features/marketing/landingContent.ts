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

export const landingPains = [
  {
    title: "Burocracia fiscal manual",
    pain: "Notas de entrada, venda e consignação emitidas em portais lentos, com risco de erro tributário.",
    solution: "Emissão de NFe e NFSe integrada ao fluxo da venda.",
  },
  {
    title: "Leads esquecidos no pós-venda",
    pain: "Compradores antigos ficam frios e nunca são reengajados para a próxima troca.",
    solution:
      "CRM com WhatsApp, campanhas e test-drives conectados ao estoque.",
  },
  {
    title: "Caixa e comissões sem rumo",
    pain: "Sem visão real do fluxo de caixa e do lucro por carro, com comissão calculada na planilha.",
    solution:
      "Financeiro com despesas, cobrança e comissões registradas por venda.",
  },
  {
    title: "Equipe sem controle de acesso",
    pain: "Dados sensíveis da loja expostos por falta de permissões por papel.",
    solution: "Permissões por papel e operação auditada em cada ação.",
  },
] as const;

export const landingSteps = [
  [
    "Cadastro único",
    "Insira os dados do veículo uma vez: ficha, fotos, checklist e custos.",
  ],
  [
    "Publicação controlada",
    "Site da loja no ar e anúncios em marketplaces em fila auditada.",
  ],
  [
    "Venda no caixa",
    "Leads no CRM, venda registrada, comissão e financeiro no mesmo painel.",
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
