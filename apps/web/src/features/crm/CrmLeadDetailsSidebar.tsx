import { useState } from "react";
import { Plus, User, Smile, SendHorizontal, Phone, Mail } from "lucide-react";
import type { LeadVehicleOption } from "./CrmPipelineViewTypes";
import type { ProductCrmLead, ProductCrmLeadActivity } from "./productCrmTypes";

type Props = {
  lead: ProductCrmLead;
  leadName: string;
  activities: ProductCrmLeadActivity[];
  vehicleOptions: LeadVehicleOption[];
  leadVehicles: LeadVehicleOption[];
  onUpdateLead: (leadId: string, input: any) => Promise<void>;
  onCreateActivity: (leadId: string, input: any) => Promise<void>;
};

export function CrmLeadDetailsSidebar({
  lead,
  leadName,
  activities,
  vehicleOptions,
  leadVehicles,
  onUpdateLead,
  onCreateActivity,
}: Props) {
  const [commentText, setCommentText] = useState("");
  const [showAddVehicle, setShowAddVehicle] = useState(false);

  const handleAddVehicle = async (vehicleId: string) => {
    const listingIds: string[] = Array.isArray(lead.metadata?.listingIds)
      ? (lead.metadata.listingIds as string[])
      : lead.listingId
        ? [lead.listingId]
        : [];
    if (listingIds.includes(vehicleId)) return;
    const nextIds = [...listingIds, vehicleId];
    await onUpdateLead(lead.id, {
      metadata: { ...lead.metadata, listingIds: nextIds },
    });
    setShowAddVehicle(false);
  };

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
            Veículos ({leadVehicles.length || 1})
          </span>
          <button
            className="inline-flex h-7 items-center justify-center gap-1 rounded-lg border border-line bg-panel/15 px-2.5 text-[10px] font-black text-app-text hover:bg-line/20 transition-colors cursor-pointer"
            onClick={() => setShowAddVehicle(!showAddVehicle)}
            type="button"
          >
            <Plus className="size-3" />
            <span>Veículo</span>
          </button>
        </div>

        {showAddVehicle && (
          <div className="absolute top-12 right-5 z-40 w-56 bg-panel border border-line rounded-xl shadow-xl p-2.5 max-h-48 overflow-y-auto">
            <span className="text-[9px] font-black uppercase text-muted block mb-1">
              Selecione o veículo
            </span>
            {vehicleOptions.map((opt) => (
              <button
                className="w-full text-left px-2 py-1 text-xs font-bold hover:bg-line/15 rounded truncate cursor-pointer"
                key={opt.id}
                onClick={() => void handleAddVehicle(opt.id)}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

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
                    <span className="text-[10px]">🚗</span>
                  </div>
                )}
                <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                  <span className="text-xs font-black text-app-text truncate">
                    ⭐ {v.label}
                  </span>
                  <span className="text-[10px] font-bold text-muted">
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
            <div className="flex items-center gap-3 p-2 rounded-lg bg-panel/10 border border-line/15">
              <div className="w-10 h-7 rounded bg-line/25 flex items-center justify-center shrink-0">
                <span className="text-[10px]">🚗</span>
              </div>
              <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                <span className="text-xs font-black text-app-text truncate">
                  ⭐ Ford Ranger 2024
                </span>
                <span className="text-[10px] font-black text-app-text">
                  R$ 410.000
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border border-line/25 bg-panel/30 rounded-xl p-5 flex flex-col gap-3">
        <span className="text-xs font-black text-app-text">Datas</span>
        <div className="flex flex-col gap-2.5 text-xs mt-1">
          <div className="flex justify-between items-center">
            <span className="text-muted/70 font-bold">Entrada</span>
            <span className="font-extrabold text-[11px]">
              {lead.createdAt
                ? new Date(lead.createdAt).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })
                : "—"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted/70 font-bold">Última atividade</span>
            <span className="font-extrabold text-[11px]">
              {lead.lastInteractionAt
                ? new Date(lead.lastInteractionAt).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })
                : "—"}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted/70 font-bold">Última mensagem</span>
            <span className="font-extrabold text-[11px]">
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
            <span className="text-muted/70 font-bold">Último recebido</span>
            <span className="font-extrabold text-[11px]">
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
            <span className="text-muted/70 font-bold">Último enviado</span>
            <span className="font-extrabold text-[11px]">
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
                  <span className="text-[9px] font-bold text-muted self-end">
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
                className="text-muted hover:text-app-text transition-colors p-1"
                type="button"
              >
                <Smile className="size-4" />
              </button>
              <button
                onClick={() => void handlePostComment()}
                className="size-7 rounded-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center text-white transition-colors cursor-pointer"
                type="button"
              >
                <SendHorizontal className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
