import {
  BadgeDollarSign,
  Braces,
  Car,
  FileCheck2,
  FileText,
  Globe2,
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
  badge: "SaaS para lojas de veículos",
  badgeSecondary: "Sistema Operacional da Revenda",
  titleLead: "O sistema que faz você vender até",
  titleAccent: "10 carros",
  titleTrail: "a mais por mês.",
  subtitle:
    "CRM WhatsApp com rodízio de leads, financeiro completo e emissão de notas (NFe/NFSe) integrada.",
  secondaryCta: "Ver a plataforma",
  exploreCta: "Calcular economia",
} as const;

export const landingPills = [
  "Migra em 5 min",
  "Suporte via WhatsApp",
  "Sem taxa de adesão",
  "100% em conformidade fiscal",
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
    text: "Tempo médio para cadastrar e publicar um veículo em toda a sua rede.",
    highlight: "Automação total",
  },
  {
    metric: "+40%",
    label: "Conversão de leads",
    text: "Aumento médio no fechamento de vendas através da centralização no WhatsApp.",
    highlight: "Pós-venda ativo",
  },
  {
    metric: "100%",
    label: "Controle de estoque",
    text: "Sincronização total: vendeu em um lugar, sai de todos os outros.",
    highlight: "Sem anúncio fantasma",
  },
  {
    metric: "R$ 0",
    label: "Multas ou erros",
    text: "Emissão de NFe e NFSe no fluxo da venda sem depender do emissor do governo.",
    highlight: "Em conformidade",
  },
] as const;

export const landingPains = [
  {
    title: "Burocracia fiscal manual",
    pain: "Perda de tempo emitindo notas de entrada, venda e consignação em portais lentos do governo, com risco constante de erros tributários e retrabalho.",
  },
  {
    title: "Leads antigos esquecidos",
    pain: "Sem pós-venda ativo, compradores anteriores ficam frios na agenda pessoal dos vendedores e nunca são reengajados para a próxima troca de carro.",
  },
  {
    title: "Caixa e comissões sem rumo",
    pain: "Falta de clareza sobre o lucro líquido real por placa após despesas de oficina, além de noites em claro calculando repasses da equipe em planilhas.",
  },
  {
    title: "Equipe sem controle de acesso",
    pain: "Margens de compra e dados sensíveis expostos por falta de permissões restritas e ausência de histórico auditado sobre quem alterou preços ou dados.",
  },
] as const;

export const landingSteps = [
  {
    step: "01",
    title: "Cadastro único",
    badge: "Ficha & Fotos",
    text: "Insira os dados do veículo uma única vez: fotos em alta definição, checklist de preparação e consulta automática da tabela FIPE.",
  },
  {
    step: "02",
    title: "Sincronia total",
    badge: "Multicanal",
    text: "O motor publica seu estoque no site próprio e nos portais Webmotors, OLX, Mercado Livre e iCarros simultaneamente.",
  },
  {
    step: "03",
    title: "Venda concluída",
    badge: "NFe & Lucro",
    text: "Receba o lead no WhatsApp, aprove a simulação, emita a NFe autorizada e credite a comissão da equipe em segundos.",
  },
] as const;

export const landingProductHighlights = [
  {
    title: "Financeiro e fiscal integrado",
    text: "Emita NFe e NFSe de entrada, venda e consignação em segundos e automatize o repasse de comissões da equipe.",
    icon: Receipt,
  },
  {
    title: "CRM WhatsApp e pós-venda ativo",
    text: "Rodízio inteligente de leads, campanhas em massa e recuperação de compradores antigos para a próxima troca.",
    icon: MessageCircle,
  },
  {
    title: "Showroom e acessos limitados",
    text: "Site premium integrado aos maiores portais automotivos, com permissões restritas para cada vendedor.",
    icon: Globe2,
  },
] as const;

