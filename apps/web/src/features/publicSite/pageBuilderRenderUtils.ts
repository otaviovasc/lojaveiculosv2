import type { StorefrontBuilderComponent } from "@lojaveiculosv2/shared";

export type PropsRecord = Record<string, unknown>;

export function boolProp(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

export function numberProp(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function textProp(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

export function textArrayProp(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function recordArrayProp(value: unknown): PropsRecord[] {
  return Array.isArray(value)
    ? value.filter(isRecord).map((item) => ({ ...item }))
    : [];
}

export function componentArrayProp(
  value: unknown,
): StorefrontBuilderComponent[] {
  return recordArrayProp(value)
    .filter(isBuilderComponent)
    .map((component) => ({ ...component, props: { ...component.props } }));
}

export function classForGap(value: unknown) {
  const gap = textProp(value) ?? "md";
  if (gap === "sm") return "gap-2";
  if (gap === "lg") return "gap-5";
  if (gap === "xl") return "gap-7";
  return "gap-3";
}

export function classForMaxWidth(value: unknown) {
  const width = textProp(value) ?? "lg";
  if (width === "md") return "max-w-3xl";
  if (width === "xl") return "max-w-7xl";
  return "max-w-5xl";
}

export function classForTextAlign(value: unknown) {
  const align = textProp(value) ?? "left";
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
}

export function formatPrice(cents?: number | null) {
  if (cents === null || cents === undefined) return "Consulte";
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(cents / 100);
}

export function createWhatsappHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "#";
}

export function mapLink(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function youtubeEmbedUrl(url: string) {
  const id = url.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{6,})/)?.[1];
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

function isRecord(value: unknown): value is PropsRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isBuilderComponent(
  value: PropsRecord,
): value is StorefrontBuilderComponent {
  return (
    typeof value.id === "string" &&
    typeof value.type === "string" &&
    isRecord(value.props)
  );
}
