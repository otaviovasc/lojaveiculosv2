import { useState } from "react";
import {
  AlertCircle,
  Clock,
  LoaderCircle,
  MessageSquare,
  RotateCcw,
  XCircle,
} from "lucide-react";
import {
  FeatureAlert,
  FeatureEmptyState,
} from "../../components/ui/FeatureStates";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import type { CrmConversationApi } from "./crmConversationApi";
import type {
  CrmScheduledMessage,
  CrmScheduledMessageStatus,
} from "./crmConversationExtraTypes";
import { useCrmLeadScheduledMessages } from "./useCrmLeadScheduledMessages";

export type CrmLeadScheduledMessagesPanelProps = {
  leadId: string;
  api?: CrmConversationApi | undefined;
};

export const SCHEDULED_STATUS_MAP: Record<
  CrmScheduledMessageStatus,
  { label: string; badgeClass: string }
> = {
  pending: {
    label: "Pendente",
    badgeClass: "border-warning/30 bg-warning/10 text-warning-strong",
  },
  sending: {
    label: "Enviando",
    badgeClass: "border-primary/30 bg-primary/10 text-primary",
  },
  sent: {
    label: "Enviada",
    badgeClass:
      "border-success-strong/30 bg-success-strong/10 text-success-strong",
  },
  failed: {
    label: "Falhou",
    badgeClass: "border-danger/30 bg-danger/10 text-danger",
  },
  cancelled: {
    label: "Cancelada",
    badgeClass: "border-line/30 bg-line/15 text-muted",
  },
};

function formatScheduledDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Sao_Paulo",
    }).format(date);
  } catch {
    return isoString;
  }
}

function ScheduledMessageBody({ content }: { content: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = content.length > 180;

  return (
    <div className="flex flex-col gap-1 min-w-0 flex-1">
      <p
        className={
          "text-sm font-bold text-app-text leading-snug break-words " +
          (isExpanded || !isLong ? "whitespace-pre-wrap" : "line-clamp-3")
        }
      >
        {content || "(Sem conteúdo)"}
      </p>
      {isLong && (
        <button
          className="self-start text-xs font-black text-accent hover:underline focus-visible:outline-none cursor-pointer"
          onClick={() => setIsExpanded((prev) => !prev)}
          type="button"
        >
          {isExpanded ? "Ver menos" : "Ver mais"}
        </button>
      )}
    </div>
  );
}

export function CrmLeadScheduledMessagesPanel({
  leadId,
  api,
}: CrmLeadScheduledMessagesPanelProps) {
  const {
    canRead,
    canCancel,
    cancelling,
    cancel,
    refresh,
    items,
    error,
    loading,
  } = useCrmLeadScheduledMessages(leadId, api);

  if (!canRead) {
    return null;
  }

  const reachedCap = items.length >= 100;

  return (
    <div className="flex flex-col gap-4 text-app-text select-none border-t border-line/20 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="size-4 text-primary" />
          <span className="text-sm font-black text-app-text">
            Mensagens agendadas ({items.length})
          </span>
        </div>
        {loading && (
          <LoaderCircle
            aria-label="Carregando mensagens agendadas"
            className="size-4 animate-spin text-muted"
          />
        )}
      </div>

      {reachedCap && (
        <div className="text-xs font-bold text-muted bg-panel/30 border border-line/30 rounded-lg px-3 py-2">
          Exibindo até 100 mensagens agendadas deste cliente.
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center p-8 border border-line/20 rounded-xl bg-panel/10 text-xs font-bold text-muted gap-2">
          <LoaderCircle className="size-4 animate-spin" />
          <span>Carregando mensagens agendadas...</span>
        </div>
      ) : error ? (
        <FeatureAlert
          action={
            <FeatureActionButton
              icon={RotateCcw}
              label="Tentar novamente"
              onClick={() => void refresh()}
            >
              Tentar novamente
            </FeatureActionButton>
          }
          icon={<AlertCircle className="size-4" />}
          title="Não foi possível carregar as mensagens agendadas"
          tone="danger"
        >
          {error}
        </FeatureAlert>
      ) : items.length === 0 ? (
        <FeatureEmptyState
          body="Nenhuma mensagem agendada para este cliente."
          density="compact"
          icon={Clock}
          tone="neutral"
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((item) => {
            const statusConfig = SCHEDULED_STATUS_MAP[item.status] ?? {
              label: item.status,
              badgeClass: "border-line/30 bg-line/15 text-muted",
            };
            const isCancellingThis = cancelling === item.id;
            const canCancelThis = canCancel && item.status === "pending";

            return (
              <div
                className="p-4 bg-panel/20 border border-line/20 rounded-xl flex flex-col gap-2 hover:border-line/40 transition-colors"
                key={item.id}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <span className="grid size-5 place-items-center rounded bg-primary/15 text-primary shrink-0 mt-0.5">
                      <MessageSquare className="size-3" />
                    </span>
                    <ScheduledMessageBody content={item.content} />
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider shrink-0 border ${statusConfig.badgeClass}`}
                  >
                    {statusConfig.label}
                  </span>
                </div>

                {item.errorMessage && (
                  <div className="pl-7 text-xs font-medium text-danger flex items-center gap-1.5">
                    <AlertCircle className="size-3 shrink-0" />
                    <span>{item.errorMessage}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-line/10 pl-7 text-xs font-bold">
                  <span className="text-muted flex items-center gap-1.5">
                    <Clock className="size-3 text-muted/70" />
                    <span>
                      Agendada para: {formatScheduledDateTime(item.scheduledAt)}
                    </span>
                  </span>

                  {canCancelThis && (
                    <button
                      className="inline-flex items-center gap-1 text-xs font-black text-danger hover:underline disabled:opacity-50 disabled:no-underline transition-colors cursor-pointer"
                      disabled={isCancellingThis || Boolean(cancelling)}
                      onClick={() => void cancel(item)}
                      type="button"
                    >
                      {isCancellingThis ? (
                        <>
                          <LoaderCircle className="size-3 animate-spin" />
                          <span>Cancelando...</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="size-3" />
                          <span>Cancelar</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
