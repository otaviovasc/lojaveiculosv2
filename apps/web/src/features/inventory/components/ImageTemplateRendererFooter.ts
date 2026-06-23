import {
  IMAGE_TEMPLATE_WIDTH,
  type FormatType,
  type ImageTemplatePreset,
  type ImageTemplateStoreSettings,
} from "./ImageTemplateTypes";

export function drawContactFooter(
  ctx: CanvasRenderingContext2D,
  config: ImageTemplatePreset,
  format: FormatType,
  height: number,
  storeSettings: ImageTemplateStoreSettings,
  textColor: string,
) {
  if (!config.showContactSection) return;
  const items = footerItems(config, storeSettings);
  if (items.length === 0) return;

  const footerY = height - (format === "story" ? 100 : 70);
  const iconSize = format === "story" ? 28 : 22;
  const fontSize = (format === "story" ? 26 : 20) * config.fontSizeScale;
  const gap = format === "story" ? 60 : 45;
  ctx.textAlign = "center";
  ctx.font = `700 ${fontSize}px "${config.fontFamily}", sans-serif`;
  ctx.fillStyle = textColor;

  const widths = items.map(
    (item) => ctx.measureText(item).width + iconSize + 15,
  );
  const totalWidth =
    widths.reduce((sum, width) => sum + width, 0) + gap * (items.length - 1);
  let currentX = (IMAGE_TEMPLATE_WIDTH - totalWidth) / 2;
  items.forEach((item, idx) => {
    ctx.fillText(
      item,
      currentX + iconSize + 15,
      footerY + (format === "story" ? 4 : 2),
    );
    currentX += widths[idx]! + gap;
  });
}

function footerItems(
  config: ImageTemplatePreset,
  storeSettings: ImageTemplateStoreSettings,
) {
  const items: string[] = [];
  const mainPhone =
    storeSettings?.profile?.whatsappPhone ||
    storeSettings?.profile?.contactPhone;
  if (config.showPhones && mainPhone) items.push(formatPhone(mainPhone));
  const domain =
    storeSettings?.publicSite?.customDomain ||
    storeSettings?.identity?.primaryDomain;
  if (config.showWebsite && domain) items.push(domain);
  return items;
}

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const local =
    digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  }
  return phone;
}
