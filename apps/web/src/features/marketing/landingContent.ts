import {
  BadgeDollarSign,
  Banknote,
  Braces,
  Car,
  FileCheck2,
  FileText,
  Globe2,
  Landmark,
  Layers,
  MessageCircle,
  Percent,
  Receipt,
  Scale,
  ShieldCheck,
  TrendingUp,
  UploadCloud,
  Users2,
  Wallet,
  Zap,
} from "lucide-react";

export const WHATSAPP_CONCIERGE_URL =
  "https://wa.me/5511940231407?text=Ol%C3%A1%2C%20gostaria%20de%20saber%20mais%20sobre%20a%20plataforma%20Loja%20Ve%C3%ADculos%20e%20fazer%20uma%20demonstra%C3%A7%C3%A3o!";

export const landingHero = {
  badge: "ERP para lojas de veículos",
  badgeSecondary: "ERP Automotivo de Alta Performance",
  titleLead: "O sistema que faz você vender até",
  titleAccent: "10 carros",
  titleTrail: "a mais por mês.",
  subtitle:
    "ERP automotivo com CRM WhatsApp, financiamento multi-banco com acesso direto aos bancos e emissão fiscal integrada.",
  secondaryCta: "Ver o ERP",
  exploreCta: "Calcular economia",
} as const;

export const landingPills = [
  "Migra em 5 min",
  "Financiamento multi-banco",
  "Acesso aos bancos",
  "ERP 100% fiscal",
] as const;

export const landingPortals = [
  {
    name: "Webmotors",
    logo: "/images/integrationslogos/webmotors.png",
    category: "Líder de Leads",
    badge: "API Oficial",
  },
  {
    name: "OLX",
    logo: "/images/integrationslogos/olx.png",
    category: "Maior Alcance",
    badge: "Sync < 1 min",
  },
  {
    name: "Mercado Livre",
    logo: "/images/integrationslogos/mercadolivre.png",
    category: "Vendas Brasil",
    badge: "Catálogo Direto",
  },
  {
    name: "iCarros",
    logo: "/images/integrationslogos/icarros.png",
    category: "Rede Itaú",
    badge: "Integrado",
  },
  {
    name: "UsadosBR",
    logo: "/images/integrationslogos/usadosbr.png",
    category: "Portais Regionais",
    badge: "Fila Automática",
  },
  {
    name: "Facebook",
    logo: "/images/integrationslogos/facebooklogo.png",
    category: "Marketplace Social",
    badge: "Feed XML",
  },
] as const;

export const landingMetrics = [
  {
    metric: "< 5 min",
    label: "Produtividade real",
    text: "Para cadastrar e publicar veículos em toda a sua rede.",
    highlight: "Automação total",
  },
  {
    metric: "+40%",
    label: "Conversão de leads",
    text: "Mais vendas fechadas com CRM WhatsApp e rodízio de leads.",
    highlight: "Pós-venda ativo",
  },
  {
    metric: "100%",
    label: "Controle de estoque",
    text: "Estoque sincronizado em tempo real sem anúncios fantasmas.",
    highlight: "Sem anúncio fantasma",
  },
  {
    metric: "R$ 0",
    label: "Multas ou erros",
    text: "NFe e NFSe emitidas direto no fluxo de fechamento da venda.",
    highlight: "Em conformidade",
  },
] as const;

export const landingPains = [
  {
    title: "Burocracia fiscal manual",
    pain: "Horas perdidas emitindo notas fiscais em portais lentos com risco de erros tributários.",
  },
  {
    title: "Leads antigos esquecidos",
    pain: "Compradores anteriores esquecidos na agenda sem pós-venda para a próxima troca.",
  },
  {
    title: "Caixa e comissões sem rumo",
    pain: "Sem clareza do lucro real por placa e noites calculando repasses em planilhas.",
  },
  {
    title: "Equipe sem controle de acesso",
    pain: "Margens e dados sensíveis expostos sem histórico de alterações por usuário.",
  },
] as const;

