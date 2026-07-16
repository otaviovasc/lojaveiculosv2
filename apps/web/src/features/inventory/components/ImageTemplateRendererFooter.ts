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

  const footerY =
    height - (format === "story" ? 100 : 70) + (config.footerYOffset ?? 0);
  const iconSize = format === "story" ? 28 : 22;
  const fontSize =
    (format === "story" ? 26 : 20) * (config.contactSizeScale ?? 1);
  const gap = format === "story" ? 60 : 45;

  ctx.font = `700 ${fontSize}px "${config.fontFamily}", sans-serif`;
  ctx.fillStyle = textColor;

  // Calculate width of each item to center the whole row
  const widths = items.map(
    (item) => ctx.measureText(item.text).width + iconSize + 10,
  );
  const totalWidth =
    widths.reduce((sum, width) => sum + width, 0) + gap * (items.length - 1);

  let currentX = (IMAGE_TEMPLATE_WIDTH - totalWidth) / 2;

  ctx.save();
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  items.forEach((item, idx) => {
    // Vertically center the icon relative to the text line
    const iconX = currentX;
    const iconY = footerY - iconSize / 2;

    if (item.type === "phone") {
      drawWhatsappIcon(ctx, iconX, iconY, iconSize, textColor);
    } else {
      drawGlobeIcon(ctx, iconX, iconY, iconSize, textColor);
    }

    // Draw text
    ctx.fillText(item.text, currentX + iconSize + 10, footerY);

    currentX += widths[idx]! + gap;
  });

  ctx.restore();
}

function drawWhatsappIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  ctx.save();
  ctx.translate(x, y);
  // Scale the 16x16 icon path to match the target size
  ctx.scale(size / 16, size / 16);
  ctx.fillStyle = color;

  // Official WhatsApp SVG path from Bootstrap Icons
  const path = new Path2D(
    "M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232",
  );
  ctx.fill(path);
  ctx.restore();
}

function drawGlobeIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  ctx.save();
  ctx.lineWidth = Math.max(1.5, size * 0.08);
  ctx.strokeStyle = color;
  const cx = x + size / 2;
  const cy = y + size / 2;
  const r = size / 2 - ctx.lineWidth;

  // Outer circle
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  // Equator line
  ctx.beginPath();
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.stroke();

  // Vertical axis
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy + r);
  ctx.stroke();

  // Grid ellipses for globe styling
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 0.5, r, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function footerItems(
  config: ImageTemplatePreset,
  storeSettings: ImageTemplateStoreSettings,
): { type: "phone" | "website"; text: string }[] {
  const items: { type: "phone" | "website"; text: string }[] = [];

  if (config.showPhones) {
    const whatsapp = storeSettings?.profile?.whatsappPhone;
    const contact = storeSettings?.profile?.contactPhone;

    if (whatsapp) {
      items.push({ type: "phone", text: formatPhone(whatsapp) });
    }

    if (contact && contact !== whatsapp) {
      items.push({ type: "phone", text: formatPhone(contact) });
    }
  }

  const domain =
    storeSettings?.publicSite?.customDomain ||
    storeSettings?.identity?.primaryDomain;
  if (config.showWebsite && domain) {
    items.push({ type: "website", text: domain });
  }
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
