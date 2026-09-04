import {
  DEFAULT_STOREFRONT_VEHICLE_IMAGE,
  getVehicleEngineAspirationLabel,
  normalizeStorefrontPageSlug,
  type StorefrontBuilderComponent,
} from "@lojaveiculosv2/shared";
import type { PublicVehicleListingDetail } from "../ports/publicStorefrontRepository.js";

export function createVehicleVitrinePageSlug(
  listing: Pick<PublicVehicleListingDetail, "id" | "title">,
) {
  const idSlug = (normalizeStorefrontPageSlug(listing.id) || "listing").slice(
    0,
    36,
  );
  const maxTitleLength = Math.max(1, 80 - "vitrine".length - idSlug.length - 2);
  const titleSlug = (normalizeStorefrontPageSlug(listing.title) || "veiculo")
    .slice(0, maxTitleLength)
    .replace(/-+$/g, "");
  return `vitrine-${titleSlug}-${idSlug}`;
}

export function createVehicleVitrineComponents(
  listing: PublicVehicleListingDetail,
): StorefrontBuilderComponent[] {
  const photos = listing.media.filter((media) => media.kind === "photo");
  const coverUrl = photos[0]?.url ?? DEFAULT_STOREFRONT_VEHICLE_IMAGE;
  const galleryImages = photos.length
    ? photos.map((photo, index) => ({
        alt: photo.altText || `${listing.title} - foto ${index + 1}`,
        caption: "",
        id: `photo_${index}`,
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
  // Vehicle-bound pages can outlive a later hide-price setting change. Keeping
  // commercial values out of the persisted component snapshot prevents a
  // previously visible price from becoming stale public data.
  const price = "Condição comercial sob consulta";
  const condition = conditionLabel(listing.condition);
  const transmission = transmissionLabel(listing.transmission);
  const fuel = fuelLabel(listing.fuelType);
  const mileage =
    listing.mileageKm === null
      ? "Quilometragem não informada"
      : `${listing.mileageKm.toLocaleString("pt-BR")} km`;
  const summary = compact([price, mileage, transmission, fuel]).join(" · ");

  return [
    component("vitrine_trust", "marquee", 0, {
      direction: "left",
      speed: "slow",
      text: "Estoque real · atendimento direto · avaliação de troca · financiamento",
    }),
    component("hero", "hero", 1, {
      badge: compact([condition, "Pronta entrega", vehicleYear(listing)]).join(
        " · ",
      ),
      ctaLabel: "Falar com a loja",
      ctaUrl: "#contato",
      imageAlt: listing.title,
      imageUrl: coverUrl,
      pageVariant: "vehicle-vitrine",
      subtitle: `${summary}. Conheça os detalhes e fale diretamente com a equipe da loja.`,
      title: listing.title,
    }),
    component("specs", "vehicle_specs", 2, {
      specs: publicSpecs(listing),
      subtitle:
        "Os principais dados deste veículo organizados para uma decisão mais segura.",
      title: "Tudo o que importa, sem letras miúdas",
    }),
    component("gallery", "gallery", 3, {
      columns: 3,
      gap: "sm",
      images: galleryImages,
      layout: "grid",
      lightboxEnabled: true,
      showCaptions: false,
      subtitle: "Fotos reais e públicas deste veículo no estoque da loja.",
      title: "Veja cada detalhe",
    }),
    component("vehicle_story", "scroll_zoom", 4, {
      imageUrl: photos[1]?.url ?? coverUrl,
      subtitle:
        listing.description ||
        "Veículo selecionado pela loja, apresentado com transparência e pronto para uma visita.",
      title: "Um veículo para conhecer de perto",
    }),
    component("contact", "contact_section", 5, {
      fields: { email: true, message: true, name: true, phone: true },
      submitButtonText: "Quero falar sobre este veículo",
      subtitle:
        "Envie seus dados para a equipe responder com disponibilidade, troca e financiamento.",
      successMessage: "Mensagem enviada. A equipe entrará em contato em breve.",
      title: "Este veículo combina com você?",
    }),
    component("cta", "cta", 6, {
      buttonLabel: "Falar com a loja",
      buttonUrl: "#contato",
      subtitle:
        "Confirme a disponibilidade, agende sua visita ou envie os dados do seu usado para avaliação.",
      title: `Não deixe o ${listing.title} passar`,
    }),
  ];
}

function component(
  id: string,
  type: string,
  order: number,
  props: Record<string, unknown>,
): StorefrontBuilderComponent {
  return { id, order, props, type, visible: true };
}

function publicSpecs(listing: PublicVehicleListingDetail) {
  return Object.fromEntries(
    compact([
      pair("Ano", vehicleYear(listing)),
      pair(
        "Quilometragem",
        listing.mileageKm === null
          ? null
          : `${listing.mileageKm.toLocaleString("pt-BR")} km`,
      ),
      pair("Combustível", fuelLabel(listing.fuelType)),
      pair("Câmbio", transmissionLabel(listing.transmission)),
      pair("Motor", engineLabel(listing)),
      pair("Portas", listing.doors === null ? null : `${listing.doors} portas`),
    ]),
  );
}

function conditionLabel(value: PublicVehicleListingDetail["condition"]) {
  if (value === "new") return "0 km";
  if (value === "certified_pre_owned") return "Seminovo certificado";
  return "Seminovo";
}

function fuelLabel(value: string | null) {
  const labels: Record<string, string> = {
    diesel: "Diesel",
    electric: "Elétrico",
    ethanol: "Etanol",
    flex: "Flex",
    gasoline: "Gasolina",
    hybrid: "Híbrido",
    other: "Outro",
  };
  return value ? (labels[value] ?? "Outro") : null;
}

function transmissionLabel(value: string | null) {
  const labels: Record<string, string> = {
    automated: "Automatizado",
    automatic: "Automático",
    cvt: "CVT",
    manual: "Manual",
    other: "Outro",
  };
  return value ? (labels[value] ?? "Outro") : null;
}

function engineLabel(listing: PublicVehicleListingDetail) {
  const displacement =
    listing.engineDisplacement === "other" ? null : listing.engineDisplacement;
  const aspiration = listing.engineAspiration
    ? getVehicleEngineAspirationLabel(listing.engineAspiration)
    : null;
  const value = compact([displacement, aspiration]).join(" ");
  return value || null;
}

function vehicleYear(listing: PublicVehicleListingDetail) {
  if (!listing.manufactureYear && !listing.modelYear) return null;
  return `${listing.manufactureYear ?? "-"}/${listing.modelYear ?? "-"}`;
}

function pair(key: string, value: string | null) {
  return value ? ([key, value] as const) : null;
}

function compact<T>(values: readonly (T | null | undefined | "")[]): T[] {
  return values.filter((value): value is T => Boolean(value));
}
