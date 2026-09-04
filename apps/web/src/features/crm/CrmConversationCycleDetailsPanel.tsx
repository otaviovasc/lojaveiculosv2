import {
  ArrowUpRight,
  Ban,
  Bot,
  CalendarClock,
  Car,
  Check,
  CheckCircle2,
  CircleAlert,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  FileText,
  Link2,
  Lock,
  MessageCircle,
  Radio,
  Search,
  ThumbsDown,
  Tag,
  UserCheck,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { CrmWhatsappAdAttribution } from "./CrmWhatsappAdAttribution";
import { readCrmChannelLabel } from "./crmConnectionStatus";
import { readCrmHumanAttendance } from "./crmHumanAttendance";
import { formatCycleName } from "./crmConversationModel";
import { formatCrmPhone } from "./crmPhoneFormat";
import type {
  CrmAssignableMember,
  CrmConversationCycle,
  CrmMessage,
} from "./crmConversationTypes";
import { sanitizeCrmMessageUrl } from "./crmMessageHelpers";
import { Morphicon } from "../../components/ui/Morphicon";
import { CrmMediaGalleryViewer } from "./CrmMediaGalleryViewer";
import { buildCrmGalleryMediaItems } from "./crmMediaGallery";

export function CrmConversationCycleDetailsPanel({
  assignableMembers,
  cycle,
  isOpen = true,
  messages = [],
  onClose,
}: {
  assignableMembers: CrmAssignableMember[];
  cycle: CrmConversationCycle;
  isOpen?: boolean;
  messages?: CrmMessage[];
  onClose: () => void;
}) {
  const name = formatCycleName(cycle);
  const formattedPhone = formatCrmPhone(cycle.customerPhone);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [pfpOpen, setPfpOpen] = useState(false);
  const [galleryTab, setGalleryTab] = useState<"media" | "docs" | "links">(
    "media",
  );
  const [galleryViewerIndex, setGalleryViewerIndex] = useState<number | null>(
    null,
  );
  const [muted, setMuted] = useState(false);
  const [tagEditorOpen, setTagEditorOpen] = useState(false);

  const agentName =
    cycle.assignedMember?.name ??
    assignableMembers.find(
      (member) => String(member.id) === String(cycle.assignedUserId),
    )?.name ??
    null;

  const attendance = readCrmHumanAttendance(cycle);
  const broker =
    typeof cycle.metadata?.broker === "string"
      ? readBrokerLabel(cycle.metadata.broker)
      : null;
  const attention = readAttention(cycle);

  const attendanceTitleId = useId();
  const opportunityTitleId = useId();
  const routeTitleId = useId();
  const tagsTitleId = useId();

  const handleCopyPhone = () => {
    if (formattedPhone) {
      void navigator.clipboard.writeText(formattedPhone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 1800);
    }
  };

  const storageKey = `crm:muted:${String(cycle.id)}`;
  useEffect(() => {
    try {
      setMuted(window.localStorage.getItem(storageKey) === "1");
    } catch {
      setMuted(false);
    }
  }, [storageKey]);
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    try {
      if (next) window.localStorage.setItem(storageKey, "1");
      else window.localStorage.removeItem(storageKey);
    } catch {}
    window.dispatchEvent(
      new CustomEvent("crm:toggle-mute", {
        detail: { cycleId: cycle.id, muted: next },
      }),
    );
  };

  const shortId =
    String(cycle.id).length > 12
      ? `${String(cycle.id).slice(0, 12)}…`
      : String(cycle.id);
  const presenceLabel = muted
    ? "Silenciado · toque para gerenciar"
    : cycle.status === "HUMAN_TAKEOVER"
      ? "Em atendimento humano"
      : cycle.unreadCount
        ? `${cycle.unreadCount} mensagens não lidas`
        : "Toque para ver informações do contato";

  const galleryMedia = useMemo(
    () => buildCrmGalleryMediaItems(messages),
    [messages],
  );
  const gallery = useMemo(() => {
    const docs: { url: string; name?: string }[] = [];
    const links: { url: string; label: string }[] = [];
    for (const msg of messages) {
      const mediaUrl = sanitizeCrmMessageUrl(msg.mediaUrl);
      if (mediaUrl) {
        if (msg.type === "DOCUMENT") {
          const meta = (msg.metadata as Record<string, unknown> | undefined)
            ?.media as Record<string, unknown> | undefined;
          const name =
            typeof meta?.fileName === "string" ? meta.fileName : undefined;
          if (name === undefined) {
            docs.push({ url: mediaUrl });
          } else {
            docs.push({ url: mediaUrl, name });
          }
        } else if (
          msg.type !== "IMAGE" &&
          msg.type !== "VIDEO" &&
          msg.type !== "STICKER"
        ) {
          docs.push({ url: mediaUrl });
        }
      }
      if (
        msg.type === "LOCATION" ||
        msg.type === "CATALOG" ||
        msg.type === "CONTACT"
      ) {
        const loc = (msg.metadata as Record<string, unknown> | undefined)
          ?.location as Record<string, unknown> | undefined;
        const url =
          (typeof loc?.url === "string" ? loc.url : undefined) ??
          sanitizeCrmMessageUrl(mediaUrl ?? undefined);
        links.push({
          url: url ?? mediaUrl ?? "#",
          label:
            msg.type === "LOCATION"
              ? "Localização"
              : msg.type === "CATALOG"
                ? "Catálogo"
                : "Contato",
        });
      }
      // detect http links inside text content
      const textLinks = msg.content.match(/https?:\/\/[^\s]+/g);
      if (textLinks) {
        for (const l of textLinks) {
          const clean = sanitizeCrmMessageUrl(l);
          if (clean) links.push({ url: clean, label: clean });
        }
      }
    }
    return { docs, links };
  }, [messages]);

  return (
    <aside
      aria-hidden={isOpen ? undefined : true}
      aria-label="Detalhes da conversa"
      className="crm-details-panel"
      data-open={isOpen ? "true" : "false"}
      inert={!isOpen ? true : undefined}
      tabIndex={-1}
    >
      {/* WhatsApp-like Hero */}
      <header className="crm-details-wa-hero">
        <div className="crm-details-wa-hero-top">
          <button
            aria-label="Fechar detalhes"
            className="crm-icon-action crm-details-close-btn"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="crm-details-wa-hero-body">
          <button
            aria-label={
              cycle.profilePhotoUrl
                ? "Ampliar foto do contato"
                : "Foto do contato"
            }
            className="crm-avatar-wa-btn"
            disabled={!cycle.profilePhotoUrl}
            onClick={() => cycle.profilePhotoUrl && setPfpOpen(true)}
            type="button"
          >
            <span className="crm-avatar crm-avatar-wa">
              {cycle.profilePhotoUrl ? (
                <img alt={name} src={cycle.profilePhotoUrl} />
              ) : (
                name.slice(0, 2).toUpperCase()
              )}
            </span>
            {cycle.profilePhotoUrl ? (
              <span className="crm-avatar-wa-zoom" aria-hidden="true">
                <Search className="size-3.5" />
              </span>
            ) : null}
          </button>
          <strong className="crm-details-wa-name">{name}</strong>
          {formattedPhone && formattedPhone !== name ? (
            <div className="crm-details-phone-row crm-details-wa-phone-row">
              <span className="crm-details-phone">{formattedPhone}</span>
              <button
                aria-label="Copiar telefone"
                className="crm-details-copy-phone"
                onClick={handleCopyPhone}
                title="Copiar telefone"
                type="button"
              >
                {copiedPhone ? (
                  <Check className="size-3 text-emerald-500" />
                ) : (
                  <Copy className="size-3" />
                )}
              </button>
            </div>
          ) : null}
          <span className="crm-details-wa-presence">{presenceLabel}</span>
        </div>
        <div className="crm-details-wa-actions">
          <button
            aria-pressed={muted}
            className={`crm-details-wa-action crm-details-wa-action--interactive${muted ? " is-muted" : ""}`}
            onClick={toggleMute}
            type="button"
          >
            <Morphicon
              className="size-4"
              name="volume-mute"
              active={muted}
              size={16}
            />
            <small>{muted ? "Ativar som" : "Silenciar"}</small>
          </button>
          <button
            className="crm-details-wa-action crm-details-wa-action--interactive"
            onClick={() => {
              onClose();
              window.dispatchEvent(new CustomEvent("crm:open-header-search"));
            }}
            type="button"
          >
            <Morphicon
              className="size-4"
              name="search-close"
              active={false}
              size={16}
            />
            <small>Pesquisar</small>
          </button>
          <button
            aria-expanded={tagEditorOpen}
            aria-pressed={tagEditorOpen}
            className={`crm-details-wa-action crm-details-wa-action--interactive${tagEditorOpen ? " is-active" : ""}`}
            onClick={() => setTagEditorOpen((v) => !v)}
            type="button"
          >
            <Tag className="size-4" />
            <small>Etiquetar</small>
          </button>
        </div>
        {tagEditorOpen ? (
          <div className="crm-details-wa-tag-editor">
            <p className="crm-details-muted text-xs">
              Gerencie marcadores em{" "}
              <span className="font-semibold text-[var(--color-text)]">
                Fila → filtros
              </span>{" "}
              ou selecione abaixo para alternar nesta conversa.
            </p>
            <div className="crm-details-tags-wrap">
              {cycle.tags?.length ? (
                cycle.tags.map((tag) => (
                  <button
                    key={tag.id}
                    className="crm-cycle-tag-chip crm-cycle-tag-chip--interactive"
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent("crm:toggle-tag", {
                          detail: { cycleId: cycle.id, tagId: tag.id },
                        }),
                      )
                    }
                    style={{
                      backgroundColor: tag.color
                        ? `color-mix(in srgb, ${tag.color} 14%, var(--color-panel))`
                        : undefined,
                      color: "var(--color-text)",
                      borderColor: tag.color
                        ? `color-mix(in srgb, ${tag.color} 28%, var(--color-line))`
                        : undefined,
                    }}
                    type="button"
                  >
                    {tag.emoji ? (
                      <span className="text-xs mr-0.5">{tag.emoji}</span>
                    ) : (
                      <i
                        aria-hidden="true"
                        style={{
                          backgroundColor: tag.color ?? "var(--color-muted)",
                        }}
                      />
                    )}
                    {tag.name}
                    <X className="size-3 ml-1 opacity-60" />
                  </button>
                ))
              ) : (
                <span className="crm-details-muted text-xs">
                  Nenhum marcador nesta conversa.
                </span>
              )}
            </div>
          </div>
        ) : null}
      </header>

      <div className="crm-details-wa-body">
        {/* Atendimento Card */}
        <section
          aria-labelledby={attendanceTitleId}
          className="crm-details-section"
        >
          <h2 id={attendanceTitleId} className="crm-details-section-title">
            Atendimento
          </h2>
          <div className="crm-details-card">
            <DetailRow
              emphasis={attention.requiresAction}
              icon={
                attention.requiresAction ? (
                  <CircleAlert className="size-3.5 text-amber-500" />
                ) : (
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                )
              }
              label="Atenção"
              value={
                <span
                  className={
                    attention.requiresAction
                      ? "crm-details-badge crm-details-badge-warning"
                      : "crm-details-badge crm-details-badge-neutral"
                  }
                >
                  {attention.label}
                </span>
              }
            />
            <DetailRow
              icon={<UserRound className="size-3.5 text-muted" />}
              label="Atendente"
              value={
                agentName ? (
                  <span className="crm-details-badge crm-details-badge-primary">
                    <UserCheck className="size-3 mr-1" />
                    {agentName}
                  </span>
                ) : (
                  <span className="crm-details-muted">Sem responsável</span>
                )
              }
            />
            <DetailRow
              icon={<Tag className="size-3.5 text-muted" />}
              label="Estado"
              value={
                <span className="crm-details-badge crm-details-badge-neutral">
                  {attendance?.label ?? statusLabel(cycle.status)}
                </span>
              }
            />
            <DetailRow
              icon={<CalendarClock className="size-3.5 text-muted" />}
              label="Última mensagem"
              value={formatDate(cycle.lastMessageAt)}
            />
          </div>
        </section>

        {/* Oportunidade / Veículo Card — only when linked */}
        {cycle.leadId ? (
          <section
            aria-labelledby={opportunityTitleId}
            className="crm-details-section"
          >
            <h2 id={opportunityTitleId} className="crm-details-section-title">
              Oportunidade
            </h2>
            <a
              className="crm-details-lead-card"
              href={`#/crm?surface=leads&leadId=${encodeURIComponent(cycle.leadId)}`}
              onClick={(e) => {
                e.preventDefault();
                window.location.hash = `#/crm?surface=leads&leadId=${encodeURIComponent(cycle.leadId ?? "")}`;
                window.dispatchEvent(
                  new CustomEvent("crm:open-lead", {
                    detail: { leadId: cycle.leadId },
                  }),
                );
              }}
            >
              <div className="crm-details-lead-icon">
                <Car className="size-5 text-emerald-500" />
              </div>
              <div className="crm-details-lead-body min-w-0 flex-1">
                <small>Lead vinculado</small>
                <strong>{cycle.vehicle?.title ?? "Abrir oportunidade"}</strong>
              </div>
              <ArrowUpRight className="size-4 text-muted shrink-0" />
            </a>
          </section>
        ) : null}

        {/* Rota da Conversa Card */}
        <section aria-labelledby={routeTitleId} className="crm-details-section">
          <h2 id={routeTitleId} className="crm-details-section-title">
            Rota da conversa
          </h2>
          <div className="crm-details-card">
            <DetailRow
              icon={<MessageCircle className="size-3.5 text-emerald-500" />}
              label="Canal"
              value={
                <span className="crm-details-badge crm-details-badge-emerald">
                  {readCrmChannelLabel(cycle.channel)}
                </span>
              }
            />
            <DetailRow
              icon={<Radio className="size-3.5 text-muted" />}
              label="Transporte"
              value={readTransportLabel(cycle.connection?.provider)}
            />
            <DetailRow label="Broker" value={broker ?? "Direto"} />
            <DetailRow
              label="Conexão"
              value={cycle.connection?.displayName ?? "WhatsApp padrão"}
            />
          </div>
        </section>

        <CrmWhatsappAdAttribution metadata={cycle.metadata} />

        {/* Marcadores / Tags */}
        {cycle.tags?.length ? (
          <section
            aria-labelledby={tagsTitleId}
            className="crm-details-section"
          >
            <h2 id={tagsTitleId} className="crm-details-section-title">
              Marcadores
            </h2>
            <div className="crm-details-tags-wrap">
              {cycle.tags.map((tag) => (
                <span
                  className="crm-cycle-tag-chip"
                  key={tag.id}
                  style={{
                    backgroundColor: tag.color
                      ? `color-mix(in srgb, ${tag.color} 14%, var(--color-panel))`
                      : undefined,
                    color: "var(--color-text)",
                    borderColor: tag.color
                      ? `color-mix(in srgb, ${tag.color} 28%, var(--color-line))`
                      : undefined,
                  }}
                >
                  {tag.emoji ? (
                    <span className="text-xs mr-0.5">{tag.emoji}</span>
                  ) : (
                    <i
                      aria-hidden="true"
                      style={{
                        backgroundColor: tag.color ?? "var(--color-muted)",
                      }}
                    />
                  )}
                  {tag.name}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {/* WhatsApp extra: Midia / Links / Docs — real counts + drill-down */}
        <section className="crm-details-section">
          <h2 className="crm-details-section-title">Mídia, links e docs</h2>
          <div className="crm-details-wa-media-grid">
            <button
              className="crm-details-wa-media-item crm-details-wa-media-item--interactive"
              onClick={() => setGalleryTab("media")}
              type="button"
              aria-label={`Ver mídia: ${galleryMedia.length} itens`}
            >
              <ImageIcon className="size-4" />
              <small>{galleryMedia.length}</small>
              <span>mídia</span>
            </button>
            <button
              className="crm-details-wa-media-item crm-details-wa-media-item--interactive"
              onClick={() => setGalleryTab("links")}
              type="button"
              aria-label={`Ver links: ${gallery.links.length} itens`}
            >
              <Link2 className="size-4" />
              <small>{gallery.links.length}</small>
              <span>links</span>
            </button>
            <button
              className="crm-details-wa-media-item crm-details-wa-media-item--interactive"
              onClick={() => setGalleryTab("docs")}
              type="button"
              aria-label={`Ver documentos: ${gallery.docs.length} itens`}
            >
              <FileText className="size-4" />
              <small>{gallery.docs.length}</small>
              <span>docs</span>
            </button>
          </div>
          {/* Drill-down preview */}
          {galleryTab === "media" && galleryMedia.length > 0 ? (
            <div className="crm-details-gallery-preview">
              {galleryMedia.slice(0, 6).map((item, index) => (
                <button
                  aria-label={`Abrir mídia ${index + 1}`}
                  key={`${item.url}-${index}`}
                  className="crm-details-gallery-thumb"
                  onClick={() => setGalleryViewerIndex(index)}
                  type="button"
                >
                  {item.type === "VIDEO" ? (
                    <video src={item.url} muted preload="metadata" />
                  ) : (
                    <img alt={item.caption ?? "mídia"} src={item.url} />
                  )}
                </button>
              ))}
              {galleryMedia.length > 6 ? (
                <span className="crm-details-gallery-more">
                  +{galleryMedia.length - 6}
                </span>
              ) : null}
            </div>
          ) : null}
          {galleryTab === "docs" && gallery.docs.length > 0 ? (
            <div className="crm-details-gallery-list">
              {gallery.docs.slice(0, 4).map((doc) => (
                <a
                  key={doc.url}
                  className="crm-details-gallery-doc"
                  href={doc.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <FileText className="size-3.5 shrink-0" />
                  <span>
                    {doc.name ??
                      new URL(doc.url).pathname.split("/").pop() ??
                      "Documento"}
                  </span>
                  <ExternalLink className="size-3 text-muted" />
                </a>
              ))}
              {gallery.docs.length > 4 ? (
                <small className="text-muted">
                  +{gallery.docs.length - 4} documentos
                </small>
              ) : null}
            </div>
          ) : null}
          {galleryTab === "links" && gallery.links.length > 0 ? (
            <div className="crm-details-gallery-list">
              {gallery.links.slice(0, 4).map((link) => (
                <a
                  key={link.url}
                  className="crm-details-gallery-doc"
                  href={link.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Link2 className="size-3.5 shrink-0" />
                  <span className="truncate">{link.label}</span>
                  <ExternalLink className="size-3 text-muted shrink-0" />
                </a>
              ))}
              {gallery.links.length > 4 ? (
                <small className="text-muted">
                  +{gallery.links.length - 4} links
                </small>
              ) : null}
            </div>
          ) : null}
          {galleryMedia.length === 0 &&
          gallery.docs.length === 0 &&
          gallery.links.length === 0 ? (
            <p className="crm-details-muted text-xs mt-1">
              Nenhuma mídia ainda. Arquivos e links compartilhados aparecerão
              aqui.
            </p>
          ) : null}
        </section>

        {/* Criptografia */}
        <section className="crm-details-section">
          <div className="crm-details-wa-encryption">
            <Lock className="size-4 shrink-0 text-muted" />
            <p>
              Mensagens e chamadas são protegidas com criptografia de ponta a
              ponta. Toque para confirmar.
            </p>
          </div>
        </section>

        {/* Dados extras da conversa */}
        <section className="crm-details-section">
          <h2 className="crm-details-section-title">Dados da conversa</h2>
          <div className="crm-details-card">
            <DetailRow label="ID" value={shortId} />
            <DetailRow
              label="Criada em"
              value={
                cycle.lastMessageAt ? formatDate(cycle.lastMessageAt) : "—"
              }
            />
            <DetailRow
              label="Conexão"
              value={
                cycle.connection?.id
                  ? String(cycle.connection.id).slice(0, 10) + "…"
                  : "—"
              }
            />
          </div>
        </section>

        {/* Ações secundárias estilo WhatsApp — now wired */}
        <section className="crm-details-section crm-details-wa-danger">
          <button
            className="crm-details-wa-danger-row"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("crm:block-contact", {
                  detail: { cycleId: cycle.id },
                }),
              );
            }}
            type="button"
          >
            <Ban className="size-4" />
            Bloquear contato
          </button>
          <button
            className="crm-details-wa-danger-row crm-details-wa-danger-row--alert"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("crm:report-contact", {
                  detail: { cycleId: cycle.id },
                }),
              );
            }}
            type="button"
          >
            <ThumbsDown className="size-4" />
            Denunciar contato
          </button>
        </section>
      </div>
      {/* PFP Lightbox */}
      {pfpOpen && cycle.profilePhotoUrl ? (
        <button
          aria-label="Fechar foto ampliada"
          className="crm-pfp-lightbox"
          onClick={() => setPfpOpen(false)}
          type="button"
        >
          <img alt={name} src={cycle.profilePhotoUrl} />
        </button>
      ) : null}
      <CrmMediaGalleryViewer
        initialIndex={galleryViewerIndex ?? 0}
        isOpen={galleryViewerIndex !== null}
        mediaList={galleryMedia}
        onClose={() => setGalleryViewerIndex(null)}
      />
    </aside>
  );
}

