export const DEFAULT_STOREFRONT_ABOUT_IMAGES = {
  primary: "/images/storefront/about-store.webp",
  secondary: "/images/storefront/about-showroom.webp",
} as const;

export const DEFAULT_STOREFRONT_VEHICLE_IMAGE =
  "/images/storefront/vehicle-photo-pending.webp";

export const DEFAULT_STOREFRONT_ABOUT_FEATURES = [
  {
    description: "Carros, motos e SUVs selecionados com cuidado",
    title: "Veículos bem cuidados",
  },
  {
    description: "Segurança e transparência em cada negociação",
    title: "Negociação segura",
  },
  {
    description: "Atendimento próximo em todas as etapas",
    title: "Equipe especializada",
  },
  {
    description: "Procedência e suporte para comprar com confiança",
    title: "Qualidade comprovada",
  },
] as const;

export const DEFAULT_STOREFRONT_SECTIONS = [
  { id: "hero", order: 0, type: "hero", visible: true },
  { id: "featured", order: 1, type: "featured", visible: true },
  { id: "testimonials", order: 2, type: "testimonials", visible: true },
  { id: "about", order: 3, type: "about", visible: true },
  { id: "contact", order: 4, type: "contact", visible: true },
  { id: "search", order: 5, type: "search", visible: false },
  { id: "all_properties", order: 6, type: "all_properties", visible: false },
] as const;

export const DEFAULT_PUBLIC_STOREFRONT_THEME = {
  about: {
    button_text: "Fale com nossa equipe",
    curadoria_text:
      "Cada veículo passa por uma curadoria cuidadosa para que você compre com tranquilidade e segurança.",
    description:
      "Somos especialistas em conectar pessoas aos melhores negócios em veículos, com atendimento próximo e transparente.",
    features: DEFAULT_STOREFRONT_ABOUT_FEATURES,
    image1_url: DEFAULT_STOREFRONT_ABOUT_IMAGES.primary,
    image2_url: DEFAULT_STOREFRONT_ABOUT_IMAGES.secondary,
    title: "Tradição e excelência automotiva",
    why_text:
      "Nossa equipe trabalha com parceiros confiáveis, boas condições de financiamento e avaliação justa do seu usado.",
    why_title: "Por que escolher nossa loja?",
  },
  aboutImage2Url: DEFAULT_STOREFRONT_ABOUT_IMAGES.secondary,
  aboutImageUrl: DEFAULT_STOREFRONT_ABOUT_IMAGES.primary,
  aboutText:
    "Somos especialistas em conectar pessoas aos melhores negócios em veículos, com atendimento próximo e transparente.",
  aboutTitle: "Tradição e excelência automotiva",
  appearanceMode: "light",
  contact: {
    businessHours: "Segunda a sexta, das 9h às 18h; sábado, das 9h às 13h",
    description1:
      "Entre em contato para saber mais sobre nossos veículos, condições e serviços.",
    description2:
      "Nossa equipe está pronta para ajudar você a encontrar o veículo ideal.",
    mapEmbedUrl: null,
    phone2: null,
    phone2Label: "Telefone",
    phone3: null,
    phone3Label: "Comercial",
    phoneLabel: "WhatsApp",
    showMap: true,
    title: "Contato",
  },
  heroMediaSource: "vehicles",
  heroSubtitle: "Encontre o veículo ideal para a sua próxima conquista",
  heroTitle: "Nossas **Ofertas**",
  sections: DEFAULT_STOREFRONT_SECTIONS,
  templateId: "quadra",
} as const;
