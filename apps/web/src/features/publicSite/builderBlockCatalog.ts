import type {
  StorefrontBuilderComponent,
  StorefrontBuilderComponentType,
} from "@lojaveiculosv2/shared";
import {
  ArrowUpDown,
  Box,
  Building2,
  CarFront,
  Columns2,
  FileText,
  Footprints,
  Grid3X3,
  Image,
  Mail,
  MapPin,
  Megaphone,
  Minus,
  PanelTop,
  Quote,
  ScrollText,
  Sparkles,
  Square,
  Star,
  Type,
  User,
  Video,
  type LucideIcon,
} from "lucide-react";
import {
  pageBuilderDefaultGalleryImages,
  pageBuilderDefaultMedia,
} from "./pageBuilderDefaultMedia";

export const builderBlockLabels: Record<
  StorefrontBuilderComponentType,
  string
> = {
  about: "Sobre",
  contact_section: "Formulario de contato",
  container: "Container",
  cta: "Chamada",
  divider: "Divisor",
  featured: "Estoque em destaque",
  footer: "Rodape",
  gallery: "Galeria",
  header: "Cabecalho",
  hero: "Hero",
  image: "Imagem",
  map: "Mapa",
  marquee: "Faixa animada",
  properties_grid: "Grade de veiculos",
  scroll_zoom: "Imagem com destaque",
  section_wrapper: "Secao",
  spacer: "Espacador",
  testimonials: "Depoimentos",
  text_block: "Texto",
  two_column: "Duas colunas",
  typewriter: "Texto digitado",
  vehicle_specs: "Ficha Técnica",
  video: "Video",
};

export const builderBlockIcons: Record<
  StorefrontBuilderComponentType,
  LucideIcon
> = {
  about: User,
  contact_section: Mail,
  container: Box,
  cta: Megaphone,
  divider: Minus,
  featured: Star,
  footer: Footprints,
  gallery: Grid3X3,
  header: PanelTop,
  hero: Sparkles,
  image: Image,
  map: MapPin,
  marquee: ScrollText,
  properties_grid: Building2,
  scroll_zoom: Image,
  section_wrapper: Square,
  spacer: ArrowUpDown,
  testimonials: Quote,
  text_block: FileText,
  two_column: Columns2,
  typewriter: Type,
  vehicle_specs: CarFront,
  video: Video,
};

export const builderBlockGroups: ReadonlyArray<{
  label: string;
  types: readonly StorefrontBuilderComponentType[];
}> = [
  {
    label: "Estrutura",
    types: ["header", "hero", "about", "text_block", "cta", "footer"],
  },
  {
    label: "Midia",
    types: [
      "image",
      "gallery",
      "video",
      "typewriter",
      "marquee",
      "scroll_zoom",
    ],
  },
  {
    label: "Estoque",
    types: ["featured", "properties_grid", "testimonials", "vehicle_specs"],
  },
  {
    label: "Layout",
    types: [
      "contact_section",
      "map",
      "container",
      "two_column",
      "section_wrapper",
      "spacer",
      "divider",
    ],
  },
];

export const builderBlockTypeOptions = builderBlockGroups.flatMap((group) =>
  group.types.map((type) => ({
    label: `${group.label} - ${builderBlockLabels[type]}`,
    value: type,
  })),
);

const defaultBlockProps: Record<
  StorefrontBuilderComponentType,
  Record<string, unknown>
