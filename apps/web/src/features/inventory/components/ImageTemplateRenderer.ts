import {
  getImageTemplateHeight,
  IMAGE_TEMPLATE_WIDTH,
  type FormatType,
  type ImageTemplateListing,
  type ImageTemplatePreset,
  type ImageTemplateStoreSettings,
} from "./ImageTemplateTypes";
import { drawBackground } from "./ImageTemplateRendererBackground";
import {
  drawVehicleDetails,
  getTemplateColors,
} from "./ImageTemplateRendererDetails";
import { drawContactFooter } from "./ImageTemplateRendererFooter";
import { alphaColor } from "./ImageTemplateCanvasColors";

export async function renderImageTemplate({
  canvas,
  config,
  format,
  listing,
  photoUrl,
  storeSettings,
}: {
  canvas: HTMLCanvasElement;
  config: ImageTemplatePreset;
  format: FormatType;
  listing: ImageTemplateListing;
  photoUrl: string;
  storeSettings: ImageTemplateStoreSettings;
}) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const height = getImageTemplateHeight(format);
  canvas.width = IMAGE_TEMPLATE_WIDTH;
  canvas.height = height;

  let mainImg: HTMLImageElement | null = null;
  if (photoUrl) {
    try {
      mainImg = await loadImage(photoUrl);
    } catch {
      /* ignore missing image */
    }
  }

  drawBackground(ctx, mainImg, config, format, height, storeSettings);
  drawVehicleImage(ctx, mainImg, config, format, height);

  const colors = getTemplateColors(config);
  await drawLogoOrStoreName(ctx, config, format, storeSettings, colors.text);
  drawVehicleDetails(ctx, config, format, height, listing, colors);
  drawContactFooter(ctx, config, format, height, storeSettings, colors.text);

  return canvas.toDataURL("image/png");
}

function drawVehicleImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  config: ImageTemplatePreset,
  format: FormatType,
  height: number,
) {
  if (!img) return;

  const imgY = (format === "story" ? 240 : 120) + config.imageYOffset;
  const contentH =
    (format === "story" ? height * 0.45 : height * 0.55) *
    config.imageHeightScale;
  const imgW = IMAGE_TEMPLATE_WIDTH * config.imageWidthScale;
  const imgX = (IMAGE_TEMPLATE_WIDTH - imgW) / 2 + config.imageXOffset;
  const imgRatio = img.width / img.height;
  const containerRatio = imgW / contentH;
  const drawH = imgRatio > containerRatio ? contentH : imgW / imgRatio;
  const drawW = imgRatio > containerRatio ? contentH * imgRatio : imgW;
  const drawX =
    imgRatio > containerRatio
      ? imgX + (imgW - drawW) / 2 + config.cropXOffset
      : imgX + config.cropXOffset;
  const drawY =
    imgRatio > containerRatio
      ? imgY + config.cropYOffset
      : imgY + (contentH - drawH) / 2 + config.cropYOffset;

  ctx.save();
  ctx.beginPath();
  ctx.rect(imgX, imgY, imgW, contentH);
  ctx.clip();
  ctx.drawImage(img, drawX, drawY, drawW, drawH);

  const bottomFade = ctx.createLinearGradient(
    0,
    imgY + contentH - 120,
    0,
    imgY + contentH,
  );
  bottomFade.addColorStop(0, alphaColor(0, 0, 0, 0));
  bottomFade.addColorStop(1, alphaColor(0, 0, 0, 0.6));
  ctx.fillStyle = bottomFade;
  ctx.fillRect(0, imgY + contentH - 120, IMAGE_TEMPLATE_WIDTH, 120);
  ctx.restore();
}

async function drawLogoOrStoreName(
  ctx: CanvasRenderingContext2D,
  config: ImageTemplatePreset,
  format: FormatType,
  storeSettings: ImageTemplateStoreSettings,
  textColor: string,
) {
  const logoMaxH = (format === "story" ? 140 : 90) * config.logoScale;
  const logoY = format === "story" ? 50 : 20;
  let logoDrawn = false;

  if (storeSettings?.profile?.logoImageUrl) {
    try {
      const logoImg = await loadImage(storeSettings.profile.logoImageUrl);
      ctx.shadowBlur = 15;
      ctx.shadowColor = alphaColor(255, 255, 255, 0.4);
      const logoW = logoMaxH * (logoImg.width / logoImg.height);
      ctx.drawImage(
        logoImg,
        (IMAGE_TEMPLATE_WIDTH - logoW) / 2,
        logoY,
        logoW,
        logoMaxH,
      );
      ctx.shadowBlur = 0;
      logoDrawn = true;
    } catch {
      /* skip logo */
    }
  }

  const storeName = storeSettings?.identity?.tradingName || "Loja Veículos";
  if (!logoDrawn && storeName) {
    ctx.fillStyle = textColor;
    ctx.font = `800 ${64 * config.fontSizeScale}px "${config.fontFamily}", sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(storeName, IMAGE_TEMPLATE_WIDTH / 2, logoY + 70);
    ctx.textAlign = "left";
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}