function DetailRow({
  emphasis = false,
  icon,
  label,
  value,
}: {
  emphasis?: boolean;
  icon?: ReactNode;
  label: string;
  value?: ReactNode | string | null;
}) {
  return (
    <div
      className="crm-details-row"
      data-emphasis={emphasis ? "action" : undefined}
    >
      <dt className="crm-details-dt">
        {icon ? (
          <span aria-hidden="true" className="shrink-0">
            {icon}
          </span>
        ) : null}
        <span>{label}</span>
      </dt>
      <dd className="crm-details-dd">{value || "-"}</dd>
    </div>
  );
}

function readAttention(cycle: CrmConversationCycle) {
  if (cycle.humanAttendanceState === "WAITING_HUMAN") {
    return { label: "Resposta humana necessária", requiresAction: true };
  }
  if ((cycle.unreadCount ?? 0) > 0) {
    const count = cycle.unreadCount ?? 0;
    return {
      label: `${count} ${count === 1 ? "não lida" : "não lidas"}`,
      requiresAction: true,
    };
  }
  return { label: "Sem pendências imediatas", requiresAction: false };
}

function readTransportLabel(provider?: string | null) {
  switch (provider) {
    case "meta_cloud":
      return "Meta Cloud";
    case "olx":
    case "olx_chat":
      return "OLX Chat";
    case "zapi":
      return "Z-API";
    case null:
    case undefined:
    default:
      return "Meta Cloud";
  }
}

function readBrokerLabel(broker: string) {
  switch (broker.trim().toLowerCase()) {
    case "composio":
      return "Composio";
    case "direct":
      return "Direto";
    default:
      return null;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString([], { dateStyle: "short", timeStyle: "short" });
}

function statusLabel(status: string) {
  if (status === "HUMAN_TAKEOVER") return "-";
  if (status === "MINIBOT_ACTIVE") return "Minibot ativo";
  if (status === "COMPLETED") return "Concluída";
  if (status === "EXPIRED") return "Expirada";
  return "Ativa";
}
