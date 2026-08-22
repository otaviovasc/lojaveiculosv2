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
} from "lucide-react";
import { AnimatedIconSwap } from "../../components/ui/AnimatedIconSwap";
import { CrmHumanAttendanceBadge } from "./CrmHumanAttendanceBadge";
import { readCrmChannelIdentity } from "./crmChannelPresentation";
import {
  formatRelativeSessionTime,
  formatCycleAvatarInitials,
  formatCycleName,
  formatCyclePreview,
} from "./crmConversationModel";
import type {
  CrmConversationCycle,
  CrmConversationCycleId,
} from "./crmConversationTypes";

export function SessionList({
  activeCycleId,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore = () => undefined,
  onSelect,
  onToggleSelected,
  selectedCycleIds,
  selectionMode,
  conversationCycles,
}: {
  activeCycleId: CrmConversationCycleId | null;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  onSelect: (cycleId: CrmConversationCycleId) => void;
  onToggleSelected: (cycleId: CrmConversationCycleId) => void;
  selectedCycleIds: string[];
  selectionMode: boolean;
  conversationCycles: CrmConversationCycle[];
}) {
  if (conversationCycles.length === 0) {
    return (
      <div className="crm-empty crm-empty-list">
        Nenhuma conversa encontrada.
      </div>
    );
  }

  return (
    <div className="crm-cycle-list" aria-label="Conversas do WhatsApp">
      {conversationCycles.map((cycle) => {
        const selected = selectedCycleIds.includes(String(cycle.id));
        const connectionName = cycle.connection?.displayName;
        const adTitle = readAdTitle(cycle);
        const avatarUrl = cycle.profilePhotoUrl;
        const ownerLabel =
          cycle.assignedMember?.name ??
          (cycle.assignedUserId ? "Atribuido" : "Sem dono");
        const channel = (cycle.channel ?? "whatsapp").toLowerCase();
        const provider = cycle.connection?.provider;
        return (
          <div
            className={[
              "crm-cycle",
              activeCycleId === cycle.id ? "crm-cycle-active" : "",
              selected ? "crm-cycle-selected" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            data-channel={channel}
            {...(provider ? { "data-provider": provider } : {})}
            key={cycle.id}
          >
            {selectionMode ? (
              <button
                aria-label={
                  selected
                    ? "Remover conversa da seleção"
                    : "Selecionar conversa"
                }
                aria-pressed={selected}
                className="crm-cycle-pick"
                onClick={() => onToggleSelected(cycle.id)}
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
              aria-current={activeCycleId === cycle.id ? "true" : undefined}
              className="crm-cycle-main"
              onClick={() =>
                selectionMode ? onToggleSelected(cycle.id) : onSelect(cycle.id)
              }
              type="button"
            >
              <span className="crm-avatar">
                {avatarUrl ? (
                  <img alt={formatCycleName(cycle)} src={avatarUrl} />
                ) : (
                  formatCycleAvatarInitials(cycle)
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="crm-cycle-top">
                  <span className="crm-cycle-heading">
                    <strong>{formatCycleName(cycle)}</strong>
                  </span>
                  <small className="crm-cycle-time">
                    {formatRelativeSessionTime(cycle.lastMessageAt)}
                  </small>
                </span>
                <span className="crm-cycle-preview-row">
                  <span className="crm-cycle-preview">
                    {cycle.customerPhone &&
                    cycle.customerPhone !== formatCycleName(cycle) ? (
                      <span className="crm-cycle-phone-inline">
                        {cycle.customerPhone} •{" "}
                      </span>
                    ) : null}
                    {formatCyclePreview(cycle)}
                  </span>
                  {(cycle.unreadCount ?? 0) > 0 ? (
                    <span className="crm-unread">{cycle.unreadCount}</span>
                  ) : null}
                </span>
                <span className="crm-cycle-meta">
                  {cycle.humanAttendanceState ? (
                    <CrmHumanAttendanceBadge cycle={cycle} />
                  ) : cycle.status !== "HUMAN_TAKEOVER" ? (
                    <SessionStatusBadge status={cycle.status} />
                  ) : null}
                  {cycle.tags?.length
                    ? cycle.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag.id}
                          className="crm-cycle-tag-chip"
                          style={{
                            backgroundColor: tag.color
                              ? `${tag.color}18`
                              : undefined,
                            color: "var(--color-text)",
                            borderColor: tag.color
                              ? `${tag.color}40`
                              : undefined,
                          }}
                        >
                          {tag.emoji ? (
                            <span className="text-xs mr-0.5">{tag.emoji}</span>
                          ) : (
                            <i
                              aria-hidden="true"
                              style={{
                                backgroundColor:
                                  tag.color ?? "var(--color-muted)",
                              }}
                            />
                          )}
                          {tag.name}
                        </span>
                      ))
                    : null}
                  {(cycle.tags?.length ?? 0) > 2 ? (
                    <span className="crm-cycle-tag-chip">
                      +{(cycle.tags?.length ?? 0) - 2}
                    </span>
                  ) : null}
                  <ChannelBadge
                    channel={cycle.channel}
                    {...(typeof cycle.metadata?.broker === "string"
                      ? { broker: cycle.metadata.broker }
                      : {})}
                    {...(cycle.connection?.provider
                      ? { provider: cycle.connection.provider }
                      : {})}
                  />
                  {cycle.vehicle?.title ? (
                    <span className="crm-cycle-chip crm-cycle-chip-wide">
                      <Car aria-hidden="true" />
                      {cycle.vehicle.title}
                    </span>
                  ) : null}
                  {adTitle ? (
                    <span className="crm-cycle-chip" title={adTitle}>
                      <Megaphone aria-hidden="true" />
                      Anúncio
                    </span>
                  ) : null}
                  <span className="crm-cycle-chip">
                    <UserPlus aria-hidden="true" />
                    {ownerLabel}
                  </span>
                </span>
              </span>
            </button>
          </div>
        );
      })}
      <div className="crm-cycle-list-footer" role="status">
        {hasMore ? (
          <button
            className="crm-load-more"
            disabled={isLoadingMore}
            onClick={onLoadMore}
            type="button"
          >
            {isLoadingMore
              ? "Carregando conversas…"
              : "Carregar mais conversas"}
          </button>
        ) : (
          <span>Todas as conversas foram carregadas.</span>
        )}
      </div>
    </div>
  );
}

function readAdTitle(cycle: CrmConversationCycle) {
  const metadata = cycle.metadata ?? {};
  if (metadata.isAdInitiated || metadata.adTitle || metadata.adSourceApp) {
    return String(metadata.adTitle ?? metadata.adSourceApp ?? "Anuncio");
  }
  return null;
}

function SessionStatusBadge({
  status,
}: {
  status: CrmConversationCycle["status"];
}) {
  if (status === "HUMAN_TAKEOVER") return null;
  const labels: Record<
    Exclude<CrmConversationCycle["status"], "HUMAN_TAKEOVER">,
    string
  > = {
    ACTIVE: "Ativo",
    COMPLETED: "Concluída",
    EXPIRED: "Expirada",
    MINIBOT_ACTIVE: "Bot ativo",
  };
  return (
    <span
      className={`crm-cycle-status crm-cycle-status-${status.toLowerCase()}`}
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

function ChannelBadge({
  broker,
  channel,
  provider,
}: {
  broker?: string;
  channel: string;
  provider?: string;
}) {
  const identity = readCrmChannelIdentity({
    channel,
    ...(broker ? { broker } : {}),
    ...(provider ? { provider } : {}),
  });
  return (
    <>
      <span
        className="crm-channel crm-cycle-chip"
        data-channel={(channel ?? "whatsapp").toLowerCase()}
      >
        {channel === "whatsapp" ? (
          <Phone aria-hidden="true" className="size-3" />
        ) : (
          <MessageCircle aria-hidden="true" className="size-3" />
        )}
        {identity.channelLabel}
      </span>
      {identity.providerLabel ? (
        <span className="crm-provider crm-cycle-chip">
          {identity.providerLabel}
        </span>
      ) : null}
      {identity.brokerLabel ? (
        <span className="crm-broker crm-cycle-chip">
          Broker: {identity.brokerLabel}
        </span>
      ) : null}
    </>
  );
}
