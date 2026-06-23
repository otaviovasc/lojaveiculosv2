import {
  IMAGE_TEMPLATE_WIDTH,
  type FormatType,
  type ImageTemplatePreset,
  type ImageTemplateStoreSettings,
} from "./ImageTemplateTypes";
import { alphaColor, hexColor } from "./ImageTemplateCanvasColors";

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  config: ImageTemplatePreset,
  format: FormatType,
  height: number,
  storeSettings: ImageTemplateStoreSettings,
) {
  ctx.clearRect(0, 0, IMAGE_TEMPLATE_WIDTH, height);
  if (config.bgStyle === "blur" && img) {
    ctx.filter = `blur(${config.bgBlurAmount}px) brightness(${config.blurBrightness})`;
    drawCover(ctx, img, -100, -100, IMAGE_TEMPLATE_WIDTH + 200, height + 200);
    ctx.filter = "none";
    ctx.fillStyle = alphaColor(
      0,
      0,
      0,
      Math.max(0, 0.7 - config.blurBrightness),
    );
    ctx.fillRect(0, 0, IMAGE_TEMPLATE_WIDTH, height);
  } else if (config.bgStyle === "gradient") {
    const gradient = ctx.createLinearGradient(
      0,
      0,
      IMAGE_TEMPLATE_WIDTH,
      height,
    );
    gradient.addColorStop(0, config.color);
    gradient.addColorStop(
      1,
      isLightTheme(config) ? hexColor("e5e7eb") : hexColor("000000"),
    );
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, IMAGE_TEMPLATE_WIDTH, height);
  } else {
    ctx.fillStyle = config.color;
    ctx.fillRect(0, 0, IMAGE_TEMPLATE_WIDTH, height);
  }

  if (config.bgStyle !== "blur") {
    const accent =
      storeSettings?.publicSite?.theme?.primaryColor || hexColor("ed1d24");
    const glow = ctx.createRadialGradient(
      IMAGE_TEMPLATE_WIDTH / 2,
      0,
      0,
      IMAGE_TEMPLATE_WIDTH / 2,
      0,
      IMAGE_TEMPLATE_WIDTH,
    );
    glow.addColorStop(0, `${accent}22`);
    glow.addColorStop(1, alphaColor(0, 0, 0, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, IMAGE_TEMPLATE_WIDTH, height);
  }

  void format;
}

export function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  const drawH = imgRatio > boxRatio ? h : w / imgRatio;
  const drawW = imgRatio > boxRatio ? h * imgRatio : w;
  const drawX = imgRatio > boxRatio ? x - (drawW - w) / 2 : x;
  const drawY = imgRatio > boxRatio ? y : y - (drawH - h) / 2;
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
}

export function isLightTheme(config: ImageTemplatePreset) {
  return (
    (config.bgStyle === "solid" || config.bgStyle === "gradient") &&
    (config.color === hexColor("ffffff") || config.color === hexColor("f3f4f6"))
  );
}
