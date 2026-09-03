import { AnimatedIconSwap } from "../../components/ui/AnimatedIconSwap";
import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Car,
  Check,
  Clock,
  Copy,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  SendHorizontal,
} from "lucide-react";
import { Morphicon } from "../../components/ui/Morphicon";
import { formatCrmPhone } from "./crmPhoneFormat";
import { readLeadAvatarUrl } from "./crmLeadAvatar";
import type { LeadVehicleOption } from "./CrmPipelineViewTypes";
import { useOptionalAccountSession } from "../account/accountSession";
import { readCrmCapabilities } from "./crmPermissions";
import { createRuntimeCrmConversationApi } from "./runtimeApi";
import { sourceLabels } from "./crmPipelineConfig";
import type {
  CreateProductCrmActivityInput,
  ProductCrmLead,
  ProductCrmLeadActivity,
} from "./productCrmTypes";

type Props = {
  lead: ProductCrmLead;
  leadName: string;
  activities: ProductCrmLeadActivity[];
  leadVehicles: LeadVehicleOption[];
  onCreateActivity: (
    leadId: string,
    input: CreateProductCrmActivityInput,
  ) => Promise<void>;
  onOpenChatModal?: () => void;
};

export function CrmLeadDetailsSidebar({
  lead,
  leadName,
  activities,
  leadVehicles,
  onCreateActivity,
  onOpenChatModal,
}: Props) {
  const [commentText, setCommentText] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const lastMessageAt = useLeadLastCrmMessageAt(lead.id);

  const rawPhone = lead.buyerPhone ? lead.buyerPhone.replace(/\D/g, "") : null;

  const handleCopy = (text: string, field: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handlePostComment = async () => {
    const text = commentText.trim();
    if (!text || isPostingComment) return;
    setIsPostingComment(true);
    setCommentError(null);
    try {
      await onCreateActivity(lead.id, {
        activityType: "note",
        content: text,
        direction: "internal",
      });
      setCommentText("");
    } catch {
      setCommentError("Não foi possível salvar o comentário.");
    } finally {
      setIsPostingComment(false);
    }
  };

  return (
    <aside className="flex flex-col gap-4 w-full">
      {/* Card: Client Info details */}
      <div className="border border-line/25 bg-panel/30 rounded-xl p-4 flex flex-col gap-3.5 relative">
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {readLeadAvatarUrl(lead) ? (
              <img
                alt={leadName}
                className="size-11 shrink-0 rounded-full border border-line/40 object-cover bg-app-elevated"
                src={readLeadAvatarUrl(lead) as string}
              />
            ) : (
              <span className="grid size-11 shrink-0 place-items-center rounded-full border border-line/40 bg-app-elevated text-xs font-black text-app-text">
                {leadName.slice(0, 2).toUpperCase() || "?"}
              </span>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-black text-app-text uppercase truncate">
                {leadName}
              </span>
              <span className="text-xs font-bold text-muted">
                {sourceLabels[lead.source] || "Lead"}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Action Contact Bar */}
        <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-line/15">
          {rawPhone ? (
            onOpenChatModal ? (
              <button
                className="inline-flex flex-col items-center justify-center p-2 rounded-lg bg-panel/40 border border-line/25 hover:bg-line/20 hover:text-app-text transition-all text-muted text-center cursor-pointer"
                onClick={onOpenChatModal}
                title="Abrir Chat CRM"
                type="button"
              >
                <MessageSquare className="size-4 mb-0.5" />
                <span className="text-xs font-black">Chat CRM</span>
              </button>
            ) : (
              <a
                className="inline-flex flex-col items-center justify-center p-2 rounded-lg bg-panel/40 border border-line/25 hover:bg-line/20 hover:text-app-text transition-all text-muted text-center"
                href={`https://wa.me/${rawPhone}`}
                rel="noreferrer"
                target="_blank"
                title="Abrir WhatsApp"
              >
                <MessageSquare className="size-4 mb-0.5" />
                <span className="text-xs font-black">WhatsApp</span>
              </a>
            )
          ) : (
            <div className="inline-flex flex-col items-center justify-center p-2 rounded-lg bg-panel/20 border border-line/15 opacity-40 text-muted text-center">
              <MessageSquare className="size-4 mb-0.5" />
              <span className="text-xs font-bold">Sem whats</span>
            </div>
          )}

          {lead.buyerPhone ? (
            <a
              className="inline-flex flex-col items-center justify-center p-2 rounded-lg bg-panel/40 border border-line/25 hover:bg-line/20 hover:text-app-text transition-all text-muted text-center"
              href={`tel:${lead.buyerPhone}`}
              title="Ligar para cliente"
            >
              <Phone className="size-4 mb-0.5" />
              <span className="text-xs font-black">Ligar</span>
            </a>
          ) : (
            <div className="inline-flex flex-col items-center justify-center p-2 rounded-lg bg-panel/20 border border-line/15 opacity-40 text-muted text-center">
              <Phone className="size-4 mb-0.5" />
              <span className="text-xs font-bold">Sem fone</span>
            </div>
          )}

          {lead.buyerEmail ? (
            <a
              className="inline-flex flex-col items-center justify-center p-2 rounded-lg bg-panel/40 border border-line/25 hover:bg-line/20 hover:text-app-text transition-all text-muted text-center"
              href={`mailto:${lead.buyerEmail}`}
              title="Enviar e-mail"
            >
              <Mail className="size-4 mb-0.5" />
              <span className="text-xs font-black">E-mail</span>
            </a>
          ) : (
            <div className="inline-flex flex-col items-center justify-center p-2 rounded-lg bg-panel/20 border border-line/15 opacity-40 text-muted text-center">
              <Mail className="size-4 mb-0.5" />
              <span className="text-xs font-bold">Sem email</span>
            </div>
          )}
        </div>

        {/* Contact info list with copy */}
        <div className="flex flex-col gap-2 text-xs font-bold text-muted mt-1">
          {lead.buyerPhone ? (
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-panel/20 border border-line/15">
              <div className="flex items-center gap-2 min-w-0">
                <Phone className="size-3.5 text-muted shrink-0" />
                <span className="truncate">
                  {formatCrmPhone(lead.buyerPhone)}
                </span>
              </div>
              <button
                className="p-1 rounded hover:bg-line/20 text-muted hover:text-app-text transition-colors"
                onClick={() => handleCopy(lead.buyerPhone ?? "", "phone")}
                title="Copiar telefone"
                type="button"
              >
                {copiedField === "phone" ? (
                  <Morphicon
                    active
                    className="text-success-strong"
                    name="check"
                    size={14}
                  />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            </div>
          ) : null}

          {lead.buyerEmail ? (
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-panel/20 border border-line/15">
              <div className="flex items-center gap-2 min-w-0">
                <Mail className="size-3.5 text-muted shrink-0" />
                <span className="truncate">{lead.buyerEmail}</span>
              </div>
              <button
                className="p-1 rounded hover:bg-line/20 text-muted hover:text-app-text transition-colors"
                onClick={() => handleCopy(lead.buyerEmail ?? "", "email")}
                title="Copiar e-mail"
                type="button"
              >
                {copiedField === "email" ? (
                  <Morphicon
                    active
                    className="text-success-strong"
                    name="check"
                    size={14}
                  />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Card: Vehicles */}
      <div className="border border-line/25 bg-panel/30 rounded-xl p-4 flex flex-col gap-3">
        <span className="text-xs font-black uppercase text-muted tracking-wider">
          Veículos Vinculados ({leadVehicles.length})
        </span>

        <div className="flex flex-col gap-2">
          {leadVehicles.length > 0 ? (
            leadVehicles.map((v) => (
              <div
                className="flex items-center gap-3 p-2.5 rounded-lg bg-panel/20 border border-line/20 hover:border-line/40 transition-colors"
                key={v.id}
              >
                {v.imageUrl ? (
                  <img
                    alt={v.label}
                    className="w-12 h-9 rounded object-cover border border-line/30 shrink-0 bg-app-elevated"
                    src={v.imageUrl}
                  />
                ) : (
                  <div className="w-12 h-9 rounded bg-line/20 flex items-center justify-center shrink-0 border border-line/25">
                    <Car className="size-4 text-muted" />
                  </div>
                )}
                <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                  <span className="text-xs font-black text-app-text truncate">
                    {v.label}
                  </span>
                  <span className="text-xs font-black text-primary">
                    {v.priceCents
                      ? new Intl.NumberFormat("pt-BR", {
                          currency: "BRL",
                          style: "currency",
                        }).format(v.priceCents / 100)
                      : "Sob consulta"}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-panel/10 border border-line/15 text-muted">
              <Car className="size-4 shrink-0" />
              <span className="text-xs font-bold">Sem veículo vinculado</span>
            </div>
          )}
        </div>
      </div>

      {/* Card: Key Dates */}
      <div className="border border-line/25 bg-panel/30 rounded-xl p-4 flex flex-col gap-2.5">
        <span className="text-xs font-black uppercase text-muted tracking-wider">
          Marcos de Tempo
        </span>
        <div className="flex flex-col gap-2 text-xs mt-0.5">
          <div className="flex justify-between items-center py-1 border-b border-line/10">
            <span className="text-muted font-bold flex items-center gap-1.5">
              <Calendar className="size-3 text-muted/70" /> Entrada
            </span>
            <span className="font-black text-app-text">
              {lead.createdAt
                ? new Date(lead.createdAt).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })
                : "—"}
            </span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-line/10">
            <span className="text-muted font-bold flex items-center gap-1.5">
              <Clock className="size-3 text-muted/70" /> Última atividade
            </span>
            <span className="font-black text-app-text">
              {lead.lastInteractionAt
                ? new Date(lead.lastInteractionAt).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })
                : "—"}
            </span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-muted font-bold flex items-center gap-1.5">
              <MessageSquare className="size-3 text-muted/70" /> Última mensagem
            </span>
            <span className="font-black text-app-text">
              {lastMessageAt
                ? new Date(lastMessageAt).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })
                : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Card: Notas Rápidas */}
      <div className="border border-line/25 bg-panel/30 rounded-xl p-4 flex flex-col gap-3">
        <span className="text-xs font-black uppercase text-muted tracking-wider">
          Notas Rápidas
        </span>

        <div className="flex flex-col gap-2">
          {activities.filter((a) => a.activityType === "note").length > 0 ? (
            activities
              .filter((a) => a.activityType === "note")
              .slice(0, 4)
              .map((act) => (
                <div
                  className="p-2.5 bg-panel/20 border border-line/15 rounded-lg flex flex-col gap-1"
                  key={act.id}
                >
                  <span className="text-xs font-bold text-app-text leading-relaxed">
                    {act.content}
                  </span>
                  <span className="text-xs font-bold text-muted self-end">
                    {new Date(act.occurredAt).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              ))
          ) : (
            <div className="text-center py-2">
              <span className="text-xs font-bold text-muted">
                Nenhuma nota rápida ainda.
              </span>
            </div>
          )}

          {/* Quick Comment Input */}
          <div className="border border-line/25 bg-panel/20 rounded-xl p-2.5 flex flex-col gap-2 mt-1">
            <textarea
              aria-label="Comentário interno"
              className="w-full min-h-[48px] bg-transparent text-xs font-medium text-app-text outline-none resize-none placeholder:text-muted/65 disabled:opacity-50"
              disabled={isPostingComment}
              placeholder="Escreva uma nota rápida..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handlePostComment();
                }
              }}
            />
            {commentError ? (
              <p className="text-xs font-bold text-danger">{commentError}</p>
            ) : null}
            <div className="flex items-center justify-between border-t border-line/10 pt-1.5">
              <span className="text-xs font-bold text-muted">
                Enter para salvar
              </span>
              <button
                aria-label="Enviar comentário"
                className="flex size-7 cursor-pointer items-center justify-center rounded-full bg-primary text-white transition-transform duration-150 hover:scale-110 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!commentText.trim() || isPostingComment}
                onClick={() => void handlePostComment()}
                type="button"
              >
                {isPostingComment ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <AnimatedIconSwap
                    stateKey={Boolean(commentText.trim())}
                    variant="pop"
                  >
                    <SendHorizontal aria-hidden="true" className="size-3.5" />
                  </AnimatedIconSwap>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function useLeadLastCrmMessageAt(leadId: string) {
  const cycle = useOptionalAccountSession();
  const permissions = useMemo(() => readCrmCapabilities(cycle), [cycle]);
  const [lastMessageAt, setLastMessageAt] = useState<string | null>(null);

  useEffect(() => {
    if (!permissions.canList) {
      setLastMessageAt(null);
      return;
    }
    let active = true;
    void createRuntimeCrmConversationApi()
      .listConversationCycles({ leadId, limit: 5 })
      .then((conversationCycles) => {
        if (!active) return;
        const timestamps = conversationCycles
          .map((item) => item.lastMessageAt)
          .filter((value): value is string => Boolean(value))
          .sort();
        setLastMessageAt(timestamps[timestamps.length - 1] ?? null);
      })
      .catch(() => {
        if (active) setLastMessageAt(null);
      });
    return () => {
      active = false;
    };
  }, [leadId, permissions.canList]);

  return lastMessageAt;
}
