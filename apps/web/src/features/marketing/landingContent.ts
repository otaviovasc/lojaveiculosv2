import {
  BadgeDollarSign,
  Braces,
  Car,
  FileText,
  Globe2,
  MessageCircle,
  ShieldCheck,
  UploadCloud,
  Wallet,
} from "lucide-react";

export const landingHero = {
  badge: "SaaS para lojas de veículos",
  titleLead: "O sistema que faz você vender até",
  titleAccent: "10 carros",
  titleTrail: "a mais por mês.",
  subtitle:
    "CRM WhatsApp com rodízio de leads, financeiro completo e emissão de notas (NFe/NFSe) integrada.",
  secondaryCta: "Ver a plataforma",
} as const;

export const landingPills = [
  "Migra em 5 min",
  "Suporte via WhatsApp",
  "Sem taxa de adesão",
] as const;

export const landingMetrics = [
  {
    metric: "< 5 min",
    label: "Produtividade real",
    text: "Tempo médio para cadastrar e publicar um veículo em toda a sua rede.",
  },
  {
    metric: "+40%",
    label: "Conversão de leads",
    text: "Aumento médio no fechamento de vendas através da centralização.",
  },
  {
    metric: "100%",
    label: "Controle de estoque",
    text: "Sincronização total: vendeu em um lugar, sai de todos os outros.",
  },
] as const;

export const landingPains = [
  {
    title: "Burocracia fiscal manual",
    pain: "NFe e NFSe de entrada, venda e consignação emitidas em portais lentos do governo, com risco de erro tributário.",
    solution: "Emissão de NFe e NFSe integrada ao fluxo da venda.",
  },
  {
    title: "Leads antigos esquecidos",
    pain: "Sem pós-venda ativo, compradores anteriores ficam frios e nunca são reengajados para a próxima troca.",
    solution:
      "CRM com WhatsApp, campanhas e rodízio de leads conectados ao estoque.",
  },
  {
    title: "Caixa e comissões sem rumo",
    pain: "Sem visão real do fluxo de caixa e do lucro por carro, com noites em claro calculando comissões na planilha.",
    solution:
      "Financeiro com despesas, cobrança e comissões calculadas por venda.",
  },
  {
    title: "Equipe sem controle de acesso",
    pain: "Dados sensíveis da loja expostos por falta de permissões e acessos restritos para vendedores.",
    solution: "Permissões por papel e operação auditada em cada ação.",
  },
] as const;

export const landingSteps = [
  {
    title: "Cadastro único",
    text: "Insira os dados do veículo uma única vez: ficha, fotos, checklist e custos.",
  },
  {
    title: "Sincronia total",
    text: "O motor publica seu estoque no site da loja e nos portais simultaneamente.",
  },
  {
    title: "Venda concluída",
    text: "Receba leads qualificados, registre a venda e veja comissão e financeiro no mesmo painel.",
  },
] as const;

export const landingProductHighlights = [
  {
    title: "Financeiro e fiscal integrado",
    text: "Emita NFe e NFSe de entrada, venda e consignação em segundos e automatize o repasse de comissões da equipe.",
  },
  {
    title: "CRM WhatsApp e pós-venda ativo",
    text: "Rodízio inteligente de leads, campanhas em massa e recuperação de compradores antigos para a próxima troca.",
  },
  {
    title: "Showroom e acessos limitados",
    text: "Site premium integrado aos maiores portais automotivos, com permissões restritas para cada vendedor.",
  },
] as const;

export const landingFeatures = [
  {
    icon: Globe2,
    label: "Site e vitrine",
    text: "Construtor visual para loja, páginas extras e domínio próprio.",
  },
  {
    icon: Car,
    label: "Estoque",
    text: "Cadastro completo com unidades, mídia, documentos e ciclo de venda.",
  },
  {
    icon: BadgeDollarSign,
    label: "Vendas e comissões",
    text: "Venda registrada no caixa com comissão calculada por vendedor.",
  },
  {
    icon: Wallet,
    label: "Financeiro",
    text: "Fluxo de caixa, despesas e cobrança com lucro real por carro.",
  },
  {
    icon: FileText,
    label: "NFe e NFSe",
    text: "Notas de entrada, venda e consignação emitidas no fluxo da venda.",
  },
  {
    icon: MessageCircle,
    label: "CRM WhatsApp",
    text: "Leads, clientes, campanhas e test-drives conectados ao estoque.",
  },
  {
    icon: UploadCloud,
    label: "Marketplaces",
    text: "Fila auditada para publicar, atualizar e despublicar anúncios.",
  },
  {
    icon: Braces,
    label: "API externa",
    text: "API pública para integrar o estoque da loja a outros sistemas.",
  },
  {
    icon: ShieldCheck,
    label: "Auditoria e permissões",
    text: "Permissões por papel e cada ação operacional registrada.",
  },
] as const;

export const landingTestimonials = [
  {
    name: "Ofertas Sobre Rodas",
    location: "São José dos Campos, SP",
    quote:
      "O Hub revolucionou nossa gestão multiloja. Publicação instantânea, controle total e um site performático.",
  },
  {
    name: "Consultcar MT",
    location: "Cáceres, MT",
    quote:
      "Nossos leads qualificados aumentaram em 40%. A vitrine digital é impecável.",
  },
  {
    name: "Avelloz Motos",
    location: "Brasil",
    quote:
      "Eficiência cirúrgica. Ganhamos mais de 10 horas semanais de produtividade real com a gestão integrada.",
  },
] as const;

export const landingFinalCta = {
  badge: "Libere seu acesso agora",
  title: "O showroom mais lucrativo está a alguns cliques.",
  text: "Crie sua loja em minutos e veja como profissionalizar a gestão e multiplicar suas vendas.",
  points: ["Setup imediato", "Suporte especializado", "Foco em vendas"],
} as const;
