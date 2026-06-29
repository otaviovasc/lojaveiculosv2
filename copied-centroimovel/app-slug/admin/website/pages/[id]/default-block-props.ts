import { DEFAULT_BUILDER_FONT_FAMILY } from "@/modules/storefront/components/builder/builder-font-families";

/**
 * Default props for new page builder blocks (admin + nested editors).
 */

export const DEFAULT_STYLE = {
  padding: "md",
  margin: "none",
  shadow: "none",
  borderRadius: "none",
  borderWidth: 0,
  glowIntensity: 0,
  fontFamily: DEFAULT_BUILDER_FONT_FAMILY,
} as const;

export const BLOCK_DEFAULT_PROPS: Record<string, Record<string, unknown>> = {
  hero: {
    title: "Encontre o Imóvel dos Seus Sonhos",
    subtitle:
      "Somos especializados em conectar pessoas às suas novas casas, com um portfólio completo de imóveis de alto padrão.",
    badge: "Novo Lançamento",
    ctaLabel: "Ver Imóveis",
    ctaUrl: "/imoveis",
    ctaLinkType: "internal",
    fullHeight: true,
    imageUrl:
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&auto=format&fit=crop",
    overlay: {
      enabled: true,
      type: "gradient",
      color: "#000000",
      opacity: 50,
      gradientAngle: 180,
    },
    style: {},
  },
  about: {
    title: "Sobre Nós",
    text: "Com mais de 15 anos de experiência no mercado imobiliário, nossa missão é oferecer um atendimento personalizado e profissional. Acreditamos que encontrar o imóvel ideal vai além de quatro paredes - é sobre criar lares e memórias.\n\nNossa equipe especializada está pronta para ajudá-lo a realizar seu sonho, seja um apartamento no centro da cidade ou uma casa de campo para os fins de semana.",
    imageUrl:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&auto=format&fit=crop",
    imagePosition: "right",
    style: {},
  },
  text_block: {
    content:
      "## Por Que Escolher-nos?\n\nOferecemos um serviço completo que vai desde a busca pelo imóvel ideal até o fechamento do negócio, com acompanhamento total em todas as etapas. Somos **referência** em atendimento.\n\n- Atendimento personalizado\n- Amplo portfólio de imóveis\n- Assessoria financeira completa\n- Equipe experiente e dedicada",
    alignment: "left",
    maxWidth: "lg",
    headingColor: "#0c0a09",
    subheadingColor: "#57534e",
    bodyTextColor: "#44403c",
    listTextColor: "#44403c",
    linkTextColor: "#0369a1",
    codeTextColor: "#57534e",
    style: {},
  },
  image: {
    imageUrl:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop",
    caption: "Interior elegante de um dos nossos imóveis em destaque",
    lightboxEnabled: true,
    alignment: "center",
    style: {},
  },
  video: {
    videoUrl: "",
    provider: "youtube",
    autoplay: false,
    loop: false,
    muted: true,
    style: {},
  },
  testimonials: {
    title: "O Que Dizem Nossos Clientes",
    testimonials: [
      {
        id: "t1",
        name: "Maria Silva",
        role: "Proprietária",
        quote:
          "Atendimento excepcional! A equipe foi muito atenciosa e me ajudou a encontrar o apartamento perfeito.",
        imageSrc:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop",
      },
      {
        id: "t2",
        name: "João Santos",
        role: "Investidor",
        quote:
          "Profissionalismo e dedicação. Recomendo a todos que buscam um serviço de qualidade.",
        imageSrc:
          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop",
      },
    ],
    style: {},
  },
  featured: {
    title: "Imóveis em Destaque",
    subtitle: "Seleção exclusiva de propriedades premium",
    maxProperties: 6,
    showAllLink: true,
    style: {},
  },
  properties_grid: {
    title: "Imóveis em Destaque",
    subtitle: "Confira nossa seleção especial de imóveis",
    maxProperties: 6,
    showAllLink: true,
    style: {},
  },
  cta: {
    title: "Pronto para Encontrar Seu Novo Lar?",
    subtitle:
      "Entre em contato conosco e deixe-nos ajudá-lo a realizar seu sonho.",
    buttonLabel: "Fale Conosco",
    buttonUrl: "https://",
    buttonLinkType: "external",
    buttonStyle: "primary",
    style: { backgroundColor: "#1F2937" },
  },
  spacer: { height: "lg" },
  divider: { lineVariant: "gradient", text: "" },
  map: { zoom: 15, address: "" },
  container: {
    layout: "stack",
    direction: "column",
    gap: "lg",
    children: [],
    style: { padding: "md" },
  },
  two_column: {
    leftColumnWidth: 50,
    rightColumnWidth: 50,
    gap: "lg",
    reverseOnMobile: false,
    leftChildren: [],
    rightChildren: [],
    style: {},
  },
  section_wrapper: {
    fullWidth: false,
    maxWidth: "lg",
    children: [],
    style: { padding: "md" },
  },
  contact_section: {
    title: "Fale Conosco",
    subtitle:
      "Estamos à disposição para ajudá-lo a encontrar o imóvel dos seus sonhos",
    submitButtonText: "Enviar Mensagem",
    successMessage:
      "Mensagem enviada com sucesso! Entraremos em contato em breve.",
    buttonStyle: "primary",
    buttonBorderColor: "#FFFFFF",
    titleColor: "#1c1917",
    subtitleColor: "#57534e",
    fields: { name: true, phone: true, email: true, message: true },
    formBackgroundColor: "#FFFFFF",
    formTextColor: "#292524",
    style: {
      backgroundColor: "#F8F5F0",
      textColor: "#1c1917",
      padding: "lg",
    },
  },
  marquee: {
    text: "🏠 Encontre o imóvel perfeito para você! • Entre em contato conosco hoje!",
    speed: "normal",
    direction: "left",
    linkType: "external",
    style: {
      backgroundColor: "#1A1A1A",
      textColor: "#FFFFFF",
      animation: "fadeInUp",
      animationDuration: 500,
    },
  },
  header: {
    logoText: "",
    sticky: true,
    showContactButton: true,
    contactButtonText: "Fale Conosco",
    contactButtonLink: "#contato",
    showSocial: true,
    links: [
      { title: "Início", href: "#home" },
      { title: "Imóveis", href: "#properties" },
      { title: "Sobre", href: "#about" },
      { title: "Contato", href: "#contact" },
    ],
    style: {
      backgroundColor: "#FFFFFF",
      textColor: "#1A1A1A",
    },
  },
  footer: {
    showSocial: true,
    socialLinks: {},
    columns: [
      {
        label: "Links",
        links: [
          { title: "Início", href: "/" },
          { title: "Imóveis", href: "/imoveis" },
          { title: "Sobre", href: "/sobre" },
          { title: "Contato", href: "/contato" },
        ],
      },
      {
        label: "Redes Sociais",
        links: [
          { title: "Instagram", href: "#" },
          { title: "Facebook", href: "#" },
        ],
      },
    ],
    style: {
      backgroundColor: "#1A1A1A",
      textColor: "#FFFFFF",
    },
  },
  typewriter: {
    texts: ["Typewriter", "Texto Animado", "Chamativo!"],
    speed: 50,
    waitTime: 2000,
    showCursor: true,
    cursorChar: "|",
    textPosition: "center",
    style: {
      textColor: "#1A1A1A",
    },
  },
  gallery: {
    title: "Nossa Galeria",
    subtitle: "Conheça alguns dos nossos melhores momentos e propriedades",
    layout: "grid",
    columns: 3,
    gap: "md",
    lightboxEnabled: true,
    showCaptions: false,
    images: [
      {
        id: "img_1",
        url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop",
        caption: "Interior sofisticado",
        colSpan: 1,
        rowSpan: 1,
        aspectRatio: "square",
      },
      {
        id: "img_2",
        url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop",
        caption: "Fachada moderna",
        colSpan: 1,
        rowSpan: 1,
        aspectRatio: "square",
      },
      {
        id: "img_3",
        url: "https://images.unsplash.com/photo-1600607687940-47a0f6899953?w=800&auto=format&fit=crop",
        caption: "Área de lazer completa",
        colSpan: 1,
        rowSpan: 1,
        aspectRatio: "square",
      },
    ],
    style: {},
  },
};

