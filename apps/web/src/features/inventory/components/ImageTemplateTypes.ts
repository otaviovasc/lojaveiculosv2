import { hexColor } from "./ImageTemplateCanvasColors";
import type { InventoryStoreSettings } from "./InventoryPrintTypes";

export type FormatType = "feed" | "story";
export type BgStyleType = "blur" | "solid" | "gradient";

export type ImageTemplatePreset = {
  name: string;
  format: FormatType;
  color: string;
  bgStyle: BgStyleType;
  priceColor: string;
  customTextColor: string;
  fontFamily: string;
  logoScale: number;
  imageHeightScale: number;
  imageWidthScale: number;
  fontSizeScale: number;
  cardYOffset: number;
  imageYOffset: number;
  imageXOffset: number;
  cropXOffset: number;
  cropYOffset: number;
  blurBrightness: number;
  bgBlurAmount: number;
  glassBlur: number;
  glassOpacity: number;
  showGlassBox: boolean;
  showVehicleDetails: boolean;
  showPrice: boolean;
  showContactSection: boolean;
  showPhones: boolean;
  showInstagram: boolean;
  showWebsite: boolean;
  footerYOffset: number;
  contactSizeScale: number;
};

export type ImageTemplateListing = {
  catalog?: { fuel?: string | null } | null;
  manufactureYear?: number | null;
  modelYear?: number | null;
  priceCents: number | null;
  storeId?: string | null;
  tenantId?: string | null;
  title: string;
};

export type ImageTemplateMedia = {
  altText?: string | null;
  id: string;
  kind?: "document_preview" | "photo" | "video";
  unitId?: string | null;
  url: string;
};

export type ImageTemplateStoreSettings = InventoryStoreSettings;

export const IMAGE_TEMPLATE_WIDTH = 1080;

export const COLOR_PRESETS = [
  hexColor("171717"),
  hexColor("1a1a2e"),
  hexColor("0f0f0f"),
  hexColor("1e3a5f"),
  hexColor("2d2d2d"),
  hexColor("0a192f"),
  hexColor("ffffff"),
  hexColor("f3f4f6"),
];

export const PRICE_COLOR_PRESETS = [
  hexColor("ed1d24"),
  hexColor("facc15"),
  hexColor("10b981"),
  hexColor("ffffff"),
];

export function isImageTemplatePhoto(media: ImageTemplateMedia) {
  return media.kind === undefined || media.kind === "photo";
}

export function getImageTemplateDownloadBaseName(title: string) {
  const normalized = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return normalized || "veiculo";
}

export function getImageTemplateHeight(format: FormatType) {
  return format === "story" ? 1920 : 1080;
}