export const landingSteps = [
  {
    step: "01",
    title: "Cadastro único",
    badge: "Ficha & Fotos",
    text: "Cadastre o veículo com fotos, checklist e tabela FIPE automática.",
  },
  {
    step: "02",
    title: "Sincronia total",
    badge: "Multicanal",
    text: "Estoque publicado no site próprio e nos maiores portais automotivos.",
  },
  {
    step: "03",
    title: "Venda concluída",
    badge: "NFe & Lucro",
    text: "Lead no WhatsApp, simulação multi-banco aprovada e NFe emitida na hora.",
  },
] as const;

export const landingProductHighlights = [
  {
    title: "Fiscal integrado",
    text: "Emissão de NFe e NFSe em segundos com repasse automático de comissões.",
    icon: Receipt,
  },
  {
    title: "CRM WhatsApp",
    text: "Rodízio inteligente de leads e recuperação ativa de clientes antigos.",
    icon: MessageCircle,
  },
  {
    title: "Financiamento multi-banco",
    text: "Acesso direto aos principais bancos para simulação e aprovação ágil.",
    icon: Landmark,
  },
] as const;

export const landingFeatures = [
  {
    icon: Globe2,
    label: "Site e vitrine",
    text: "Vitrine moderna com domínio próprio e SEO automotivo.",
    tag: "Site Próprio",
  },
  {
    icon: Car,
    label: "Estoque",
    text: "Gestão completa de fotos, documentos, preparação e custos.",
    tag: "Multi-Pátio",
  },
  {
    icon: Landmark,
    label: "Financiamento multi-banco",
    text: "Simulação e aprovação com acesso direto aos bancos parceiros.",
    tag: "Multi-Bancos",
  },
  {
    icon: BadgeDollarSign,
    label: "Vendas e comissões",
    text: "Venda no caixa com cálculo automático de comissões da equipe.",
    tag: "DRE por Carro",
  },
  {
    icon: Wallet,
    label: "Financeiro",
    text: "Fluxo de caixa, contas a pagar/receber e lucro real por placa.",
    tag: "Tempo Real",
  },
  {
    icon: FileText,
    label: "NFe e NFSe",
    text: "Emissão de notas de entrada, venda e consignação em 1 clique.",
    tag: "1-Clique",
  },
  {
    icon: MessageCircle,
    label: "CRM WhatsApp",
    text: "Rodízio de leads, funil de atendimento e pós-venda conectado.",
    tag: "Rodízio",
  },
  {
    icon: UploadCloud,
    label: "Portais automotivos",
    text: "Integração oficial com Webmotors, OLX e Mercado Livre.",
    tag: "Sincronia Total",
  },
  {
    icon: ShieldCheck,
    label: "Auditoria e permissões",
    text: "Controle de acesso por função e rastreamento de cada ação.",
    tag: "Acessos",
  },
] as const;

export const landingTestimonials = [
  {
    name: "Consult Car",
    location: "Cuiabá, MT",
    quote:
      "Ganhamos agilidade total no estoque. O financeiro e as notas fiscais integradas reduziram nosso tempo de fechamento pela metade.",
    image: "/images/clients/consultcarmtloja.png",
  },
  {
    name: "Avelloz Motos",
    location: "São Paulo, SP",
    quote:
      "Sincronização instantânea com os portais. Paramos de perder vendas por anúncio desatualizado ou lead esquecido no WhatsApp.",
    image: "/images/clients/avellozmotosloja.png",
  },
  {
    name: "Ofertas Sobre Rodas",
    location: "Belo Horizonte, MG",
    quote:
      "A equipe usa o CRM no WhatsApp. As simulações de financiamento e comissões ficaram transparentes e rápidas.",
    image: "/images/clients/ofertassobrecarrosloja.png",
  },
] as const;

export const landingFinalCta = {
  badge: "Pronto para acelerar?",
  title: "Comece a operar com o novo ERP da sua loja hoje.",
  text: "Cadastre sua loja em 5 minutos e tenha controle absoluto do estoque ao caixa com financiamento e emissão fiscal integrada.",
  cta: "Criar minha loja grátis",
  points: [
    "Acesso direto aos bancos parceiros",
    "Suporte rápido no WhatsApp",
    "Sem fidelidade contratual",
  ],
} as const;