> = {
  about: {
    imagePosition: "right",
    imageUrl: pageBuilderDefaultMedia.bmwGreen,
    text: "Apresente a curadoria da loja, a preparacao dos veiculos e o atendimento que acompanha o cliente ate a entrega.",
    title: "Compra assistida, estoque revisado",
  },
  contact_section: {
    fields: { email: true, message: true, name: true, phone: true },
    submitButtonText: "Enviar mensagem",
    subtitle: "Informe seus dados para a equipe retornar.",
    successMessage: "Mensagem registrada. A loja retornara em breve.",
    title: "Fale com a loja",
  },
  container: {
    children: [],
    direction: "column",
    gap: "lg",
    layout: "stack",
  },
  cta: {
    buttonLabel: "Chamar no WhatsApp",
    buttonStyle: "primary",
    buttonUrl: "#contato",
    subtitle:
      "Converse com a equipe para simular financiamento, avaliar troca ou reservar uma visita.",
    title: "Pronto para encontrar o proximo veiculo?",
  },
  divider: { lineVariant: "solid", text: "" },
  featured: {
    maxProperties: 6,
    showAllLink: true,
    subtitle: "Selecao publicada pela loja.",
    title: "Estoque em destaque",
  },
  footer: {
    columns: [
      {
        label: "Loja",
        links: [
          { href: "#estoque", title: "Estoque" },
          { href: "#contato", title: "Contato" },
        ],
      },
    ],
    showSocial: true,
    socialLinks: {},
  },
  gallery: {
    columns: 3,
    gap: "md",
    images: pageBuilderDefaultGalleryImages,
    layout: "grid",
    lightboxEnabled: true,
    showCaptions: true,
    subtitle: "Fotos do estoque, detalhes e preparacao dos veiculos.",
    title: "Galeria da loja",
  },
  header: {
    contactButtonLink: "#contato",
    contactButtonText: "Fale conosco",
    links: [
      { href: "#home", title: "Inicio" },
      { href: "#estoque", title: "Estoque" },
      { href: "#contato", title: "Contato" },
    ],
    logoText: "",
    showContactButton: true,
    showSocial: true,
    sticky: true,
  },
  hero: {
    badge: "Loja de veiculos",
    ctaLabel: "Ver estoque",
    ctaUrl: "#estoque",
    fullHeight: false,
    imageUrl: pageBuilderDefaultMedia.audiFront,
    subtitle:
      "Estoque selecionado, atendimento consultivo e publicacao direta pela loja.",
    title: "Encontre seu proximo veiculo com confianca",
  },
  image: {
    alignment: "center",
    caption: "Imagem editorial para destacar estoque, entrega ou showroom.",
    imageUrl: pageBuilderDefaultMedia.audiSide,
    lightboxEnabled: true,
  },
  map: {
    address: "",
    zoom: 15,
  },
  marquee: {
    direction: "left",
    speed: "normal",
    text: "Estoque atualizado diariamente - financiamento, troca e atendimento pelo WhatsApp.",
  },
  properties_grid: {
    maxProperties: 9,
    showAllLink: true,
    subtitle: "Confira os veiculos disponiveis.",
    title: "Veiculos disponiveis",
  },
  scroll_zoom: {
    imageUrl: pageBuilderDefaultMedia.audiRear,
    subtitle: "Mostre uma entrega, preparação ou veículo especial da loja.",
    title: "Experiencia de compra premium",
  },
  section_wrapper: {
    children: [],
    fullWidth: false,
    maxWidth: "lg",
  },
  spacer: { height: "lg" },
  testimonials: {
    testimonials: [
      {
        id: "t1",
        imageSrc: "",
        name: "Cliente",
        quote: "Atendimento claro e rapido do primeiro contato ate a entrega.",
        role: "Comprador",
      },
    ],
    title: "O que dizem os clientes",
  },
  text_block: {
    alignment: "left",
    content:
      "Use este espaco para apresentar condicoes, garantias, processo de compra ou diferenciais da loja.",
    maxWidth: "lg",
  },
  two_column: {
    gap: "lg",
    leftChildren: [],
    leftColumnWidth: 50,
    reverseOnMobile: false,
    rightChildren: [],
    rightColumnWidth: 50,
  },
  typewriter: {
    cursorChar: "|",
    postText: "",
    preText: "Aqui voce encontra",
    showCursor: true,
    speed: 70,
    textPosition: "center",
    texts: [
      "seminovos revisados",
      "atendimento direto",
      "opcoes de financiamento",
    ],
    waitTime: 1800,
  },
  vehicle_specs: {
    title: "Ficha Técnica",
    subtitle: "Especificações detalhadas do veículo",
    specs: {
      Ano: "2020/2020",
      Quilometragem: "45.000 km",
      Câmbio: "Automático",
      Combustível: "Flex",
      Cor: "Preto",
      Portas: "4 portas",
    },
  },
  video: {
    autoplay: false,
    loop: false,
    muted: true,
    provider: "youtube",
    videoUrl: "",
  },
};

export function blockLabel(type: string) {
  return builderBlockLabels[type as StorefrontBuilderComponentType] ?? type;
}

export function blockIcon(type: string) {
  return builderBlockIcons[type as StorefrontBuilderComponentType] ?? FileText;
}

export function createDefaultPageComponent(
  type: StorefrontBuilderComponentType,
  order: number,
): StorefrontBuilderComponent {
  return {
    id: createBlockId(),
    order,
    props: cloneDefaultProps(type),
    type,
    visible: true,
  };
}

export function cloneDefaultProps(type: StorefrontBuilderComponentType) {
  const defaults = defaultBlockProps[type] ?? {};
  if (typeof structuredClone === "function") {
    return structuredClone(defaults) as Record<string, unknown>;
  }
  return JSON.parse(JSON.stringify(defaults)) as Record<string, unknown>;
}

function createBlockId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `block_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