export const landingFeatures = [
  {
    icon: Globe2,
    label: "Site e vitrine",
    text: "Construtor visual para loja, páginas extras e domínio próprio.",
    tag: "SEO Automotivo",
  },
  {
    icon: Car,
    label: "Estoque",
    text: "Cadastro completo com unidades, mídia, documentos e ciclo de venda.",
    tag: "Multi-pátio",
  },
  {
    icon: BadgeDollarSign,
    label: "Vendas e comissões",
    text: "Venda registrada no caixa com comissão calculada por vendedor.",
    tag: "DRE por Carro",
  },
  {
    icon: Wallet,
    label: "Financeiro",
    text: "Fluxo de caixa, despesas e cobrança com lucro real por carro.",
    tag: "Tempo Real",
  },
  {
    icon: FileText,
    label: "NFe e NFSe",
    text: "Notas de entrada, venda e consignação emitidas no fluxo da venda.",
    tag: "1-Clique",
  },
  {
    icon: MessageCircle,
    label: "CRM WhatsApp",
    text: "Leads, clientes, campanhas e test-drives conectados ao estoque.",
    tag: "Rodízio Inteligente",
  },
  {
    icon: UploadCloud,
    label: "Marketplaces",
    text: "Fila auditada para publicar, atualizar e despublicar anúncios.",
    tag: "Webmotors / OLX",
  },
  {
    icon: Braces,
    label: "API externa",
    text: "API pública para integrar o estoque da loja a outros sistemas.",
    tag: "REST & Webhooks",
  },
  {
    icon: ShieldCheck,
    label: "Auditoria e permissões",
    text: "Permissões por papel e cada ação operacional registrada.",
    tag: "Acessos Restritos",
  },
] as const;

export const landingTestimonials = [
  {
    name: "Ofertas Sobre Rodas",
    location: "São José dos Campos, SP",
    quote:
      "O Hub revolucionou nossa gestão multiloja. Publicação instantânea, controle total e um site performático.",
    image: "/images/clients/ofertassobrecarrosloja.png",
    metric: "+35% vendas online",
    badge: "Showroom VIP",
  },
  {
    name: "Consultcar MT",
    location: "Cáceres, MT",
    quote:
      "Nossos leads qualificados aumentaram em 40%. A vitrine digital é impecável.",
    image: "/images/clients/consultcarmtloja.png",
    metric: "+40% leads qualificados",
    badge: "Showroom VIP",
  },
  {
    name: "Avelloz Motos",
    location: "Brasil",
    quote:
      "Eficiência cirúrgica. Ganhamos mais de 10 horas semanais de produtividade real com a gestão integrada.",
    image: "/images/clients/avellozmotosloja.png",
    metric: "10h/semana salvas",
    badge: "Showroom VIP",
  },
] as const;

export const landingFaqs = [
  {
    question: "O que é o sistema Loja Veículos?",
    answer:
      "A Loja Veículos é o sistema operacional completo para lojas e revendas automotivas. Centraliza controle de estoque, publicação multicanal nos maiores portais, CRM com WhatsApp integrado e rodízio de leads, emissão de NFe e NFSe e controle financeiro de comissões por carro.",
  },
  {
    question: "Como funciona a sincronização com portais automotivos?",
    answer:
      "Você cadastra o veículo uma única vez no painel. O motor sincroniza fotos, dados técnicos e valores automaticamente com Webmotors, OLX, Mercado Livre, iCarros, UsadosBR e Facebook Marketplace. Ao fechar a venda, o anúncio sai de todos os portais simultaneamente.",
  },
  {
    question: "A emissão de NFe e NFSe é realmente integrada?",
    answer:
      "Sim! Você emite notas de entrada, venda e consignação em segundos direto no fluxo da venda, com cálculo tributário automático e autorização da SEFAZ sem precisar preencher dados repetidos em emissores lentos.",
  },
  {
    question: "Posso utilizar meu domínio próprio no site da loja?",
    answer:
      "Com certeza. Sua loja ganha um site moderno, responsivo e ultra-otimizado para SEO com seu domínio personalizado (ex: www.sualojadeveiculos.com.br) com certificado SSL e hospedagem em alta velocidade inclusos.",
  },
  {
    question: "Como os vendedores acessam o sistema com segurança?",
    answer:
      "Cada vendedor possui seu login com permissões personalizadas. Eles podem visualizar e atender seus leads atribuídos via rodízio e registrar propostas sem visualizar custos confidenciais da loja ou dados financeiros restritos ao proprietário.",
  },
  {
    question: "Quanto tempo leva para migrar meu estoque atual?",
    answer:
      "Nossa equipe de implantação realiza a importação de todo o seu estoque existente em menos de 5 minutos, sem travar sua operação ou interromper seus anúncios ativos.",
  },
] as const;

export const landingFinalCta = {
  badge: "Libere seu acesso agora",
  title: "O showroom mais lucrativo está a alguns cliques.",
  text: "Crie sua loja em minutos e veja como profissionalizar a gestão e multiplicar suas vendas.",
  points: ["Setup imediato", "Suporte especializado", "Foco em vendas"],
} as const;
