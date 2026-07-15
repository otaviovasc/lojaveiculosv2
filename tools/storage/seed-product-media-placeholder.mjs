import { createHash } from "node:crypto";

export const SEED_MEDIA_PLACEHOLDER_VERSION = "photo-pending-svg-v1";

export function createSeedMediaPlaceholder({
  altText,
  listingTitle,
  mediaId,
  targetKey,
}) {
  const label = truncate(listingTitle || altText || "Veículo", 58);
  const view = truncate(altText || "Foto do veículo", 68);
  const suffix = String(mediaId).replaceAll("-", "").slice(-12);
  const fileName = `seed-photo-pending-${suffix}.svg`;
  const separator = targetKey.lastIndexOf("/");
  const storageKey = `${targetKey.slice(0, separator)}/${fileName}`;
  const body = Buffer.from(renderPlaceholder({ label, view }), "utf8");
  const sha256 = createHash("sha256").update(body).digest("hex");

  return {
    altText: `${label}: foto em preparação`,
    body,
    contentType: "image/svg+xml",
    fileName,
    height: 900,
    mediaId,
    originalStorageKey: targetKey,
    sha256,
    sizeBytes: body.byteLength,
    storageKey,
    width: 1600,
  };
}

export function isCurrentSeedMediaPlaceholder(object, placeholder) {
  const metadata = object?.metadata ?? {};
  return Boolean(
    object?.exists &&
    object.contentLength === placeholder.sizeBytes &&
    object.contentType?.startsWith(placeholder.contentType) &&
    metadata.fixture === "local-product-seed" &&
    metadata.placeholder === "true" &&
    metadata.artifactversion === SEED_MEDIA_PLACEHOLDER_VERSION &&
    metadata.artifactsha256 === placeholder.sha256,
  );
}

export function seedMediaPlaceholderMetadata(placeholder) {
  return {
    artifactSha256: placeholder.sha256,
    artifactVersion: SEED_MEDIA_PLACEHOLDER_VERSION,
    fixture: "local-product-seed",
    mediaId: String(placeholder.mediaId),
    placeholder: "true",
  };
}

function renderPlaceholder({ label, view }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <title>${escapeXml(label)} — foto em preparação</title>
  <desc>${escapeXml(view)}. Arte demonstrativa; nenhuma foto oficial foi carregada.</desc>
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#111827"/>
      <stop offset="1" stop-color="#030712"/>
    </linearGradient>
    <linearGradient id="body" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#374151"/>
      <stop offset="0.5" stop-color="#6b7280"/>
      <stop offset="1" stop-color="#1f2937"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#background)"/>
  <path d="M0 700 L1600 570 L1600 900 L0 900 Z" fill="#0b0f19"/>
  <g transform="translate(250 285)">
    <path d="M125 265 L245 100 Q275 60 350 52 L725 52 Q800 55 850 110 L960 265 L1050 300 L1090 390 L1040 445 L55 445 L10 390 L48 300 Z" fill="url(#body)" stroke="#9ca3af" stroke-width="8"/>
    <path d="M300 112 L715 112 Q760 114 792 150 L865 260 L215 260 Z" fill="#111827" stroke="#6b7280" stroke-width="6"/>
    <path d="M535 112 L535 260" stroke="#6b7280" stroke-width="6"/>
    <circle cx="245" cy="438" r="92" fill="#030712" stroke="#9ca3af" stroke-width="14"/>
    <circle cx="890" cy="438" r="92" fill="#030712" stroke="#9ca3af" stroke-width="14"/>
    <circle cx="245" cy="438" r="38" fill="#4b5563"/>
    <circle cx="890" cy="438" r="38" fill="#4b5563"/>
    <path d="M55 340 H170 M970 340 H1070" stroke="#ef4444" stroke-width="20" stroke-linecap="round"/>
  </g>
  <text x="800" y="112" fill="#f9fafb" font-family="Arial, sans-serif" font-size="32" font-weight="700" text-anchor="middle" letter-spacing="5">FOTO EM PREPARAÇÃO</text>
  <text x="800" y="165" fill="#d1d5db" font-family="Arial, sans-serif" font-size="27" text-anchor="middle">${escapeXml(label)}</text>
  <text x="800" y="822" fill="#9ca3af" font-family="Arial, sans-serif" font-size="22" text-anchor="middle">Cenário local demonstrativo · nenhuma operação externa ocorreu</text>
</svg>`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function truncate(value, length) {
  const text = String(value).trim();
  return text.length <= length ? text : `${text.slice(0, length - 1)}…`;
}
