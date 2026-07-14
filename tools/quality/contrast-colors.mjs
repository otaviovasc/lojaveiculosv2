export const minimumTextContrast = 4.5;

export function parseColor(rawValue) {
  const value = cleanValue(rawValue).toLowerCase();
  if (value === "transparent") return { a: 0, b: 0, g: 0, r: 0 };
  if (value === "white") return { a: 1, b: 255, g: 255, r: 255 };
  if (value === "black") return { a: 1, b: 0, g: 0, r: 0 };
  if (value.startsWith("#")) return parseHex(value);

  const rgbMatch = value.match(/^rgba?\((.*)\)$/s);
  if (!rgbMatch) return null;
  const [channelsPart, slashAlpha] = rgbMatch[1]
    .replaceAll(",", " ")
    .split("/");
  const channelParts = channelsPart.trim().split(/\s+/);
  const legacyAlpha =
    channelParts.length === 4 ? channelParts.pop() : undefined;
  const channels = channelParts.map(parseChannel);
  if (channels.length !== 3 || channels.some((channel) => channel === null)) {
    return null;
  }
  return {
    a: parseAlpha(slashAlpha ?? legacyAlpha ?? "1"),
    b: channels[2],
    g: channels[1],
    r: channels[0],
  };
}

export function resolveColor(rawValue, variables, seen = new Set()) {
  const value = cleanValue(rawValue);
  const parsed = parseColor(value);
  if (parsed) return parsed;

  const variable = value.match(/^var\(\s*(--[\w-]+)(?:\s*,\s*(.+))?\)$/s);
  if (variable) {
    const [, name, fallback] = variable;
    if (seen.has(name)) return null;
    const referenced = variables[name] ?? fallback;
    if (!referenced) return null;
    return resolveColor(referenced, variables, new Set([...seen, name]));
  }
  return resolveColorMix(value, variables, seen);
}

export function withOpacity(color, opacity) {
  return { ...color, a: color.a * opacity };
}

export function composite(foreground, background) {
  const alpha = foreground.a + background.a * (1 - foreground.a);
  if (alpha === 0) return { a: 0, b: 0, g: 0, r: 0 };
  const channel = (key) =>
    (foreground[key] * foreground.a +
      background[key] * background.a * (1 - foreground.a)) /
    alpha;
  return { a: alpha, b: channel("b"), g: channel("g"), r: channel("r") };
}

export function contrastRatio(foreground, background) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

export function minimumContrastOnSurfaces(foreground, background, surfaces) {
  let minimum = Number.POSITIVE_INFINITY;
  for (const surface of surfaces) {
    const renderedBackground = composite(background, surface);
    const renderedForeground = composite(foreground, renderedBackground);
    minimum = Math.min(
      minimum,
      contrastRatio(renderedForeground, renderedBackground),
    );
  }
  return minimum;
}

function cleanValue(value) {
  return value
    .trim()
    .replace(/\s*!important\s*$/i, "")
    .trim();
}

function parseHex(value) {
  let hex = value.slice(1);
  if (hex.length === 3 || hex.length === 4) {
    hex = [...hex].map((character) => character + character).join("");
  }
  if (hex.length !== 6 && hex.length !== 8) return null;
  const number = Number.parseInt(hex, 16);
  if (Number.isNaN(number)) return null;
  const hasAlpha = hex.length === 8;
  return {
    a: hasAlpha ? (number & 255) / 255 : 1,
    b: hasAlpha ? (number >> 8) & 255 : number & 255,
    g: hasAlpha ? (number >> 16) & 255 : (number >> 8) & 255,
    r: hasAlpha ? (number >> 24) & 255 : (number >> 16) & 255,
  };
}

function parseChannel(value) {
  if (value.endsWith("%")) return (Number.parseFloat(value) / 100) * 255;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseAlpha(value) {
  const trimmed = value.trim();
  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed)) return 1;
  return trimmed.endsWith("%") ? parsed / 100 : parsed;
}

function resolveColorMix(value, variables, seen) {
  const match = value.match(
    /^color-mix\(\s*in\s+(?:srgb|oklab)\s*,\s*([\s\S]+)\)$/i,
  );
  if (!match) return null;
  const parts = splitTopLevel(match[1]);
  if (parts.length !== 2) return null;
  const first = parseMixPart(parts[0], variables, seen);
  const second = parseMixPart(parts[1], variables, seen);
  if (!first?.color || !second?.color) return null;
  const firstWeight = first.weight ?? (second.weight ? 1 - second.weight : 0.5);
  const secondWeight = second.weight ?? 1 - firstWeight;
  const alpha = first.color.a * firstWeight + second.color.a * secondWeight;
  const mix = (key) =>
    alpha === 0
      ? 0
      : (first.color[key] * first.color.a * firstWeight +
          second.color[key] * second.color.a * secondWeight) /
        alpha;
  return { a: alpha, b: mix("b"), g: mix("g"), r: mix("r") };
}

function parseMixPart(part, variables, seen) {
  const match = part.trim().match(/^(.+?)(?:\s+(\d+(?:\.\d+)?)%)?$/s);
  if (!match) return null;
  return {
    color: resolveColor(match[1], variables, new Set(seen)),
    weight: match[2] === undefined ? null : Number(match[2]) / 100,
  };
}

function splitTopLevel(value) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === "(") depth += 1;
    if (value[index] === ")") depth -= 1;
    if (value[index] === "," && depth === 0) {
      parts.push(value.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(value.slice(start));
  return parts;
}

function relativeLuminance(color) {
  const linear = (channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return (
    linear(color.r) * 0.2126 +
    linear(color.g) * 0.7152 +
    linear(color.b) * 0.0722
  );
}
