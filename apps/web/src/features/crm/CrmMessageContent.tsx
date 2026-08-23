import {
  BookOpen,
  Car,
  Contact,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  MapPin,
  PackageSearch,
  Phone,
  Play,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  readCoordinate,
  readOptionalHref,
  readOptionalMeta,
  readRecord,
  readString,
  sanitizeCrmMessageUrl,
} from "./crmMessageHelpers";
import type { CrmMessage } from "./crmConversationTypes";
import { CrmAudioPlayer } from "./CrmAudioPlayer";

export function MessageContent({
  message,
  onMediaClick,
}: {
  message: CrmMessage;
  onMediaClick?: ((url: string) => void) | undefined;
}) {
  if (message.deletedAt) return <em>Esta mensagem foi apagada</em>;
  const metadata = readRecord(message.metadata);
  const media = readRecord(metadata.media);
  const caption = readString(media.caption) ?? message.content;
  const mediaUrl = sanitizeCrmMessageUrl(message.mediaUrl);
  const outgoing = message.direction === "OUTBOUND";

  if (mediaUrl && message.type === "IMAGE") {
    return (
      <figure className="crm-media">
        <MediaPreviewButton
          label={`Abrir ${caption || "imagem enviada"}`}
          onClick={onMediaClick ? () => onMediaClick(mediaUrl) : undefined}
        >
          <img
            alt={caption || "Imagem enviada"}
            className="crm-media-img"
            loading="lazy"
            src={mediaUrl}
          />
        </MediaPreviewButton>
        <MessageCaption message={message} value={caption} />
      </figure>
    );
  }

  if (mediaUrl && message.type === "STICKER") {
    return (
      <figure className="crm-media crm-sticker">
        <MediaPreviewButton
          label={`Abrir ${caption || "figurinha enviada"}`}
          onClick={onMediaClick ? () => onMediaClick(mediaUrl) : undefined}
        >
          <img alt={caption || "Figurinha enviada"} src={mediaUrl} />
        </MediaPreviewButton>
      </figure>
    );
  }

  if (mediaUrl && message.type === "VIDEO") {
    return (
      <figure className="crm-media crm-media-video-container">
        {onMediaClick ? (
          <button
            aria-label={`Reproduzir ${caption || "video"}`}
            className="crm-media-video-thumb-wrap"
            onClick={() => onMediaClick(mediaUrl)}
            type="button"
          >
            <video
              className="crm-media-video-preview"
              muted
              preload="metadata"
              src={mediaUrl}
            />
            <span className="crm-video-play-overlay">
              <Play className="size-6 fill-white text-white ml-0.5" />
            </span>
          </button>
        ) : (
          <video controls preload="metadata" src={mediaUrl} />
        )}
        <MessageCaption message={message} value={caption} />
      </figure>
    );
  }

  if (mediaUrl && message.type === "AUDIO") {
    return <CrmAudioPlayer outgoing={outgoing} src={mediaUrl} />;
  }

  if (mediaUrl && message.type === "DOCUMENT") {
    const fileName = readString(media.fileName) ?? message.content;
    const mimeType = readString(media.mimeType) ?? "";
    const isSpreadsheet =
      fileName?.endsWith(".xlsx") ||
      fileName?.endsWith(".xls") ||
      fileName?.endsWith(".csv") ||
      mimeType.includes("spreadsheet") ||
      mimeType.includes("excel") ||
      mimeType.includes("csv");

    const Icon = isSpreadsheet ? FileSpreadsheet : FileText;

    return (
      <AttachmentLink
        href={mediaUrl}
        icon={<Icon aria-hidden="true" className="size-5" />}
        label={fileName || "Documento"}
        {...readOptionalMeta(mimeType)}
      />
    );
  }

  if (message.type === "LOCATION") {
    const location = readRecord(metadata.location);
    return (
      <AttachmentLink
        icon={<MapPin aria-hidden="true" className="size-5" />}
        label={message.content || "Localizacao"}
        {...readOptionalHref(locationHref(location))}
        {...readOptionalMeta(readString(location.address))}
      />
    );
  }

  if (message.type === "CATALOG") {
    return <CatalogLikeCard message={message} metadata={metadata} />;
  }

  if (message.type === "CONTACT") {
    const contact = readRecord(metadata.contact);
    const phone = readString(contact.phone);
    return (
      <div className="crm-attachment crm-contact-card">
        <div className="crm-contact-icon">
          <Contact aria-hidden="true" className="size-5" />
        </div>
        <div className="crm-contact-body">
          <strong>{message.content || "Contato"}</strong>
          {phone ? (
            <small className="crm-contact-phone">
              <Phone className="size-3 inline mr-1" />
              {phone}
            </small>
          ) : null}
        </div>
      </div>
    );
  }

  if (message.mediaUrl) {
    return <AttachmentLink href={mediaUrl} label="Abrir anexo" />;
  }

  return <p>{message.content}</p>;
}

