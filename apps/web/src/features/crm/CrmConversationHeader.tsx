import {
  ArrowLeft,
  Bot,
  CalendarClock,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  EllipsisVertical,
  ExternalLink,
  MailCheck,
  MailOpen,
  Search,
  Sparkles,
  Tag,
  UserCheck,
  UserRound,
  Wand2,
  X,
} from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FeatureAnchoredPopover } from "../../components/ui/FeaturePopover";
import { ChatAssignmentSelect } from "./CrmConversationHeaderAssignment";
import {
  formatCycleAvatarInitials,
  formatCycleName,
} from "./crmConversationModel";
import { formatCrmPhone } from "./crmPhoneFormat";
import { TagMenu } from "./CrmTagMenu";
import type {
  CrmAddConversationCycleTagInput,
  CrmAssignableMember,
  CrmContactPresence,
  CrmConversationCycle,
  CrmTag,
} from "./crmConversationTypes";

export function ChatHeader({
  actionsDisabled,
  assignableMembers,
  availableTags,
  canAssignSession,
  canCloseSession,
  canMarkRead,
  canTagSessions,
  canScheduleMessages,
  canToggleIntervention,
  currentUserId,
  contactPresence,
  messages = [],
  onAssign,
  onBack,
  onClose,
  onAddTag,
  onInsertPrompt,
  onMarkRead,
  onMarkUnread,
  onOpenDetails,
  onRemoveTag,
  onScheduleMessage,
  onToggleIntervention,
  pendingActions,
  cycle,
}: {
  actionsDisabled?: boolean;
  assignableMembers: CrmAssignableMember[];
  availableTags?: CrmTag[];
  canAssignSession: boolean;
  canCloseSession: boolean;
  canMarkRead: boolean;
  canTagSessions: boolean;
  canScheduleMessages: boolean;
  canToggleIntervention: boolean;
  currentUserId?: string | null;
  contactPresence?: CrmContactPresence | null;
  messages?: { id: string; content: string }[];
  onAddTag: (input: CrmAddConversationCycleTagInput) => Promise<boolean>;
  onAssign: (agentId: string | null) => void;
  onBack?: () => void;
  onClose: () => void;
  onInsertPrompt?: (text: string) => void;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onOpenDetails: () => void;
  onRemoveTag: (tagId: string) => Promise<boolean>;
  onScheduleMessage: () => void;
  onToggleIntervention: () => void;
  pendingActions?: Partial<
    Record<"assign" | "intervention" | "read" | "tag", boolean>
  >;
  cycle: CrmConversationCycle;
}) {
  const identityButtonRef = useRef<HTMLButtonElement>(null);
  const moreActionsButtonRef = useRef<HTMLButtonElement>(null);
  const promptButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const restoreStableFocusRef = useRef(false);
  const tagButtonRef = useRef<HTMLButtonElement>(null);
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [headerSearchOpen, setHeaderSearchOpen] = useState(false);
  const [headerQuery, setHeaderQuery] = useState("");
  const [headerIdx, setHeaderIdx] = useState(0);
  const [tagMenuSource, setTagMenuSource] = useState<"desktop" | "mobile">(
    "desktop",
  );
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  void onRemoveTag;

  const headerResults = useMemo(() => {
    const q = headerQuery.trim().toLowerCase();
    if (!q) return [];
    return messages.filter((m) => m.content.toLowerCase().includes(q));
  }, [headerQuery, messages]);

  useEffect(() => {
    if (!headerSearchOpen) return;
    setHeaderIdx(0);
  }, [headerQuery, headerSearchOpen]);

  const jumpTo = (idx: number) => {
    const target = headerResults[idx];
    if (!target) return;
    setHeaderIdx(idx);
    window.dispatchEvent(
      new CustomEvent("crm:jump-to-message", {
        detail: { messageId: target.id },
      }),
    );
  };
  const disabled = Boolean(actionsDisabled);
  const assignedToCurrentUser =
    Boolean(currentUserId) && cycle.assignedUserId === currentUserId;
  const hasSecondaryActions = Boolean(
    canMarkRead || canTagSessions || canScheduleMessages || cycle.leadId,
  );
  const tagAnchorRef =
    tagMenuSource === "mobile" ? moreActionsButtonRef : tagButtonRef;

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const breakpoint = window.matchMedia("(max-width: 860px)");
    const closeResponsivePopovers = () => {
      if (!moreActionsOpen && !tagMenuOpen) return;
      restoreStableFocusRef.current = true;
      setMoreActionsOpen(false);
      setTagMenuOpen(false);
    };
    breakpoint.addEventListener("change", closeResponsivePopovers);
    return () => {
      breakpoint.removeEventListener("change", closeResponsivePopovers);
    };
  }, [moreActionsOpen, tagMenuOpen]);

  useEffect(() => {
    const open = () => {
      setHeaderSearchOpen(true);
      window.requestAnimationFrame(() => searchInputRef.current?.focus());
    };
    window.addEventListener(
      "crm:open-header-search" as never,
      open as EventListener,
    );
    return () =>
      window.removeEventListener(
        "crm:open-header-search" as never,
        open as EventListener,
      );
  }, []);

  useLayoutEffect(() => {
    if (moreActionsOpen || tagMenuOpen || !restoreStableFocusRef.current) {
      return;
    }
    restoreStableFocusRef.current = false;
    identityButtonRef.current?.focus();
  }, [moreActionsOpen, tagMenuOpen]);

  return (
    <header className="crm-chat-header">
      <div className="crm-chat-header-main">
        {onBack ? (
          <button
            aria-label="Voltar para conversas"
            className="crm-icon-action crm-mobile-back"
            onClick={onBack}
            title="Voltar para conversas"
            type="button"
          >
            <ArrowLeft />
          </button>
        ) : null}
        <div className="crm-chat-identity">
          <button
            aria-label="Abrir detalhes da conversa"
            className="crm-chat-title"
            onClick={onOpenDetails}
            ref={identityButtonRef}
            type="button"
          >
            <span className="crm-avatar crm-avatar-lg">
              {cycle.profilePhotoUrl ? (
                <img alt="" src={cycle.profilePhotoUrl} />
              ) : (
                formatCycleAvatarInitials(cycle)
              )}
            </span>
            <span className="min-w-0">
              <h3>{formatCycleName(cycle)}</h3>
              {contactPresence ? (
                <p aria-atomic="true" role="status">
                  {contactPresence === "typing" ? "digitando…" : "online"}
                </p>
              ) : (
                <p>
                  {cycle.vehicle?.title ??
                    (cycle.customerPhone &&
                    formatCrmPhone(cycle.customerPhone) !==
                      formatCycleName(cycle)
                      ? formatCrmPhone(cycle.customerPhone)
                      : null) ??
                    "Negociação"}
                </p>
              )}
            </span>
          </button>
        </div>
      </div>
      <div className="crm-header-actions">
        {/* Prompt — WhatsApp header inspiration, AI spark */}
        <div className="crm-header-action-group crm-header-prompt-group">
          <button
            ref={promptButtonRef}
            aria-expanded={promptOpen}
            aria-haspopup="dialog"
            aria-label="Prompt IA"
            className="crm-icon-action crm-prompt-button"
            onClick={() => setPromptOpen((v) => !v)}
            title="Prompt IA — sugerir resposta"
            type="button"
          >
            <Sparkles aria-hidden="true" className="size-[18px]" />
          </button>
        </div>
        {/* Search — opens in-header WhatsApp-style bar */}
        <div className="crm-header-action-group">
          <button
            aria-label="Pesquisar nesta conversa"
            className={`crm-icon-action ${headerSearchOpen ? "crm-icon-action-active" : ""}`}
            onClick={() => {
              setHeaderSearchOpen(true);
              window.requestAnimationFrame(() =>
                searchInputRef.current?.focus(),
              );
              if (headerResults[headerIdx]) jumpTo(headerIdx);
            }}
            title="Pesquisar"
            type="button"
          >
            <Search aria-hidden="true" className="size-[18px]" />
          </button>
        </div>
        {canMarkRead || canTagSessions ? (
          <div
            aria-label="Ações da conversa"
            className="crm-header-action-group crm-header-action-group-secondary"
            role="group"
          >
            {canMarkRead ? (
              <button
                aria-label={
                  cycle.unreadCount
                    ? "Marcar conversa como lida"
                    : "Marcar conversa como nao lida"
                }
                className="crm-icon-action crm-header-action-secondary"
                disabled={disabled || pendingActions?.read}
                onClick={cycle.unreadCount ? onMarkRead : onMarkUnread}
                title={
                  cycle.unreadCount
                    ? "Marcar como lida"
                    : "Marcar como nao lida"
                }
                type="button"
              >
                {cycle.unreadCount ? <MailCheck /> : <MailOpen />}
              </button>
            ) : null}
            {canTagSessions ? (
              <div className="crm-tag-menu-anchor crm-header-action-secondary-anchor">
                <button
                  aria-label="Adicionar etiqueta"
                  aria-expanded={tagMenuOpen && tagMenuSource === "desktop"}
                  aria-haspopup="dialog"
                  className="crm-icon-action crm-header-action-secondary"
                  disabled={disabled || pendingActions?.tag}
                  onClick={() => {
                    setTagMenuSource("desktop");
                    setTagMenuOpen((open) => !open);
                  }}
                  ref={tagButtonRef}
                  title="Adicionar etiqueta"
                  type="button"
                >
                  <Tag />
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        {hasSecondaryActions ? (
          <div className="crm-header-action-group crm-header-more-actions">
            <button
              aria-expanded={moreActionsOpen}
              aria-haspopup="menu"
              aria-label="Mais ações"
              className="crm-icon-action"
              disabled={disabled}
              onClick={() => {
                setTagMenuOpen(false);
                setMoreActionsOpen((open) => !open);
              }}
              ref={moreActionsButtonRef}
              title="Mais ações"
              type="button"
            >
              <EllipsisVertical aria-hidden="true" />
            </button>
            <FeatureAnchoredPopover
              align="end"
              anchorRef={moreActionsButtonRef}
              ariaLabel="Mais ações da conversa"
              className="crm-header-more-menu"
              initialFocus="first"
              isOpen={moreActionsOpen}
              onClose={() => setMoreActionsOpen(false)}
              role="menu"
            >
              {canMarkRead ? (
                <button
                  disabled={disabled || pendingActions?.read}
                  onClick={() => {
                    setMoreActionsOpen(false);
                    if (cycle.unreadCount) onMarkRead();
                    else onMarkUnread();
                  }}
                  role="menuitem"
                  type="button"
                >
                  {cycle.unreadCount ? <MailCheck /> : <MailOpen />}
                  {cycle.unreadCount
                    ? "Marcar como lida"
                    : "Marcar como não lida"}
                </button>
              ) : null}
              {canScheduleMessages ? (
                <button
                  disabled={disabled}
                  onClick={() => {
                    setMoreActionsOpen(false);
                    onScheduleMessage();
                  }}
                  role="menuitem"
                  type="button"
                >
                  <CalendarClock />
                  Abrir agendamentos
                </button>
              ) : null}
              {cycle.leadId ? (
                <a
                  href={`#/crm?surface=leads&leadId=${encodeURIComponent(cycle.leadId)}`}
                  onClick={() => setMoreActionsOpen(false)}
                  role="menuitem"
                >
                  <ExternalLink />
                  Abrir lead vinculado
                </a>
              ) : null}
              {canTagSessions ? (
                <button
                  disabled={disabled || pendingActions?.tag}
                  onClick={() => {
                    setMoreActionsOpen(false);
                    setTagMenuSource("mobile");
                    setTagMenuOpen(true);
                  }}
                  role="menuitem"
                  type="button"
                >
                  <Tag />
                  Adicionar etiqueta
                </button>
              ) : null}
            </FeatureAnchoredPopover>
          </div>
        ) : null}
        {canScheduleMessages || cycle.leadId || canToggleIntervention ? (
          <div
            aria-label="Ferramentas do atendimento"
            className={
              canToggleIntervention
                ? "crm-header-action-group"
                : "crm-header-action-group crm-header-action-group-secondary"
            }
            role="group"
          >
            {canScheduleMessages ? (
              <button
                aria-label="Abrir agendamentos"
                className="crm-icon-action crm-header-action-secondary"
                disabled={disabled}
                onClick={onScheduleMessage}
                title="Agendamentos"
                type="button"
              >
                <CalendarClock />
              </button>
            ) : null}
            {cycle.leadId ? (
              <a
                aria-label="Abrir lead vinculado"
                className="crm-icon-action crm-header-action-secondary"
                href={`#/crm?surface=leads&leadId=${encodeURIComponent(cycle.leadId)}`}
                title="Abrir lead vinculado"
              >
                <ExternalLink />
              </a>
            ) : null}
            {canToggleIntervention ? (
              <button
                aria-label="Alternar atendimento humano"
                className={
                  cycle.status === "HUMAN_TAKEOVER"
                    ? "crm-icon-action crm-icon-action-active"
                    : "crm-icon-action"
                }
                disabled={disabled || pendingActions?.intervention}
                onClick={onToggleIntervention}
                title="Alternar atendimento humano"
                type="button"
              >
                {cycle.status === "HUMAN_TAKEOVER" ? <UserRound /> : <Bot />}
              </button>
            ) : null}
          </div>
        ) : null}
        {canAssignSession || canCloseSession ? (
          <div
            aria-label="Responsabilidade pelo atendimento"
            className="crm-header-action-group crm-header-action-group-primary"
            role="group"
          >
            {canAssignSession ? (
              <ChatAssignmentSelect
                assignableMembers={assignableMembers}
                disabled={disabled || Boolean(pendingActions?.assign)}
                onAssign={onAssign}
                cycle={cycle}
              />
            ) : null}
            {currentUserId && canAssignSession ? (
              <button
                aria-label={
                  assignedToCurrentUser ? "Meu atendimento" : "Assumir"
                }
                className={
                  assignedToCurrentUser
                    ? "crm-action crm-action-muted crm-action-assumir"
                    : "crm-action crm-action-assumir"
                }
                disabled={
                  disabled || pendingActions?.assign || assignedToCurrentUser
                }
                onClick={() => onAssign(currentUserId)}
                type="button"
              >
                <UserCheck aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="crm-action-label">
                  {assignedToCurrentUser ? "Meu atendimento" : "Assumir"}
                </span>
              </button>
            ) : null}
            {canCloseSession ? (
              <button
                aria-label="Concluir"
                className="crm-action crm-action-concluir"
                disabled={disabled}
                onClick={onClose}
                type="button"
              >
                <CheckCheck aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="crm-action-label">Concluir</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {headerSearchOpen ? (
        <div className="crm-header-search-overlay" role="search">
          <Search aria-hidden="true" className="size-4 text-muted shrink-0" />
          <input
            ref={searchInputRef}
            aria-label="Pesquisar nesta conversa"
            placeholder="Pesquisar nesta conversa"
            value={headerQuery}
            onChange={(event) => setHeaderQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setHeaderSearchOpen(false);
                setHeaderQuery("");
              }
              if (event.key === "Enter" && headerResults.length) {
                event.preventDefault();
                if (event.shiftKey)
                  jumpTo(
                    (headerIdx - 1 + headerResults.length) %
                      headerResults.length,
                  );
                else jumpTo((headerIdx + 1) % headerResults.length);
              }
            }}
          />
          <span className="crm-header-search-count" aria-live="polite">
            {headerQuery
              ? headerResults.length
                ? `${headerIdx + 1} de ${headerResults.length}`
                : "Nenhum"
              : ""}
          </span>
          <button
            aria-label="Anterior"
            className="crm-icon-action crm-header-search-nav"
            disabled={!headerResults.length}
            onClick={() =>
              jumpTo(
                (headerIdx - 1 + headerResults.length) % headerResults.length,
              )
            }
            type="button"
          >
            <ChevronUp className="size-4" />
          </button>
          <button
            aria-label="Próximo"
            className="crm-icon-action crm-header-search-nav"
            disabled={!headerResults.length}
            onClick={() => jumpTo((headerIdx + 1) % headerResults.length)}
            type="button"
          >
            <ChevronDown className="size-4" />
          </button>
          <button
            aria-label="Fechar pesquisa"
            className="crm-icon-action"
            onClick={() => {
              setHeaderSearchOpen(false);
              setHeaderQuery("");
            }}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}
      <FeatureAnchoredPopover
        align="end"
        anchorRef={promptButtonRef}
        ariaLabel="Prompt IA"
        className="crm-prompt-popover"
        isOpen={promptOpen}
        onClose={() => setPromptOpen(false)}
        role="dialog"
      >
        <div className="crm-prompt-menu">
          <p className="crm-prompt-title">
            <Sparkles className="size-3.5" /> Prompt IA
          </p>
          <p className="crm-details-muted text-xs">
            Gere um rascunho e insira no compositor. Inspirado no WhatsApp —
            rápido como sugerir resposta.
          </p>
          <button
            type="button"
            onClick={() => {
              setPromptOpen(false);
              const suggestion = `Olá ${cycle.customerPhone ? formatCrmPhone(cycle.customerPhone) : ""} — obrigado pelo contato sobre ${cycle.vehicle?.title ?? "o veículo"}! Como posso ajudar no próximo passo?`;
              onInsertPrompt?.(suggestion);
            }}
          >
            <Wand2 className="size-4" /> Sugerir resposta acolhedora
          </button>
          <button
            type="button"
            onClick={() => {
              setPromptOpen(false);
              onInsertPrompt?.(
                `Resumo: ${cycle.vehicle?.title ?? "Negociação"} — ${cycle.unreadCount ? `${cycle.unreadCount} não lidas` : "em andamento"}. Próximo passo: confirmar visita/test drive.`,
              );
            }}
          >
            <Search className="size-4" /> Resumir conversa
          </button>
          <button
            type="button"
            onClick={() => {
              setPromptOpen(false);
              onInsertPrompt?.(
                "Prezados, formalizando nossa proposta com condições e prazos conforme alinhado. Fico à disposição para enviar documentação.",
              );
            }}
          >
            <Tag className="size-4" /> Tom formal
          </button>
          <button
            type="button"
            onClick={() => {
              setPromptOpen(false);
              onInsertPrompt?.(
                "Oi! Que bom falar com você 😊 me conta qual horário funciona melhor para você dar uma olhada no veículo?",
              );
            }}
          >
            <Sparkles className="size-4" /> Tom descontraído
          </button>
        </div>
      </FeatureAnchoredPopover>
      <FeatureAnchoredPopover
        align="end"
        anchorRef={tagAnchorRef}
        ariaLabel="Adicionar etiqueta"
        className="crm-tag-popover"
        initialFocus="first"
        isOpen={tagMenuOpen}
        onClose={() => setTagMenuOpen(false)}
        role="dialog"
      >
        <TagMenu
          activeTags={cycle.tags ?? []}
          availableTags={availableTags ?? []}
          disabled={disabled || Boolean(pendingActions?.tag)}
          onAdd={async (input) => {
            const accepted = await onAddTag(input);
            if (accepted) setTagMenuOpen(false);
            return accepted;
          }}
        />
      </FeatureAnchoredPopover>
    </header>
  );
}
