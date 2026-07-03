import type {
  StorefrontImageAspect,
  StorefrontImageEditorSettings,
} from "./storefrontImageEditorModel";

type OutputSize = { height: number; width: number };

export function renderEditedImage(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  settings: StorefrontImageEditorSettings,
) {
  const size = outputSize(settings.aspect, image);
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return size;

  context.clearRect(0, 0, size.width, size.height);
  const baseScale = Math.max(
    size.width / image.naturalWidth,
    size.height / image.naturalHeight,
  );
  const scale = baseScale * settings.zoom;
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const offsetX = (settings.x / 100) * size.width;
  const offsetY = (settings.y / 100) * size.height;
  const drawX = (size.width - drawWidth) / 2 + offsetX;
  const drawY = (size.height - drawHeight) / 2 + offsetY;

  context.filter = createFilter(settings);
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  context.filter = "none";
  if (settings.removeColorEnabled) removeColor(context, size, settings);
  return size;
}

export function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Não foi possível gerar a imagem."));
    }, "image/png");
  });
}

function outputSize(
  aspect: StorefrontImageAspect,
  image: HTMLImageElement,
): OutputSize {
  if (aspect === "square") return { height: 1200, width: 1200 };
  if (aspect === "portrait") return { height: 1350, width: 1080 };
  if (aspect === "banner") return { height: 720, width: 1920 };
  if (aspect === "wide") return { height: 900, width: 1600 };
  const longSide = Math.min(
    Math.max(image.naturalWidth, image.naturalHeight),
    1800,
  );
  const ratio = image.naturalWidth / image.naturalHeight || 1;
  return ratio >= 1
    ? { height: Math.round(longSide / ratio), width: longSide }
    : { height: longSide, width: Math.round(longSide * ratio) };
}

function createFilter(settings: StorefrontImageEditorSettings) {
  return [
    `brightness(${settings.brightness})`,
    `contrast(${settings.contrast})`,
    `saturate(${settings.saturation})`,
    `blur(${settings.blur}px)`,
  ].join(" ");
}

function removeColor(
  context: CanvasRenderingContext2D,
  size: OutputSize,
  settings: StorefrontImageEditorSettings,
) {
  const target = parseHex(settings.removeColor);
  const imageData = context.getImageData(0, 0, size.width, size.height);
  const data = imageData.data;
  const tolerance = settings.removeTolerance;
  for (let index = 0; index < data.length; index += 4) {
    const distance = Math.max(
      Math.abs((data[index] ?? 0) - target.red),
      Math.abs((data[index + 1] ?? 0) - target.green),
      Math.abs((data[index + 2] ?? 0) - target.blue),
    );
    if (distance <= tolerance) data[index + 3] = 0;
  }
  context.putImageData(imageData, 0, 0);
}

function parseHex(value: string) {
  const normalized = value.startsWith("#") ? value.slice(1) : value;
  const parsed = Number.parseInt(normalized.padEnd(6, "0").slice(0, 6), 16);
  return {
    blue: parsed & 255,
    green: (parsed >> 8) & 255,
    red: (parsed >> 16) & 255,
  };
}
