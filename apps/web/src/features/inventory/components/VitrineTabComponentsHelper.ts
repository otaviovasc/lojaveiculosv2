import { DEFAULT_STOREFRONT_VEHICLE_IMAGE } from "@lojaveiculosv2/shared";
import type { InventoryListingDetail, InventoryUnit } from "../model/types";
import { slugifyCustomPage } from "../../publicSite/customPageUtils";
import { formatPrice } from "./InventoryDetailWorkspaceMocks";

type Specs = {
  bodyType: string;
  color: string;
  doors: string;
  engine: string;
  fuel: string;
  km: string;
  modality: string;
  plate: string;
  transmission: string;
  vin: string;
};

export function createVitrineComponents({
  detail,
  primaryUnit,
  specs,
  storeName,
  storeSlug,
  whatsappPhone,
}: {
  detail: InventoryListingDetail;
  primaryUnit: InventoryUnit | null;
  specs: Specs;
  storeName: string;
  storeSlug: string;
  whatsappPhone: string;
}) {
  const listing = detail.listing;
  const publicPhotos = detail.media
    .filter((m) => m.kind === "photo" && m.isPublic)
    .sort((left, right) => left.displayOrder - right.displayOrder);
  const unitPublicPhotos = publicPhotos.filter(
    (m) => !primaryUnit || m.unitId === primaryUnit.id || !m.unitId,
  );
  const vitrinePhotos = unitPublicPhotos.length
    ? unitPublicPhotos
    : publicPhotos;
  const cover = vitrinePhotos[0];
  const coverUrl = cover?.url ?? DEFAULT_STOREFRONT_VEHICLE_IMAGE;
  const galleryImages = vitrinePhotos.length
    ? vitrinePhotos.map((photo, index) => ({
        alt: photo.altText || `${listing.title} - foto ${index + 1}`,
        caption: "",
        id: photo.id || `photo_${index}`,
        url: photo.url,
      }))
    : [
        {
          alt: `${listing.title}: foto em preparação`,
          caption: "",
          id: "photo_pending",
          url: DEFAULT_STOREFRONT_VEHICLE_IMAGE,
        },
      ];

  const formattedWhatsapp = whatsappPhone.replace(/[^0-9]/g, "");
  const whatsappUrl = formattedWhatsapp
    ? `https://api.whatsapp.com/send?phone=${formattedWhatsapp}&text=${encodeURIComponent(
        `Olá, tenho interesse no veículo ${listing.title} anunciado por ${
          listing.priceCents ? formatPrice(listing.priceCents) : "Sob Consulta"
        } e gostaria de mais informações.`,
      )}`
    : `/${storeSlug}#contato`;
  const price = listing.priceCents
    ? formatPrice(listing.priceCents)
    : "Sob consulta";

  return [
    {
      id: "vitrine_trust",
      type: "marquee",
      order: 0,
      visible: true,
      props: {
        direction: "left",
        speed: "slow",
        text: `${storeName} · estoque real · atendimento direto · avaliação de troca · financiamento`,
      },
    },
    {
      id: "hero",
      type: "hero",
      order: 1,
      visible: true,
      props: {
        badge: `${specs.modality} · pronta entrega · ${listing.manufactureYear || ""}/${listing.modelYear || ""}`,
        pageVariant: "vehicle-vitrine",
        title: listing.title,
        subtitle: `${price} · ${specs.km} · ${specs.transmission} · ${specs.fuel}. Conheça todos os detalhes e fale diretamente com a equipe da ${storeName}.`,
        ctaLabel: formattedWhatsapp
          ? "Conversar sobre este veículo"
          : "Falar com a loja",
        ctaUrl: whatsappUrl,
        imageAlt: `${listing.title} anunciado pela ${storeName}`,
        imageUrl: coverUrl,
      },
    },
    {
      id: "specs",
      type: "vehicle_specs",
      order: 2,
      visible: true,
      props: {
        title: "Tudo o que importa, sem letras miúdas",
        subtitle:
          "Os principais dados deste veículo organizados para uma decisão mais segura.",
        specs: {
          Cor: specs.color,
          Quilometragem: specs.km,
          Combustível: specs.fuel,
          Câmbio: specs.transmission,
          Carroceria: specs.bodyType,
          Motor: specs.engine,
          Portas: specs.doors,
        },
      },
    },
    {
      id: "gallery",
      type: "gallery",
      order: 3,
      visible: true,
      props: {
        title: "Veja cada detalhe",
        subtitle: "Fotos reais e públicas deste veículo no estoque da loja.",
        images: galleryImages,
        columns: 3,
        gap: "sm",
        layout: "grid",
        lightboxEnabled: true,
        showCaptions: false,
      },
    },
    {
      id: "vehicle_story",
      type: "scroll_zoom",
      order: 4,
      visible: true,
      props: {
        title: "Um veículo para conhecer de perto",
        subtitle:
          listing.description ||
          "Veículo selecionado pela loja, apresentado com transparência e pronto para uma visita.",
        imageUrl: vitrinePhotos[1]?.url || coverUrl,
      },
    },
    {
      id: "contact",
      type: "contact_section",
      order: 5,
      visible: true,
      props: {
        fields: { email: true, message: true, name: true, phone: true },
        submitButtonText: "Quero falar sobre este veículo",
        subtitle: `Envie seus dados para a equipe da ${storeName} responder com disponibilidade, troca e financiamento.`,
        successMessage:
          "Mensagem enviada. A equipe entrará em contato em breve.",
        title: "Este veículo combina com você?",
      },
    },
    {
      id: "cta",
      type: "cta",
      order: 6,
      visible: true,
      props: {
        title: `Não deixe o ${listing.title} passar`,
        subtitle:
          "Confirme a disponibilidade, agende sua visita ou envie os dados do seu usado para avaliação.",
        buttonLabel: formattedWhatsapp
          ? "Chamar agora no WhatsApp"
          : "Voltar para a loja",
        buttonUrl: whatsappUrl,
      },
    },
  ];
}

export function createVitrinePageSlug(
  listing: Pick<InventoryListingDetail["listing"], "id" | "title">,
) {
  const idSlug = (slugifyCustomPage(listing.id) || "listing").slice(0, 36);
  const maxTitleLength = Math.max(1, 80 - "vitrine".length - idSlug.length - 2);
  const titleSlug = (slugifyCustomPage(listing.title) || "veiculo")
    .slice(0, maxTitleLength)
    .replace(/-+$/g, "");
  return `vitrine-${titleSlug}-${idSlug}`;
}
