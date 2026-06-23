import {
  IMAGE_TEMPLATE_WIDTH,
  type FormatType,
  type ImageTemplateListing,
  type ImageTemplatePreset,
} from "./ImageTemplateTypes";
import { isLightTheme } from "./ImageTemplateRendererBackground";
import { alphaColor, hexColor } from "./ImageTemplateCanvasColors";

export function drawVehicleDetails(
  ctx: CanvasRenderingContext2D,
  config: ImageTemplatePreset,
  format: FormatType,
  height: number,
  listing: ImageTemplateListing,
  colors: { text: string; dim: string },
) {
  const card = getCardMetrics(config, format, height);

  if (config.showGlassBox) {
    ctx.save();
    ctx.fillStyle = isLightTheme(config)
      ? alphaColor(255, 255, 255, 0.85)
      : alphaColor(255, 255, 255, config.glassOpacity);
    ctx.shadowBlur = config.glassBlur;
    ctx.shadowColor = alphaColor(0, 0, 0, 0.25);
    ctx.beginPath();
    ctx.roundRect(card.x, card.y, card.w, card.h, 40 * config.fontSizeScale);
    ctx.fill();
    ctx.strokeStyle = alphaColor(255, 255, 255, 0.15);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  if (!config.showVehicleDetails) return;

  const title = listing.title || "";
  const maxContentW = card.w - 80 * config.fontSizeScale;
  const titleSize = fitTitleSize(ctx, title, config, format, maxContentW);
  const specsSize = (format === "story" ? 32 : 26) * config.fontSizeScale;
  const priceSize = (format === "story" ? 92 : 80) * config.fontSizeScale;
  const gap1 = (format === "story" ? 20 : 12) * config.fontSizeScale;
  const gap2 = (format === "story" ? 45 : 35) * config.fontSizeScale;
  let totalHeight = titleSize + gap1 + specsSize;
  if (config.showPrice) totalHeight += gap2 + priceSize;

  let currentY = card.y + (card.h - totalHeight) / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = colors.text;
  ctx.font = `800 ${titleSize}px "${config.fontFamily}", sans-serif`;
  ctx.fillText(title, IMAGE_TEMPLATE_WIDTH / 2, currentY);

  currentY += titleSize + gap1;
  ctx.fillStyle = colors.dim;
  ctx.font = `500 ${specsSize}px "${config.fontFamily}", sans-serif`;
  const year = listing.modelYear
    ? `${listing.manufactureYear || listing.modelYear}/${listing.modelYear}`
    : "----";
  ctx.fillText(
    `${year}  •  ${listing.catalog?.fuel || "Combustível"}`,
    IMAGE_TEMPLATE_WIDTH / 2,
    currentY,
  );
  currentY += specsSize + gap2;

  if (config.showPrice) {
    drawPrice(
      ctx,
      config,
      formatPrice(listing.priceCents),
      maxContentW,
      currentY,
      priceSize,
    );
  }
}

export function getTemplateColors(config: ImageTemplatePreset) {
  return isLightTheme(config)
    ? { text: hexColor("171717"), dim: alphaColor(0, 0, 0, 0.6) }
    : { text: config.customTextColor, dim: `${config.customTextColor}cc` };
}

function fitTitleSize(
  ctx: CanvasRenderingContext2D,
  title: string,
  config: ImageTemplatePreset,
  format: FormatType,
  maxContentW: number,
) {
  let titleSize = (format === "story" ? 62 : 42) * config.fontSizeScale;
  ctx.font = `800 ${titleSize}px "${config.fontFamily}", sans-serif`;
  while (ctx.measureText(title).width > maxContentW && titleSize > 18) {
    titleSize -= 2;
    ctx.font = `800 ${titleSize}px "${config.fontFamily}", sans-serif`;
  }
  return titleSize;
}

function drawPrice(
  ctx: CanvasRenderingContext2D,
  config: ImageTemplatePreset,
  price: string,
  maxContentW: number,
  y: number,
  priceSize: number,
) {
  let finalPriceSize = priceSize;
  ctx.font = `900 ${finalPriceSize}px "${config.fontFamily}", sans-serif`;
  while (ctx.measureText(price).width > maxContentW && finalPriceSize > 30) {
    finalPriceSize -= 4;
    ctx.font = `900 ${finalPriceSize}px "${config.fontFamily}", sans-serif`;
  }
  ctx.fillStyle = config.priceColor;
  ctx.fillText(price, IMAGE_TEMPLATE_WIDTH / 2, y);
}

function getCardMetrics(
  config: ImageTemplatePreset,
  format: FormatType,
  height: number,
) {
  const w =
    (format === "story"
      ? IMAGE_TEMPLATE_WIDTH * 0.82
      : IMAGE_TEMPLATE_WIDTH * 0.76) * config.fontSizeScale;
  const baseH = format === "story" ? 420 : 280;
  const h = (config.showPrice ? baseH : baseH * 0.7) * config.fontSizeScale;
  const baseImgY = format === "story" ? 240 : 120;
  const baseContentH = format === "story" ? height * 0.45 : height * 0.55;
  const overlap = (format === "story" ? 100 : 120) * config.fontSizeScale;
  return {
    h,
    w,
    x: (IMAGE_TEMPLATE_WIDTH - w) / 2,
    y:
      baseImgY +
      baseContentH -
      overlap +
      config.cardYOffset -
      30 * config.fontSizeScale,
  };
}

function formatPrice(priceCents: number | null) {
  if (priceCents === null) return "Sob Consulta";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  }).format(priceCents / 100);
}
