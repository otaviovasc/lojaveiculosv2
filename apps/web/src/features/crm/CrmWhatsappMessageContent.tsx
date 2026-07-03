import {
  BookOpen,
  Car,
  Contact,
  Download,
  FileText,
  MapPin,
  PackageSearch,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  readCoordinate,
  readOptionalHref,
  readOptionalMeta,
  readRecord,
  readString,
} from "./crmWhatsappMessageHelpers";
import type { CrmWhatsappMessage } from "./crmWhatsappTypes";

export function MessageContent({ message }: { message: CrmWhatsappMessage }) {
  if (message.deletedAt) return <em>Esta mensagem foi apagada</em>;
  const metadata = readRecord(message.metadata);
  const media = readRecord(metadata.media);
  const caption = readString(media.caption) ?? message.content;

  if (message.mediaUrl && message.type === "IMAGE") {
    return (
      <figure className="crm-whatsapp-media">
        <img alt={caption || "Imagem enviada"} src={message.mediaUrl} />
        <MessageCaption message={message} value={caption} />
      </figure>
    );
  }
  if (message.mediaUrl && message.type === "STICKER") {
    return (
      <figure className="crm-whatsapp-media crm-whatsapp-sticker">
        <img alt={caption || "Figurinha enviada"} src={message.mediaUrl} />
      </figure>
    );
  }
  if (message.mediaUrl && message.type === "VIDEO") {
    return (
      <figure className="crm-whatsapp-media">
        <video controls src={message.mediaUrl} />
        <MessageCaption message={message} value={caption} />
      </figure>
    );
  }
  if (message.mediaUrl && message.type === "AUDIO") {
    return (
      <div className="crm-whatsapp-audio">
        <audio controls src={message.mediaUrl} />
      </div>
    );
  }
  if (message.mediaUrl && message.type === "DOCUMENT") {
    const fileName = readString(media.fileName) ?? message.content;
    return (
      <AttachmentLink
        href={message.mediaUrl}
        icon={<FileText aria-hidden="true" className="size-5" />}
        label={fileName || "Documento"}
        {...readOptionalMeta(readString(media.mimeType))}
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
    return (
      <div className="crm-whatsapp-attachment">
        <Contact aria-hidden="true" className="size-5" />
        <span>
          <strong>{message.content || "Contato"}</strong>
          {readString(contact.phone) ? (
            <small>{readString(contact.phone)}</small>
          ) : null}
        </span>
      </div>
    );
  }
  if (message.mediaUrl) {
    return <AttachmentLink href={message.mediaUrl} label="Abrir anexo" />;
  }
  return <p>{message.content}</p>;
}

export function QuotedMessage({
  metadata,
}: {
  metadata?: Record<string, unknown> | undefined;
}) {
  const replyTo = readRecord(readRecord(metadata).replyTo);
  if (!Object.keys(replyTo).length) return null;
  const content = readString(replyTo.content) ?? "Mensagem";
  const sender =
    readString(replyTo.senderName) ??
    (readString(replyTo.direction) === "OUTBOUND" ? "Atendente" : "Contato");
  return (
    <div className="crm-whatsapp-quoted-message">
      <strong>{sender}</strong>
      <span>{content}</span>
    </div>
  );
}

function CatalogLikeCard({
  message,
  metadata,
}: {
  message: CrmWhatsappMessage;
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
  const content = (
    <>
      {imageUrl ? (
        <span className="crm-whatsapp-rich-card-media">
          <img alt="" src={imageUrl} />
        </span>
      ) : (
        <span className="crm-whatsapp-rich-card-icon">{icon}</span>
      )}
      <span>
        <strong>{title}</strong>
        {subtitle ? <small>{subtitle}</small> : null}
        {meta.filter(Boolean).length ? (
          <small>{meta.filter(Boolean).join(" · ")}</small>
        ) : null}
      </span>
    </>
  );
  if (!href) return <div className="crm-whatsapp-rich-card">{content}</div>;
  return (
    <a
      className="crm-whatsapp-rich-card"
      href={href}
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
  message: CrmWhatsappMessage;
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
  const content = (
    <>
      {icon}
      <span>
        <strong>{label}</strong>
        {meta ? <small>{meta}</small> : null}
      </span>
    </>
  );
  if (!href) return <div className="crm-whatsapp-attachment">{content}</div>;
  return (
    <a
      className="crm-whatsapp-attachment"
      href={href}
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
