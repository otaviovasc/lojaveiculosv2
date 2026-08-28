import {
  BookOpen,
  Car,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Mail,
  MapPin,
  MessageSquarePlus,
  PackageSearch,
  Phone,
  Play,
  User,
} from "lucide-react";
import type { ReactNode } from "react";
import { formatCrmPhone } from "./crmPhoneFormat";
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
    return <LocationMessageCard message={message} metadata={metadata} />;
  }

  if (message.type === "CATALOG") {
    return <CatalogLikeCard message={message} metadata={metadata} />;
  }

  if (message.type === "CONTACT") {
    return <ContactMessageCard message={message} metadata={metadata} />;
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
  const sender = readQuotedSender(replyTo);

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

function readQuotedSender(replyTo: Record<string, unknown>) {
  if (readString(replyTo.direction) !== "OUTBOUND") {
    return readString(replyTo.senderName) ?? "Contato";
  }
  if (readString(replyTo.senderType) === "AI") return "IA";
  if (readString(replyTo.senderType) === "SYSTEM") return "Sistema";
  if (readString(replyTo.senderOrigin) === "human_channel") {
    return "Enviado diretamente pelo canal";
  }
  if (readString(replyTo.senderOrigin) === "human_crm") {
    const senderUser = readRecord(replyTo.senderUser);
    return readString(senderUser.name) ?? "Usuário removido";
  }
  return "Remetente não identificado";
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

function LocationMessageCard({
  message,
  metadata,
}: {
  message: CrmMessage;
  metadata: Record<string, unknown>;
}) {
  const location = readRecord(metadata.location);
  const latitude = readCoordinate(location.latitude);
  const longitude = readCoordinate(location.longitude);
  const title =
    readString(location.name) ??
    (message.content && message.content !== "Localização"
      ? message.content
      : "Localização da loja");
  const address = readString(location.address);
  const href = locationHref(location);
  const safeHref = href ? sanitizeCrmMessageUrl(href) : undefined;
  const hasCoordinates = latitude !== null && longitude !== null;

  return (
    <div className="crm-location-card">
      {hasCoordinates ? (
        <div className="crm-location-map-wrap">
          <iframe
            className="crm-location-map-frame"
            loading="lazy"
            src={`https://www.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`}
            title={`Mapa: ${title}`}
          />
          {safeHref ? (
            <a
              aria-label="Abrir mapa no Google Maps"
              className="crm-location-map-overlay-btn"
              href={safeHref}
              rel="noreferrer"
              target="_blank"
              title="Abrir no Google Maps"
            >
              <span className="crm-location-overlay-pill">
                <ExternalLink aria-hidden="true" className="size-3.5" />
                <span>Abrir mapa</span>
              </span>
            </a>
          ) : null}
        </div>
      ) : null}
      <a
        aria-label={`${title}${address ? ` - ${address}` : ""}`}
        className="crm-location-info-row"
        href={safeHref || "#"}
        rel={safeHref ? "noreferrer" : undefined}
        target={safeHref ? "_blank" : undefined}
      >
        <div className="crm-location-pin-badge">
          <MapPin aria-hidden="true" className="size-4" />
        </div>
        <div className="crm-location-copy">
          <strong className="crm-location-title">{title}</strong>
          {address ? (
            <span className="crm-location-addr">{address}</span>
          ) : null}
        </div>
        {safeHref ? (
          <ExternalLink
            aria-hidden="true"
            className="crm-location-arrow size-4 text-muted"
          />
        ) : null}
      </a>
    </div>
  );
}

function ContactMessageCard({
  message,
  metadata,
}: {
  message: CrmMessage;
  metadata: Record<string, unknown>;
}) {
  const contact = readRecord(metadata.contact);
  const name =
    readString(contact.name) ??
    readString(contact.displayName) ??
    message.content ??
    "Contato";
  const rawPhone = readString(contact.phone) ?? readString(contact.phoneNumber);
  const formattedPhone = rawPhone ? formatCrmPhone(rawPhone) : undefined;
  const cleanPhone = rawPhone ? rawPhone.replace(/\D/g, "") : undefined;
  const organization = readString(contact.organization);
  const email = readString(contact.email);
  const avatarUrl =
    readString(contact.avatarUrl) ?? readString(contact.profilePhotoUrl);

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toLocaleUpperCase("pt-BR"))
    .join("");

  return (
    <div className="crm-contact-card">
      <div className="crm-contact-card-header">
        <div className="crm-contact-card-avatar">
          {avatarUrl ? (
            <img
              alt={name}
              className="crm-contact-avatar-img"
              src={avatarUrl}
            />
          ) : initials ? (
            <span className="crm-contact-initials">{initials}</span>
          ) : (
            <User aria-hidden="true" className="size-5" />
          )}
        </div>
        <div className="crm-contact-card-info">
          <strong className="crm-contact-card-name">{name}</strong>
          {organization ? (
            <span className="crm-contact-card-org">{organization}</span>
          ) : (
            <span className="crm-contact-card-badge">Contato</span>
          )}
        </div>
      </div>

      {formattedPhone || email ? (
        <div className="crm-contact-card-details">
          {formattedPhone ? (
            <div className="crm-contact-detail-item">
              <Phone aria-hidden="true" className="size-3.5 text-muted" />
              <span className="crm-contact-phone-text">{formattedPhone}</span>
            </div>
          ) : null}
          {email ? (
            <div className="crm-contact-detail-item">
              <Mail aria-hidden="true" className="size-3.5 text-muted" />
              <span className="crm-contact-email-text">{email}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {cleanPhone ? (
        <div className="crm-contact-card-actions">
          <button
            className="crm-contact-action-btn crm-contact-action-chat"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("crm:start-conversation", {
                  detail: { buyerName: name, phone: cleanPhone },
                }),
              );
            }}
            title="Iniciar conversa no CRM"
            type="button"
          >
            <MessageSquarePlus aria-hidden="true" className="size-3.5" />
            <span>Conversar</span>
          </button>
        </div>
      ) : null}
    </div>
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
