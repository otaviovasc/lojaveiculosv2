import {
  CalendarCheck,
  CalendarClock,
  Megaphone,
  MessageSquareText,
  Plus,
  Search,
} from "lucide-react";
import { useEffect, type RefObject } from "react";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { CrmAttendanceConclusionDialog } from "./CrmAttendanceConclusionDialog";
import { CrmNewConversationDialog } from "./CrmNewConversationDialog";
import { SessionList } from "./CrmConversationCycleList";
import { SessionListSkeleton } from "./CrmSkeletons";
import type { CrmScope } from "./CrmScopedNav";
import type { useCrmInbox } from "./useCrmInbox";
import type {
  CrmConversationCycle,
  CrmConversationCycleId,
} from "./crmConversationTypes";

type CrmInbox = ReturnType<typeof useCrmInbox>;

export function useCrmWorkspaceShellEvents(
  shellRef: RefObject<HTMLElement | null>,
  inbox: CrmInbox,
) {
  useEffect(() => {
    const onJump = (event: Event) => {
      const { messageId } = (event as CustomEvent<{ messageId: string }>)
        .detail;
      if (!messageId) return;
      const el =
        shellRef.current?.querySelector<HTMLElement>(
          `[data-message-id="${String(messageId)}"]`,
        ) ??
        shellRef.current?.querySelector<HTMLElement>(
          `#crm-msg-${String(messageId).replace(/"/g, "")}`,
        );
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("crm-message-highlight");
        setTimeout(() => el.classList.remove("crm-message-highlight"), 1800);
      } else {
        // fallback: smooth scroll messages container toward bottom where hit likely is
        const scroller =
          shellRef.current?.querySelector<HTMLElement>(".crm-messages");
        scroller?.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
      }
    };
    const onToggleTag = (event: Event) => {
      const { tagId, cycleId } = (
        event as CustomEvent<{ tagId: string; cycleId: string }>
      ).detail;
      if (!tagId || !cycleId) return;
      const target = inbox.conversationCycles.find(
        (c) => String(c.id) === String(cycleId),
      );
      const hasTag = target?.tags?.some((t) => String(t.id) === String(tagId));
      if (hasTag)
        void inbox.actions.removeCycleTag(
          cycleId as CrmConversationCycleId,
          tagId,
        );
      else
        void inbox.actions.addCycleTag(
          cycleId as CrmConversationCycleId,
          { tagId } as unknown as Parameters<
            typeof inbox.actions.addCycleTag
          >[1],
        );
    };
    window.addEventListener("crm:jump-to-message", onJump);
    window.addEventListener("crm:toggle-tag", onToggleTag);
    return () => {
      window.removeEventListener("crm:jump-to-message", onJump);
      window.removeEventListener("crm:toggle-tag", onToggleTag);
    };
  }, [inbox, shellRef]);
}

export function CrmQueueListPane({
  inbox,
  onRequestDelete,
  onSelect,
  selectionMode,
}: {
  inbox: CrmInbox;
  onRequestDelete: (cycleId: CrmConversationCycleId) => void;
  onSelect: (cycleId: CrmConversationCycleId) => void;
  selectionMode: boolean;
}) {
  if (inbox.isLoading && !inbox.conversationCycles.length) {
    return <SessionListSkeleton />;
  }
  return (
    <SessionList
      activeCycleId={inbox.activeCycleId}
      hasMore={inbox.hasMoreSessions}
      isLoadingMore={inbox.isLoadingMoreSessions}
      onArchive={(cycleId) => void inbox.actions.archiveCycle(cycleId)}
      onPin={(cycleId) => void inbox.actions.pinCycle(cycleId)}
      onDelete={onRequestDelete}
      onLoadMore={() => void inbox.loadMoreSessions()}
      onRefresh={() => void inbox.refreshSessions({ preserveLocalOnly: true })}
      onSelect={onSelect}
      onToggleRead={(cycle) => {
        if (cycle.unreadCount) {
          void inbox.actions.markCycleRead(cycle.id);
        } else {
          void inbox.actions.markCycleUnread(cycle.id);
        }
      }}
      onToggleSelected={inbox.toggleSelectedSession}
      selectedCycleIds={inbox.selectedCycleIds}
      selectionMode={selectionMode}
      conversationCycles={inbox.conversationCycles}
    />
  );
}

