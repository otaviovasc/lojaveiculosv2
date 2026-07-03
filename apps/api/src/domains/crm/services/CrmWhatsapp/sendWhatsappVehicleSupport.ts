import type {
  VehicleListing,
  VehicleMedia,
  VehicleUnit,
} from "../../../vehicle/ports/vehicleInventoryRepository.js";
import {
  getCrmVehicleInventory,
  requireCrmScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";

export type SendWhatsappVehicleInput = {
  description?: string;
  listingId?: string;
  mediaLimit?: number;
  mileageLabel?: string;
  priceLabel?: string;
  sessionId: string;
  thumbnailUrl?: string;
  title?: string;
  unitId?: string;
  url?: string;
  year?: string;
};

export type VehicleSummaryMessage = {
  action: string;
  content: string;
  leadActivityContent: string;
  metadata: Record<string, unknown>;
  sessionId: string;
  summary: string;
  text: string;
};

export class WhatsappVehicleNotFoundError extends Error {
  constructor(id: string) {
    super(`Vehicle not found for WhatsApp send: ${id}`);
    this.name = "WhatsappVehicleNotFoundError";
  }
}

export class WhatsappVehiclePartialSendError extends Error {
  readonly failedMediaId: string;
  readonly providerMessage: string;
  readonly sentMediaCount: number;
  readonly totalMediaCount: number;

  constructor(input: {
    failedMediaId: string;
    providerMessage: string;
    sentMediaCount: number;
    totalMediaCount: number;
  }) {
    super(
      [
        "Vehicle package send failed",
        `after ${input.sentMediaCount} of ${input.totalMediaCount} media messages.`,
        "Summary text was not sent.",
        `Provider error: ${input.providerMessage}`,
      ].join(" "),
    );
    this.failedMediaId = input.failedMediaId;
    this.name = "WhatsappVehiclePartialSendError";
    this.providerMessage = input.providerMessage;
    this.sentMediaCount = input.sentMediaCount;
    this.totalMediaCount = input.totalMediaCount;
  }
}

export async function resolveVehiclePackage(
  context: ServiceContext,
  input: SendWhatsappVehicleInput,
  ports: CrmServicePorts,
) {
  const scope = requireCrmScope(context);
  const inventory = getCrmVehicleInventory(ports);
  const unit = input.unitId
    ? await inventory.unitRepository.findById({
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
        unitId: input.unitId,
      })
    : null;
  if (input.unitId && !unit)
    throw new WhatsappVehicleNotFoundError(input.unitId);

  const listingId = input.listingId ?? unit?.listingId;
  if (!listingId) {
    throw new WhatsappVehicleNotFoundError(input.unitId ?? "unknown");
  }
  const listing = await inventory.listingRepository.findById({
    listingId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!listing) throw new WhatsappVehicleNotFoundError(listingId);

  const resolvedUnit =
    unit ?? (await resolvePrimaryUnit(context, inventory, listing));
  const media = resolvedUnit
    ? await inventory.mediaRepository.listByUnitIds({
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
        unitIds: [resolvedUnit.id],
      })
    : [];
  const orderedMedia = media
    .filter((item) => item.isPublic)
    .filter((item) => item.kind === "photo" || item.kind === "video")
    .sort((left, right) => left.displayOrder - right.displayOrder);
  const summary = createVehicleSummaryInput(
    input,
    listing,
    resolvedUnit,
    orderedMedia,
  );

  return { listing, media: orderedMedia, summary, unit: resolvedUnit };
}

async function resolvePrimaryUnit(
  context: ServiceContext,
  inventory: NonNullable<CrmServicePorts["vehicleInventory"]>,
  listing: VehicleListing,
) {
  const scope = requireCrmScope(context);
  const units = await inventory.unitRepository.listByListingIds({
    listingIds: [listing.id],
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  return (
    units.find((unit) => unit.status === "available") ??
    units.find((unit) => unit.status === "reserved") ??
    units[0] ??
    null
  );
}

function createVehicleSummaryInput(
  input: SendWhatsappVehicleInput,
  listing: VehicleListing,
  unit: VehicleUnit | null,
  media: readonly VehicleMedia[],
): SendWhatsappVehicleInput {
  const year = [listing.manufactureYear, listing.modelYear]
    .filter((value): value is number => typeof value === "number")
    .join("/");
  const description = input.description ?? listing.description ?? null;
  const mileageLabel = input.mileageLabel ?? formatMileage(listing.mileageKm);
  const priceLabel = input.priceLabel ?? formatCurrency(listing.priceCents);
  const thumbnailUrl = input.thumbnailUrl ?? media[0]?.url ?? null;
  const yearLabel = input.year ?? (year || null);
  return {
    ...(description ? { description } : {}),
    listingId: listing.id,
    ...(mileageLabel ? { mileageLabel } : {}),
    ...(priceLabel ? { priceLabel } : {}),
    sessionId: input.sessionId,
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
    title: input.title || listing.title,
    ...(unit?.id ? { unitId: unit.id } : {}),
    ...(input.url ? { url: input.url } : {}),
    ...(yearLabel ? { year: yearLabel } : {}),
  };
}

export function createVehicleSummary(
  input: SendWhatsappVehicleInput,
): VehicleSummaryMessage {
  const title = input.title ?? "Veiculo";
  return {
    action: "crm.whatsapp.message.send_vehicle",
    content: title,
    leadActivityContent: title,
    metadata: {
      fallbackTransport: "text",
      vehicle: {
        description: input.description ?? null,
        listingId: input.listingId ?? null,
        mileageLabel: input.mileageLabel ?? null,
        priceLabel: input.priceLabel ?? null,
        thumbnailUrl: input.thumbnailUrl ?? null,
        title,
        unitId: input.unitId ?? null,
        url: input.url ?? null,
        year: input.year ?? null,
      },
    },
    sessionId: input.sessionId,
    summary: "Sent CRM WhatsApp vehicle message",
    text: formatVehicleText({ ...input, title }),
  };
}

export function formatVehicleText(input: SendWhatsappVehicleInput) {
  const title = input.title ?? "veiculo";
  return [
    `Tenho essa opcao para voce: ${title}`,
    input.priceLabel ? `Preco: ${input.priceLabel}` : null,
    input.year ? `Ano: ${input.year}` : null,
    input.mileageLabel ? `Km: ${input.mileageLabel}` : null,
    input.description,
    input.url ? `Ver detalhes: ${input.url}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function clampMediaLimit(value: number | undefined) {
  if (!value) return 4;
  return Math.min(Math.max(value, 0), 10);
}

export function fileNameFromUrl(url: string) {
  try {
    const pathname = new URL(url).pathname;
    return decodeURIComponent(pathname.split("/").pop() || "veiculo.jpg");
  } catch {
    return "veiculo.jpg";
  }
}

function formatCurrency(value: number | null) {
  if (value === null) return undefined;
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value / 100);
}

function formatMileage(value: number | null) {
  if (value === null) return undefined;
  return `${new Intl.NumberFormat("pt-BR").format(value)} km`;
}

export function mimeTypeFromUrl(url: string, fallback: "image" | "video") {
  const lower = url.toLowerCase();
  if (lower.includes(".webp")) return "image/webp";
  if (lower.includes(".png")) return "image/png";
  if (lower.includes(".avif")) return "image/avif";
  if (lower.includes(".mp4")) return "video/mp4";
  if (lower.includes(".webm")) return "video/webm";
  return fallback === "video" ? "video/mp4" : "image/jpeg";
}