function addWorkspacePrefix(value: string, workspaceSlug: string): string {
  if (!value.startsWith("/")) return value;
  if (value.startsWith(`/${workspaceSlug}/`)) return value;
  return `/${workspaceSlug}${value}`;
}

/** Deep clone defaults and prefix internal paths for the workspace. */
export function createDefaultBlockProps(
  type: string,
  workspaceSlug: string,
): Record<string, unknown> {
  const raw = BLOCK_DEFAULT_PROPS[type];
  if (!raw) return { style: { ...DEFAULT_STYLE } };

  const base = structuredClone(raw) as Record<string, unknown>;

  const mergeStyle = () => {
    const st = base.style;
    const styleObj =
      typeof st === "object" && st !== null && !Array.isArray(st)
        ? { ...DEFAULT_STYLE, ...(st as Record<string, unknown>) }
        : { ...DEFAULT_STYLE };
    base.style = styleObj;
  };

  if (type === "divider") {
    return { ...base };
  }

  if (type !== "spacer") {
    mergeStyle();
  }

  if (type === "hero" && typeof base.ctaUrl === "string") {
    base.ctaUrl = addWorkspacePrefix(base.ctaUrl, workspaceSlug);
  }

  if (type === "footer" && Array.isArray(base.columns)) {
    base.columns = (base.columns as Array<Record<string, unknown>>).map(
      (column) => ({
        ...column,
        links: Array.isArray(column.links)
          ? (column.links as Array<Record<string, unknown>>).map((link) => ({
              ...link,
              href:
                typeof link.href === "string"
                  ? addWorkspacePrefix(link.href, workspaceSlug)
                  : link.href,
            }))
          : column.links,
      }),
    );
  }

  return base;
}