export function CrmEmptyConversationPane({
  canSetupConnection,
  canStartConversation,
  isDemoView,
  onFocusList,
  onFocusSearch,
  onScopeChange,
  onStartConversation,
}: {
  canSetupConnection: boolean;
  canStartConversation: boolean;
  isDemoView: boolean;
  onFocusList: () => void;
  onFocusSearch: () => void;
  onScopeChange: (scope: CrmScope) => void;
  onStartConversation: () => void;
}) {
  return (
    <div className="crm-empty crm-empty-conversation-state">
      <div className="crm-empty-conversation-card">
        <span aria-hidden="true" className="crm-empty-conversation-icon">
          <MessageSquareText />
        </span>
        <span className="crm-empty-conversation-tag">
          {isDemoView ? "Demonstração" : "WhatsApp CRM"}
        </span>
        <h2>Selecione uma conversa</h2>
        <p>
          {isDemoView
            ? "Histórico fictício para explorar o CRM. Escolha um contato na fila ao lado para navegar nas conversas de demonstração."
            : "Escolha um contato na fila ao lado para visualizar o histórico de mensagens, negociações de veículos, propostas e agendamentos."}
        </p>

        <div className="crm-empty-conversation-grid">
          <button
            className="crm-empty-quick-action"
            disabled={!canStartConversation}
            onClick={onStartConversation}
            type="button"
          >
            <span className="crm-empty-action-icon crm-empty-action-emerald">
              <Plus className="size-4" />
            </span>
            <div className="crm-empty-action-text">
              <strong>Nova conversa</strong>
              <small>Iniciar contato por telefone</small>
            </div>
          </button>

          <button
            className="crm-empty-quick-action"
            onClick={() => onScopeChange("visits")}
            type="button"
          >
            <span className="crm-empty-action-icon crm-empty-action-blue">
              <CalendarCheck className="size-4" />
            </span>
            <div className="crm-empty-action-text">
              <strong>Visitas & Test Drives</strong>
              <small>Agenda presencial na loja</small>
            </div>
          </button>

          <button
            className="crm-empty-quick-action"
            onClick={() => onScopeChange("schedules")}
            type="button"
          >
            <span className="crm-empty-action-icon crm-empty-action-purple">
              <CalendarClock className="size-4" />
            </span>
            <div className="crm-empty-action-text">
              <strong>Mensagens agendadas</strong>
              <small>Disparos programados</small>
            </div>
          </button>

          <button
            className="crm-empty-quick-action"
            onClick={() => onScopeChange("campaigns")}
            type="button"
          >
            <span className="crm-empty-action-icon crm-empty-action-amber">
              <Megaphone className="size-4" />
            </span>
            <div className="crm-empty-action-text">
              <strong>Campanhas & Disparos</strong>
              <small>Transmissões para clientes</small>
            </div>
          </button>
        </div>

        {isDemoView && canSetupConnection ? (
          <div className="crm-empty-conversation-action">
            <button
              className="crm-action"
              onClick={() => onScopeChange("connection")}
              type="button"
            >
              Configurar canal
            </button>
          </div>
        ) : null}

        <div className="crm-empty-conversation-shortcuts">
          <button
            className="crm-empty-shortcut-btn"
            onClick={onFocusList}
            type="button"
          >
            <kbd>Alt</kbd> + <kbd>1</kbd> <span>Focar lista</span>
          </button>
          <button
            className="crm-empty-shortcut-btn"
            onClick={onFocusSearch}
            type="button"
          >
            <Search className="size-3" />
            <span>Pesquisar conversas</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function CrmWorkspaceOverlays({
  activeSession,
  conclusionOpen,
  deleteCycleId,
  inbox,
  newConversationDraft,
  newConversationOpen,
  onCloseConclusion,
  onCloseDelete,
  onCloseNewConversation,
  onConfirmDelete,
  onStartedConversation,
}: {
  activeSession: CrmConversationCycle | null;
  conclusionOpen: boolean;
  deleteCycleId: CrmConversationCycleId | null;
  inbox: CrmInbox;
  newConversationDraft: { buyerName?: string; phone?: string } | null;
  newConversationOpen: boolean;
  onCloseConclusion: () => void;
  onCloseDelete: () => void;
  onCloseNewConversation: () => void;
  onConfirmDelete: () => void;
  onStartedConversation: () => void;
}) {
  return (
    <>
      {newConversationOpen ? (
        <CrmNewConversationDialog
          disabled={inbox.isStartingConversation || !inbox.canStartConversation}
          initialBuyerName={newConversationDraft?.buyerName ?? ""}
          initialPhone={newConversationDraft?.phone ?? ""}
          onClose={onCloseNewConversation}
          onStart={async (input) => {
            const accepted = await inbox.startConversation(input);
            if (accepted) onStartedConversation();
            return accepted;
          }}
          provider={
            inbox.startConversationProvider === "meta_cloud"
              ? "meta_cloud"
              : "zapi"
          }
        />
      ) : null}
      {activeSession && conclusionOpen ? (
        <CrmAttendanceConclusionDialog
          assignableMembers={inbox.assignableMembers}
          disabled={
            inbox.isConcludingSession ||
            inbox.isMutatingSession ||
            !inbox.permissions.canClose
          }
          onClose={onCloseConclusion}
          onConclude={(input) =>
            inbox.actions.concludeCycle(activeSession.id, input)
          }
          cycle={activeSession}
        />
      ) : null}
      <ConfirmDialog
        confirmLabel="Excluir conversa"
        description="A conversa sairá da sua fila e não pode ser recuperada pelo app. Ela só voltará a aparecer se o contato enviar uma nova mensagem."
        isOpen={deleteCycleId !== null}
        onClose={onCloseDelete}
        onConfirm={onConfirmDelete}
        title="Excluir conversa?"
        variant="destructive"
      />
    </>
  );
}