export function QuotedMessage({
  metadata,
  onClick,
}: {
  metadata?: Record<string, unknown> | undefined;
  onClick?: (() => void) | undefined;
}) {
  const replyTo = readRecord(readRecord(metadata).replyTo);
  if (!Object.keys(replyTo).length) return null;
  const content = readString(replyTo.content) ?? "Mensagem";
  const sender =
    readString(replyTo.senderName) ??
    (readString(replyTo.direction) === "OUTBOUND" ? "Atendente" : "Contato");

  const quote = (
    <>
      <strong>{sender}</strong>
      <span>{content}</span>
    </>
  );
  return onClick ? (
    <button
      aria-label={`Ir para mensagem de ${sender}: ${content}`}
      className="crm-quoted-message crm-quoted-interactive"
      onClick={onClick}
      type="button"
    >
      {quote}
    </button>
  ) : (
    <div className="crm-quoted-message">{quote}</div>
  );
}

function MediaPreviewButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick?: (() => void) | undefined;
}) {
  if (!onClick) return children;
  return (
    <button
      aria-label={label}
      className="crm-media-interactive"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function CatalogLikeCard({
  message,
  metadata,
}: {
  message: CrmMessage;
  metadata: Record<string, unknown>;
}) {
  const vehicle = readRecord(metadata.vehicle);
  if (Object.keys(vehicle).length) {
    const title = readString(vehicle.title) ?? message.content ?? "Veiculo";
    return (
      <RichMessageCard
        href={readString(vehicle.url)}
        icon={<Car aria-hidden="true" className="size-5" />}
        imageUrl={readString(vehicle.thumbnailUrl)}
        meta={[
          readString(vehicle.priceLabel),
          readString(vehicle.year),
          readString(vehicle.mileageLabel),
        ]}
        subtitle={readString(vehicle.description)}
        title={title}
      />
    );
  }

  const product = readRecord(metadata.catalogProduct);
  if (Object.keys(product).length) {
    const title =
      readString(product.productName) ?? message.content ?? "Produto";
    return (
      <RichMessageCard
        icon={<PackageSearch aria-hidden="true" className="size-5" />}
        meta={[readString(product.productId)]}
        title={title}
      />
    );
  }

  const catalog = readRecord(metadata.catalog);
  return (
    <RichMessageCard
      href={readString(catalog.catalogUrl)}
      icon={<BookOpen aria-hidden="true" className="size-5" />}
      meta={[readString(catalog.catalogPhone)]}
      subtitle={readString(catalog.message)}
      title={readString(catalog.title) ?? message.content ?? "Catalogo"}
    />
  );
}

function RichMessageCard({
  href,
  icon,
  imageUrl,
  meta,
  subtitle,
  title,
}: {
  href?: string | undefined;
  icon: ReactNode;
  imageUrl?: string | undefined;
  meta: Array<string | undefined>;
  subtitle?: string | undefined;
  title: string;
}) {
  const safeHref = sanitizeCrmMessageUrl(href);
  const safeImageUrl = sanitizeCrmMessageUrl(imageUrl);
  const metaItems = meta.filter(Boolean);
  const content = (
    <>
      {safeImageUrl ? (
        <span className="crm-rich-card-media">
          <img alt="" loading="lazy" src={safeImageUrl} />
        </span>
      ) : (
        <span className="crm-rich-card-icon">{icon}</span>
      )}
      <span className="crm-rich-card-info">
        <strong>{title}</strong>
        {subtitle ? <small>{subtitle}</small> : null}
        {metaItems.length ? (
          <small className="crm-rich-card-badges">
            {metaItems.join(" · ")}
          </small>
        ) : null}
      </span>
      {safeHref ? (
        <ExternalLink className="size-4 crm-rich-card-link-icon" />
      ) : null}
    </>
  );
  if (!safeHref) return <div className="crm-rich-card">{content}</div>;
  return (
    <a
      className="crm-rich-card"
      href={safeHref}
      rel="noreferrer"
      target="_blank"
    >
      {content}
    </a>
  );
}

function MessageCaption({
  message,
  value,
}: {
  message: CrmMessage;
  value: string;
}) {
  if (!value || value === `[${message.type.toLowerCase()}]`) return null;
  return <figcaption>{value}</figcaption>;
}

function AttachmentLink({
  href,
  icon = <Download aria-hidden="true" className="size-5" />,
  label,
  meta,
}: {
  href?: string | undefined;
  icon?: ReactNode | undefined;
  label: string;
  meta?: string | undefined;
}) {
  const safeHref = sanitizeCrmMessageUrl(href);
  const content = (
    <>
      <div className="crm-attachment-icon">{icon}</div>
      <span className="crm-attachment-body">
        <strong>{label}</strong>
        {meta ? <small>{meta}</small> : null}
      </span>
      {safeHref ? (
        <span className="crm-attachment-download" title="Baixar">
          <Download aria-hidden="true" className="size-4" />
        </span>
      ) : null}
    </>
  );
  if (!safeHref) return <div className="crm-attachment">{content}</div>;
  return (
    <a
      className="crm-attachment"
      href={safeHref}
      rel="noreferrer"
      target="_blank"
    >
      {content}
    </a>
  );
}

function locationHref(location: Record<string, unknown>) {
  const url = readString(location.url);
  if (url) return url;
  const latitude = readCoordinate(location.latitude);
  const longitude = readCoordinate(location.longitude);
  if (latitude === null || longitude === null) return undefined;
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}
