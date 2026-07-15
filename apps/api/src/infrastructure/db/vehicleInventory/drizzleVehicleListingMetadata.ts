import type {
  VehicleListing,
  VehicleListingCatalog,
} from "../../../domains/vehicle/ports/vehicleInventoryRepository.js";

export function createListingMetadata(
  listing: Pick<
    VehicleListing,
    "catalog" | "commercialTags" | "resaleAnalysis" | "videoUrl"
  >,
): Record<string, unknown> {
  return {
    ...(listing.catalog ? { catalog: listing.catalog } : {}),
    ...(listing.commercialTags.length
      ? { commercialTags: [...listing.commercialTags] }
      : {}),
    ...(listing.resaleAnalysis
      ? {
          resaleAnalysis: {
            ...listing.resaleAnalysis,
            generatedAt: listing.resaleAnalysis.generatedAt.toISOString(),
          },
        }
      : {}),
    ...(listing.videoUrl ? { videoUrl: listing.videoUrl } : {}),
  };
}

export function readListingCatalog(
  metadata: unknown,
): VehicleListingCatalog | null {
  if (!isRecord(metadata) || !isRecord(metadata.catalog)) return null;
  const catalog = metadata.catalog;
  return {
    brandCode: readString(catalog.brandCode),
    brandLogoUrl: readString(catalog.brandLogoUrl),
    brandName: readString(catalog.brandName),
    fipeCode: readString(catalog.fipeCode),
    fuel: readString(catalog.fuel),
    modelCode: readString(catalog.modelCode),
    modelName: readString(catalog.modelName),
    modelYear: readNumber(catalog.modelYear),
    priceCents: readNumber(catalog.priceCents),
    referenceMonth: readString(catalog.referenceMonth),
    source: catalog.source === "fipe" ? "fipe" : null,
    vehicleType: readVehicleType(catalog.vehicleType),
    yearCode: readString(catalog.yearCode),
    yearName: readString(catalog.yearName),
  };
}

export function readListingCommercialTags(
  metadata: unknown,
): readonly string[] {
  if (!isRecord(metadata) || !Array.isArray(metadata.commercialTags)) return [];
  return Array.from(
    new Set(
      metadata.commercialTags.flatMap((value) => {
        if (typeof value !== "string") return [];
        const tag = value.trim();
        return tag ? [tag.slice(0, 40)] : [];
      }),
    ),
  ).slice(0, 12);
}

export function readListingVideoUrl(metadata: unknown): string | null {
  const value = isRecord(metadata) ? readString(metadata.videoUrl) : null;
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

export function readListingResaleAnalysis(
  metadata: unknown,
): VehicleListing["resaleAnalysis"] {
  if (!isRecord(metadata) || !isRecord(metadata.resaleAnalysis)) return null;
  const analysis = metadata.resaleAnalysis;
  const provider = analysis.provider;
  const generatedAt = readDate(analysis.generatedAt);
  if (
    !isRecord(provider) ||
    !generatedAt ||
    !isRiskScore(analysis.dealRiskScore) ||
    !isRiskLevel(analysis.riskLevel) ||
    typeof analysis.suggestedDescription !== "string" ||
    typeof analysis.summary !== "string" ||
    !Array.isArray(analysis.topics)
  ) {
    return null;
  }
  const providerName = readString(provider.name);
  const providerModel = readString(provider.model);
  if (!providerName || !providerModel) return null;
  const topics = analysis.topics.flatMap((topic) => {
    if (
      !isRecord(topic) ||
      !isTopicCode(topic.code) ||
      !isTopicType(topic.type) ||
      typeof topic.message !== "string" ||
      typeof topic.title !== "string"
    ) {
      return [];
    }
    return [
      {
        code: topic.code,
        message: topic.message,
        title: topic.title,
        type: topic.type,
      },
    ];
  });
  if (topics.length !== analysis.topics.length) return null;
  return {
    dealRiskScore: analysis.dealRiskScore,
    generatedAt,
    provider: { model: providerModel, name: providerName },
    riskLevel: analysis.riskLevel,
    suggestedDescription: analysis.suggestedDescription,
    summary: analysis.summary,
    topics,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isRiskLevel(value: unknown): value is "high" | "low" | "medium" {
  return value === "high" || value === "low" || value === "medium";
}

function isRiskScore(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
  );
}

function isTopicCode(value: unknown): value is "L" | "N" | "W" {
  return value === "L" || value === "N" || value === "W";
}

function isTopicType(
  value: unknown,
): value is "negative" | "neutral" | "positive" {
  return value === "negative" || value === "neutral" || value === "positive";
}

function readVehicleType(value: unknown): VehicleListingCatalog["vehicleType"] {
  return value === "cars" || value === "motorcycles" || value === "trucks"
    ? value
    : null;
}
