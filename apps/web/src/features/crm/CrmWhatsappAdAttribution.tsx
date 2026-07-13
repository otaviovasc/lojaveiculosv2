import { ExternalLink, Megaphone } from "lucide-react";

export function CrmWhatsappAdAttribution({
  metadata,
}: {
  metadata: Record<string, unknown> | undefined;
}) {
  const title = readString(metadata?.adTitle);
  const body = readString(metadata?.adBody);
  const source = readString(metadata?.adSourceApp);
  const sourceUrl = safeHttpUrl(metadata?.adSourceUrl);
  const thumbnailUrl = safeHttpUrl(metadata?.adThumbnailUrl);
  if (!metadata?.isAdInitiated && !title && !body && !source) return null;

  const displayTitle = title ?? source ?? "Conversa iniciada por anuncio";
  return (
    <section
      aria-label="Origem do anuncio"
      className="crm-whatsapp-ad-attribution"
    >
      <header>
        <span>
          <Megaphone aria-hidden="true" />
          <small>Origem do anuncio</small>
        </span>
        {source ? <em>{source}</em> : null}
      </header>
      {thumbnailUrl ? <img alt={displayTitle} src={thumbnailUrl} /> : null}
      <div>
        <strong>{displayTitle}</strong>
        {body ? <p>{body}</p> : null}
        {sourceUrl ? (
          <a
            aria-label="Abrir anuncio"
            href={sourceUrl}
            rel="noreferrer"
            target="_blank"
          >
            Abrir anuncio
            <ExternalLink aria-hidden="true" />
          </a>
        ) : null}
      </div>
    </section>
  );
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function safeHttpUrl(value: unknown) {
  const text = readString(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
