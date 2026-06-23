import { hexColor } from "./ImageTemplateCanvasColors";
import type { InventoryStoreSettings } from "./InventoryPrintTypes";

export type FormatType = "feed" | "story";
export type BgStyleType = "blur" | "solid" | "gradient";

export type ImageTemplatePreset = {
  name: string;
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
};

export type ImageTemplateListing = {
  catalog?: { fuel?: string | null } | null;
  manufactureYear?: number | null;
  modelYear?: number | null;
  priceCents: number | null;
  title: string;
};

export type ImageTemplateMedia = {
  id: string;
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

export function getImageTemplateHeight(format: FormatType) {
  return format === "story" ? 1920 : 1080;
}
