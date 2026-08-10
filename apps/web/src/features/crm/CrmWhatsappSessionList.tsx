import {
  Bot,
  Car,
  Check,
  Circle,
  Megaphone,
  MessageCircle,
  Phone,
  Radio,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { AnimatedIconSwap } from "../../components/ui/AnimatedIconSwap";
import { CrmWhatsappHumanAttendanceBadge } from "./CrmWhatsappHumanAttendanceBadge";
import {
  formatRelativeSessionTime,
  formatSessionName,
  formatSessionPreview,
} from "./crmWhatsappModel";
import type {
  CrmWhatsappSession,
  CrmWhatsappSessionId,
} from "./crmWhatsappTypes";

export function SessionList({
  activeSessionId,
  onSelect,
  onToggleSelected,
  selectedSessionIds,
  selectionMode,
  sessions,
}: {
  activeSessionId: CrmWhatsappSessionId | null;
  onSelect: (sessionId: CrmWhatsappSessionId) => void;
  onToggleSelected: (sessionId: CrmWhatsappSessionId) => void;
  selectedSessionIds: string[];
  selectionMode: boolean;
  sessions: CrmWhatsappSession[];
}) {
  if (sessions.length === 0) {
    return (
      <div className="crm-whatsapp-empty crm-whatsapp-empty-list">
        Nenhuma conversa encontrada.
      </div>
    );
  }

  return (
    <div
      className="crm-whatsapp-session-list"
      aria-label="Conversas do WhatsApp"
    >
      {sessions.map((session) => {
        const selected = selectedSessionIds.includes(String(session.id));
        const connectionName = session.connection?.name;
        const adTitle = readAdTitle(session);
        const avatarUrl =
          session.profilePhotoUrl ?? session.vehicle?.mainPhotoUrl;
        const ownerLabel =
          session.assignedMember?.name ??
          (session.assignedUserId ? "Atribuido" : "Sem dono");
        return (
          <div
            className={[
              "crm-whatsapp-session",
              activeSessionId === session.id
                ? "crm-whatsapp-session-active"
                : "",
              selected ? "crm-whatsapp-session-selected" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            key={session.id}
          >
            {selectionMode ? (
              <button
                aria-label={
                  selected
                    ? "Remover conversa da seleção"
                    : "Selecionar conversa"
                }
                aria-pressed={selected}
                className="crm-whatsapp-session-pick"
                onClick={() => onToggleSelected(session.id)}
                title={selected ? "Remover seleção" : "Selecionar conversa"}
                type="button"
              >
                {selected ? (
                  <AnimatedIconSwap stateKey={selected} variant="pop">
                    <Check />
                  </AnimatedIconSwap>
                ) : null}
              </button>
            ) : null}
            <button
              className="crm-whatsapp-session-main"
              onClick={() =>
                selectionMode
                  ? onToggleSelected(session.id)
                  : onSelect(session.id)
              }
              type="button"
            >
              <span className="crm-whatsapp-avatar">
                {avatarUrl ? (
                  <img alt={formatSessionName(session)} src={avatarUrl} />
                ) : (
                  <UsersRound aria-hidden="true" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="crm-whatsapp-session-top">
                  <span className="crm-whatsapp-session-heading">
                    <strong>{formatSessionName(session)}</strong>
                  </span>
                  <small className="crm-whatsapp-session-time">
                    {formatRelativeSessionTime(session.lastMessageAt)}
                  </small>
                </span>
                <span className="crm-whatsapp-session-preview-row">
                  <span className="crm-whatsapp-session-preview">
                    {session.buyerPhone &&
                    session.buyerPhone !== formatSessionName(session) ? (
                      <span className="crm-whatsapp-session-phone-inline">
                        {session.buyerPhone} •{" "}
                      </span>
                    ) : null}
                    {formatSessionPreview(session)}
                  </span>
                  {(session.unreadCount ?? 0) > 0 ? (
                    <span className="crm-unread">{session.unreadCount}</span>
                  ) : null}
                </span>
                <span className="crm-whatsapp-session-meta">
                  {session.humanAttendanceState ? (
                    <CrmWhatsappHumanAttendanceBadge session={session} />
                  ) : session.status !== "HUMAN_TAKEOVER" ? (
                    <SessionStatusBadge status={session.status} />
                  ) : null}
                  {session.sessionTags?.length
                    ? session.sessionTags.slice(0, 2).map((tag) => (
                        <span
                          key={tag.id}
                          className="crm-whatsapp-session-tag-chip"
                        >
                          <i
                            aria-hidden="true"
                            style={{
                              backgroundColor:
                                tag.color ?? "var(--color-muted)",
                            }}
                          />
                          {tag.name}
                        </span>
                      ))
                    : null}
                  {(session.sessionTags?.length ?? 0) > 2 ? (
                    <span className="crm-whatsapp-session-tag-chip">
                      +{(session.sessionTags?.length ?? 0) - 2}
                    </span>
                  ) : null}
                  <ChannelBadge channel={session.channel} />
                  {session.vehicle?.title ? (
                    <span className="crm-whatsapp-session-chip crm-whatsapp-session-chip-wide">
                      <Car aria-hidden="true" />
                      {session.vehicle.title}
                    </span>
                  ) : null}
                  {adTitle ? (
                    <span className="crm-whatsapp-session-chip" title={adTitle}>
                      <Megaphone aria-hidden="true" />
                      Anúncio
                    </span>
                  ) : null}
                  <span className="crm-whatsapp-session-chip">
                    <UserPlus aria-hidden="true" />
                    {ownerLabel}
                  </span>
                </span>
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function readAdTitle(session: CrmWhatsappSession) {
  const metadata = session.metadata ?? {};
  if (metadata.isAdInitiated || metadata.adTitle || metadata.adSourceApp) {
    return String(metadata.adTitle ?? metadata.adSourceApp ?? "Anuncio");
  }
  return null;
}

function SessionStatusBadge({
  status,
}: {
  status: CrmWhatsappSession["status"];
}) {
  if (status === "HUMAN_TAKEOVER") return null;
  const labels: Record<
    Exclude<CrmWhatsappSession["status"], "HUMAN_TAKEOVER">,
    string
  > = {
    ACTIVE: "Ativo",
    COMPLETED: "Concluída",
    EXPIRED: "Expirada",
    MINIBOT_ACTIVE: "Bot ativo",
  };
  return (
    <span
      className={`crm-whatsapp-session-status crm-whatsapp-session-status-${status.toLowerCase()}`}
    >
      {status === "MINIBOT_ACTIVE" ? (
        <Bot aria-hidden="true" />
      ) : (
        <Circle aria-hidden="true" />
      )}
      {labels[status]}
    </span>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  if (channel === "WHATSAPP") {
    return (
      <span className="crm-whatsapp-channel crm-whatsapp-session-chip">
        <Phone aria-hidden="true" className="size-3" />
        WhatsApp
      </span>
    );
  }
  return (
    <span className="crm-whatsapp-channel crm-whatsapp-session-chip">
      <MessageCircle aria-hidden="true" className="size-3" />
      {channel === "OLX_CHAT" ? "OLX Chat" : channel}
    </span>
  );
}
