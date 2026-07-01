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
  const coverUrl = cover?.url ?? "";

  const formattedWhatsapp = whatsappPhone.replace(/[^0-9]/g, "");
  const whatsappUrl = formattedWhatsapp
    ? `https://api.whatsapp.com/send?phone=${formattedWhatsapp}&text=${encodeURIComponent(
        `Olá, tenho interesse no veículo ${listing.title} anunciado por ${
          listing.priceCents ? formatPrice(listing.priceCents) : "Sob Consulta"
        } e gostaria de mais informações.`,
      )}`
    : "#";

  return [
    {
      id: "header",
      type: "header",
      order: 0,
      visible: true,
      props: {
        logoText: storeName,
        showContactButton: true,
        contactButtonText: "Falar Conosco",
        contactButtonLink: whatsappUrl,
      },
    },
    {
      id: "hero",
      type: "hero",
      order: 1,
      visible: true,
      props: {
        badge: `${specs.modality} · ${listing.manufactureYear || ""}/${listing.modelYear || ""}`,
        title: listing.title,
        subtitle: `Preço anunciado: ${listing.priceCents ? formatPrice(listing.priceCents) : "Sob Consulta"} · ${specs.km} · ${specs.transmission} · ${specs.fuel}`,
        ctaLabel: "Garantir no WhatsApp",
        ctaUrl: whatsappUrl,
        imageUrl: coverUrl,
      },
    },
    {
      id: "specs",
      type: "vehicle_specs",
      order: 2,
      visible: true,
      props: {
        title: "Ficha Técnica",
        subtitle: "Especificações detalhadas do veículo para consulta rápida",
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
        title: "Galeria de Fotos",
        subtitle: "Imagens detalhadas do veículo em nosso estoque",
        images: vitrinePhotos.map((photo, index) => ({
          id: photo.id || `photo_${index}`,
          url: photo.url,
          alt: photo.altText || listing.title,
          caption: "",
        })),
        columns: 3,
        lightboxEnabled: true,
      },
    },
    {
      id: "about",
      type: "about",
      order: 4,
      visible: true,
      props: {
        title: "Destaques e Histórico",
        text:
          listing.description ||
          "Veículo de alta procedência, revisado e pronto para entrega.",
        imageUrl: vitrinePhotos[1]?.url || coverUrl || "",
        imagePosition: "right",
      },
    },
    {
      id: "cta",
      type: "cta",
      order: 5,
      visible: true,
      props: {
        title: "Ficou interessado?",
        subtitle:
          "Fale diretamente com nossa equipe comercial para simular financiamento, avaliar troca ou tirar dúvidas.",
        buttonLabel: "Falar com Consultor no WhatsApp",
        buttonUrl: whatsappUrl,
      },
    },
    {
      id: "footer",
      type: "footer",
      order: 6,
      visible: true,
      props: {
        showSocial: true,
        columns: [
          {
            label: "Links Úteis",
            links: [{ href: `/${storeSlug}`, title: "Voltar ao Estoque" }],
          },
        ],
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
