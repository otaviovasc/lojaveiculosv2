import {
  Archive,
  ArchiveRestore,
  Bell,
  BellOff,
  Bot,
  Car,
  Check,
  ChevronDown,
  Circle,
  MailCheck,
  MailOpen,
  Megaphone,
  MessageCircle,
  Phone,
  Pin,
  PinOff,
  Radio,
  RotateCw,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useRef, useState } from "react";
import { AnimatedIconSwap } from "../../components/ui/AnimatedIconSwap";
import { FeatureAnchoredPopover } from "../../components/ui/FeaturePopover";
import { CrmHumanAttendanceBadge } from "./CrmHumanAttendanceBadge";
import { readCrmChannelIdentity } from "./crmChannelPresentation";
import { formatCrmPhone } from "./crmPhoneFormat";
import { usePullToRefresh } from "../../lib/usePullToRefresh";
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
  onArchive,
  onDelete,
  onLoadMore = () => undefined,
  onMute,
  onPin,
  onRefresh,
  onSelect,
  onToggleRead,
  onToggleSelected,
  selectedCycleIds,
  selectionMode,
  conversationCycles,
}: {
  activeCycleId: CrmConversationCycleId | null;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onArchive?: (cycleId: CrmConversationCycleId) => void;
  onDelete?: (cycleId: CrmConversationCycleId) => void;
  onLoadMore?: () => void;
  onMute?: (cycleId: CrmConversationCycleId) => void;
  onPin?: (cycleId: CrmConversationCycleId) => void;
  onRefresh?: () => void | Promise<unknown>;
  onSelect: (cycleId: CrmConversationCycleId) => void;
  onToggleRead?: (cycle: CrmConversationCycle) => void;
  onToggleSelected: (cycleId: CrmConversationCycleId) => void;
  selectedCycleIds: string[];
  selectionMode: boolean;
  conversationCycles: CrmConversationCycle[];
}) {
  const { containerRef, pullDistance, isRefreshing, isTriggerReady } =
    usePullToRefresh<HTMLDivElement>({
      onRefresh: onRefresh ?? (() => undefined),
      disabled: !onRefresh,
    });

  if (conversationCycles.length === 0) {
    return (
      <div className="crm-empty crm-empty-list">
        Nenhuma conversa encontrada.
      </div>
    );
  }

  return (
    <div
      className="crm-cycle-list"
      aria-label="Conversas do WhatsApp"
      ref={containerRef}
    >
      {pullDistance > 0 || isRefreshing ? (
        <div
          className="crm-pull-refresh-indicator"
          style={{
            height: `${pullDistance}px`,
            opacity: Math.min(1, pullDistance / 24),
          }}
        >
          <div
            className={`crm-pull-refresh-bubble ${
              isTriggerReady || isRefreshing ? "crm-pull-ready" : ""
            }`}
          >
            <RotateCw
              className={
                isRefreshing
                  ? "size-3.5 animate-spin text-emerald-500"
                  : "size-3.5 text-muted"
              }
              style={{
                transform: isRefreshing
                  ? undefined
                  : `rotate(${Math.min(360, (pullDistance / 52) * 220)}deg)`,
              }}
            />
            <span>
              {isRefreshing
                ? "Atualizando…"
                : isTriggerReady
                  ? "Solte para atualizar"
                  : "Puxe para atualizar"}
            </span>
          </div>
        </div>
      ) : null}
      {conversationCycles.map((cycle) => {
        const selected = selectedCycleIds.includes(String(cycle.id));
        const connectionName = cycle.connection?.displayName;
        const adTitle = readAdTitle(cycle);
        const avatarUrl = cycle.profilePhotoUrl;
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
                    {cycle.customerPhone &&
                    formatCrmPhone(cycle.customerPhone) !==
                      formatCycleName(cycle) ? (
                      <span className="crm-cycle-phone-pill">
                        {formatCrmPhone(cycle.customerPhone)}
                      </span>
                    ) : null}
                  </span>
                  <small className="crm-cycle-time">
                    {formatRelativeSessionTime(cycle.lastMessageAt)}
                  </small>
                </span>
                <span className="crm-cycle-preview-row">
                  <span className="crm-cycle-preview">
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
                  {cycle.assignedMember?.name ? (
                    <span
                      className="crm-cycle-chip"
                      title={`Atribuído a ${cycle.assignedMember.name}`}
                    >
                      <UserPlus aria-hidden="true" />
                      {cycle.assignedMember.name}
                    </span>
                  ) : null}
                </span>
              </span>
            </button>
            <CrmCycleHoverMenu
              cycle={cycle}
              onArchive={onArchive}
              onDelete={onDelete}
              onMute={onMute}
              onPin={onPin}
              onToggleRead={onToggleRead}
            />
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
            {isLoadingMore ? (
              <>
                <RotateCw className="size-3.5 animate-spin mr-1.5" />
                <span>Carregando conversas…</span>
              </>
            ) : (
              <span>Carregar mais conversas</span>
            )}
          </button>
        ) : (
          <div className="crm-cycle-list-end">
            <span className="crm-cycle-list-end-line" />
            <div className="crm-cycle-list-end-badge">
              <Check className="size-3 text-emerald-500" />
              <span>Todas as conversas carregadas</span>
            </div>
            <span className="crm-cycle-list-end-line" />
          </div>
        )}
      </div>
    </div>
  );
}

function CrmCycleHoverMenu({
  cycle,
  onArchive,
  onDelete,
  onMute,
  onPin,
  onToggleRead,
}: {
  cycle: CrmConversationCycle;
  onArchive?: ((cycleId: CrmConversationCycleId) => void) | undefined;
  onDelete?: ((cycleId: CrmConversationCycleId) => void) | undefined;
  onMute?: ((cycleId: CrmConversationCycleId) => void) | undefined;
  onPin?: ((cycleId: CrmConversationCycleId) => void) | undefined;
  onToggleRead?: ((cycle: CrmConversationCycle) => void) | undefined;
}) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isArchived, setIsArchived] = useState(false);

  return (
    <span className="crm-cycle-action-anchor" data-prevent-drag="true">
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Opções da conversa"
        className="crm-cycle-menu-btn"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        ref={anchorRef}
        title="Opções da conversa"
        type="button"
      >
        <ChevronDown className="size-3.5" />
      </button>
      <FeatureAnchoredPopover
        align="end"
        anchorRef={anchorRef}
        ariaLabel="Opções da conversa"
        className="crm-context-popover"
        initialFocus="first"
        isOpen={open}
        onClose={() => setOpen(false)}
        role="menu"
      >
        <div className="crm-context-menu" role="none">
          <button
            className="crm-context-menu-item"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              setIsArchived((prev) => !prev);
              onArchive?.(cycle.id);
            }}
            role="menuitem"
            type="button"
          >
            {isArchived ? (
              <ArchiveRestore className="size-4 text-muted shrink-0" />
            ) : (
              <Archive className="size-4 text-muted shrink-0" />
            )}
            <span>
              {isArchived ? "Desarquivar conversa" : "Arquivar conversa"}
            </span>
          </button>

          <button
            className="crm-context-menu-item"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              setIsMuted((prev) => !prev);
              onMute?.(cycle.id);
            }}
            role="menuitem"
            type="button"
          >
            {isMuted ? (
              <Bell className="size-4 text-muted shrink-0" />
            ) : (
              <BellOff className="size-4 text-muted shrink-0" />
            )}
            <span>
              {isMuted ? "Ativar notificações" : "Silenciar notificações"}
            </span>
          </button>

          <button
            className="crm-context-menu-item"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              setIsPinned((prev) => !prev);
              onPin?.(cycle.id);
            }}
            role="menuitem"
            type="button"
          >
            {isPinned ? (
              <PinOff className="size-4 text-muted shrink-0" />
            ) : (
              <Pin className="size-4 text-muted shrink-0" />
            )}
            <span>{isPinned ? "Desafixar conversa" : "Fixar conversa"}</span>
          </button>

          <button
            className="crm-context-menu-item"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onToggleRead?.(cycle);
            }}
            role="menuitem"
            type="button"
          >
            {(cycle.unreadCount ?? 0) > 0 ? (
              <MailCheck className="size-4 text-muted shrink-0" />
            ) : (
              <MailOpen className="size-4 text-muted shrink-0" />
            )}
            <span>
              {(cycle.unreadCount ?? 0) > 0
                ? "Marcar como lida"
                : "Marcar como não lida"}
            </span>
          </button>

          <div className="crm-context-menu-divider" role="separator" />

          <button
            className="crm-context-menu-item crm-context-menu-item-danger"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onDelete?.(cycle.id);
            }}
            role="menuitem"
            type="button"
          >
            <Trash2 className="size-4 text-red-500 shrink-0" />
            <span>Excluir conversa</span>
          </button>
        </div>
      </FeatureAnchoredPopover>
    </span>
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
  const label = identity.providerLabel ?? identity.channelLabel;
  return (
    <span
      className="crm-channel crm-cycle-chip"
      data-channel={(channel ?? "whatsapp").toLowerCase()}
    >
      {channel === "whatsapp" ? (
        <Phone aria-hidden="true" className="size-3" />
      ) : (
        <MessageCircle aria-hidden="true" className="size-3" />
      )}
      {label}
    </span>
  );
}
