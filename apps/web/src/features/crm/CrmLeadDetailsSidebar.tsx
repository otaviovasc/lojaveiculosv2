import { useState } from "react";
import { Car, User, SendHorizontal, Phone, Mail } from "lucide-react";
import type { LeadVehicleOption } from "./CrmPipelineViewTypes";
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
};

export function CrmLeadDetailsSidebar({
  lead,
  leadName,
  activities,
  leadVehicles,
  onCreateActivity,
}: Props) {
  const [commentText, setCommentText] = useState("");

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    await onCreateActivity(lead.id, {
      activityType: "note",
      content: commentText.trim(),
      direction: "internal",
    });
    setCommentText("");
  };

  return (
    <aside className="flex flex-col gap-4">
      {/* Card: Client Info details */}
      <div className="border border-line/25 bg-panel/30 rounded-xl p-5 flex flex-col gap-3 relative">
        <div className="flex justify-between items-start gap-4">
          <span className="text-sm font-black text-app-text uppercase">
            {leadName}
          </span>
          <User className="size-4 text-muted shrink-0 mt-0.5" />
        </div>
        <div className="flex flex-col gap-2 text-xs font-bold text-muted/95 mt-1">
          <div className="flex items-center gap-2">
            <Phone className="size-3.5 text-muted shrink-0" />
            <span>{lead.buyerPhone || "Sem telefone"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="size-3.5 text-muted shrink-0" />
            <span className="truncate">{lead.buyerEmail || "Sem e-mail"}</span>
          </div>
        </div>
      </div>

      {/* Card: Vehicles */}
      <div className="border border-line/25 bg-panel/30 rounded-xl p-5 flex flex-col gap-4 relative">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-app-text">
            Veículos ({leadVehicles.length})
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {leadVehicles.length > 0 ? (
            leadVehicles.map((v) => (
              <div
                className="flex items-center gap-3 p-2 rounded-lg bg-panel/10 border border-line/15"
                key={v.id}
              >
                {v.imageUrl ? (
                  <img
                    alt={v.label}
                    className="w-10 h-7 rounded object-cover border border-white/5 shrink-0"
                    src={v.imageUrl}
                  />
                ) : (
                  <div className="w-10 h-7 rounded bg-line/25 flex items-center justify-center shrink-0">
                    <Car className="size-4 text-muted" />
                  </div>
                )}
                <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                  <span className="text-xs font-black text-app-text truncate">
                    {v.label}
                  </span>
                  <span className="text-xs font-bold text-muted">
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
            <div className="flex items-center gap-3 p-2 rounded-lg bg-panel/10 border border-line/15 text-muted">
              <Car className="size-4 shrink-0" />
              <span className="text-xs font-bold">Sem veículo vinculado</span>
            </div>
          )}
        </div>
      </div>

      <div className="border border-line/25 bg-panel/30 rounded-xl p-5 flex flex-col gap-3">
        <span className="text-xs font-black text-app-text">Datas</span>
        <div className="flex flex-col gap-2.5 text-xs mt-1">
          <div className="flex justify-between items-center">
            <span className="text-muted font-bold">Entrada</span>
            <span className="font-extrabold text-xs">
              {lead.createdAt
                ? new Date(lead.createdAt).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })
                : "—"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted font-bold">Última atividade</span>
            <span className="font-extrabold text-xs">
              {lead.lastInteractionAt
                ? new Date(lead.lastInteractionAt).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })
                : "—"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted font-bold">Última mensagem</span>
            <span className="font-extrabold text-xs">
              {typeof lead.metadata?.lastMessageAt === "string"
                ? new Date(lead.metadata.lastMessageAt).toLocaleString(
                    "pt-BR",
                    {
                      dateStyle: "short",
                      timeStyle: "short",
                    },
                  )
                : "—"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted font-bold">Último recebido</span>
            <span className="font-extrabold text-xs">
              {typeof lead.metadata?.lastReceivedAt === "string"
                ? new Date(lead.metadata.lastReceivedAt).toLocaleString(
                    "pt-BR",
                    {
                      dateStyle: "short",
                      timeStyle: "short",
                    },
                  )
                : "—"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted font-bold">Último enviado</span>
            <span className="font-extrabold text-xs">
              {typeof lead.metadata?.lastSentAt === "string"
                ? new Date(lead.metadata.lastSentAt).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })
                : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Card: Comentários */}
      <div className="border border-line/25 bg-panel/30 rounded-xl p-5 flex flex-col gap-4">
        <span className="text-xs font-black text-app-text">Comentários</span>

        <div className="flex flex-col gap-2.5">
          {activities.filter((a) => a.activityType === "note").length > 0 ? (
            activities
              .filter((a) => a.activityType === "note")
              .map((act) => (
                <div
                  className="p-2.5 bg-panel/15 border border-line/15 rounded-lg flex flex-col gap-1"
                  key={act.id}
                >
                  <span className="text-xs font-bold text-app-text">
                    {act.content}
                  </span>
                  <span className="text-xs font-bold text-muted self-end">
                    {new Date(act.occurredAt).toLocaleString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))
          ) : (
            <div className="text-center py-2">
              <span className="text-xs font-bold text-muted">
                Nenhum comentário ainda.
              </span>
            </div>
          )}

          {/* Text Area Box */}
          <div className="border border-line/20 bg-panel/10 rounded-xl p-3 flex flex-col gap-2 mt-2">
            <textarea
              aria-label="Comentário interno"
              className="w-full min-h-[50px] bg-transparent text-xs font-bold text-app-text outline-none resize-none placeholder:text-muted/65"
              placeholder="Escreva um comentário... use @ para mencionar"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                !e.shiftKey &&
                (e.preventDefault(), void handlePostComment())
              }
            />
            <div className="flex items-center justify-between border-t border-line/10 pt-2">
              <button
                aria-label="Enviar comentário"
                className="flex size-7 cursor-pointer items-center justify-center rounded-full bg-blue-start text-inverse transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!commentText.trim()}
                onClick={() => void handlePostComment()}
                type="button"
              >
                <SendHorizontal aria-hidden="true" className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
