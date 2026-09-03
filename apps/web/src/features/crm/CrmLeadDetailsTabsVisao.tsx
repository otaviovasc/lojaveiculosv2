import {
  Calendar,
  Car,
  CheckSquare,
  Clock,
  ExternalLink,
  MessageSquare,
  PhoneCall,
  Plus,
  ReceiptText,
  Sparkles,
  StickyNote,
  User,
} from "lucide-react";
import type { LeadVehicleOption } from "./CrmPipelineViewTypes";
import type { CrmLeadLinkedRecordsState } from "./crmLeadLinkedRecords";
import {
  formatBrlCents,
  getLeadStageId,
  getLinkedLeadVehicles,
} from "./crmLeadData";
import { useCrmLeadOwnerName } from "./useCrmLeadOwnerName";
import { formatCents } from "../sales/salesModel";
import type { SaleStatus } from "../sales/types";
import type { ProductCrmLead, ProductCrmLeadActivity } from "./productCrmTypes";
import type { PipelineStage } from "./crmPipelineStorage";
import { cn } from "../../lib/utils";

type Props = {
  lead: ProductCrmLead;
  activities: ProductCrmLeadActivity[];
  linkedRecords: CrmLeadLinkedRecordsState;
  stages: PipelineStage[];
  vehicleOptions: LeadVehicleOption[];
  onOpenSaleModal?: (saleId?: string) => void;
};

export function CrmLeadDetailsTabsVisao({
  lead,
  activities,
  linkedRecords,
  stages,
  vehicleOptions,
  onOpenSaleModal,
}: Props) {
  const leadVehicles = getLinkedLeadVehicles(lead, vehicleOptions);
  const primaryVehicle = leadVehicles[0];
  const ownerName = useCrmLeadOwnerName(lead);
  const ownerLabel =
    ownerName === undefined
      ? "Carregando..."
      : (ownerName ?? "Sem responsável");
  const valueFormatted = lead.listingId
    ? formatBrlCents(primaryVehicle?.priceCents)
    : "Sob consulta";

  const activeStageId = getLeadStageId(lead);
  const currentStage = stages.find((s) => s.id === activeStageId) ?? stages[0];
  const currentStageIndex = stages.findIndex((s) => s.id === activeStageId);
  const activeIndex = currentStageIndex >= 0 ? currentStageIndex : 0;

  // pending tasks
  const pendingTasks = activities.filter((a) => a.activityType === "task");
  const nextTask = pendingTasks[0];

  // last interaction
  const lastActivity = activities[0];

  return (
    <div className="flex flex-col gap-6 text-app-text select-none">
      {/* 3-Column Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-line/25 bg-panel/30 rounded-xl p-4 flex flex-col justify-between min-h-[96px]">
          <span className="text-xs font-black uppercase text-muted tracking-wider">
            Fase do Funil
          </span>
          <div className="flex items-center gap-2 my-1">
            <span
              className="inline-block size-2.5 rounded-full shrink-0"
              style={{
                backgroundColor: currentStage?.color || "var(--color-primary)",
              }}
            />
            <span className="text-sm font-black text-app-text truncate">
              {currentStage?.name || "Novo Lead"}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-2">
            {stages.map((s, i) => (
              <div
                key={s.id}
                className={
                  "h-1.5 flex-1 rounded-full transition-all " +
                  (i <= activeIndex ? "bg-primary" : "bg-line/25")
                }
                style={
                  i <= activeIndex && s.color
                    ? { backgroundColor: s.color }
                    : undefined
                }
              />
            ))}
          </div>
        </div>

        <div className="border border-line/25 bg-panel/30 rounded-xl p-4 flex flex-col justify-between min-h-[96px]">
          <span className="text-xs font-black uppercase text-muted tracking-wider">
            Valor Estimado
          </span>
          <span className="text-base font-black text-app-text my-1 truncate">
            {valueFormatted}
          </span>
          <span className="text-xs font-bold text-muted truncate">
            {primaryVehicle ? primaryVehicle.label : "Sem veículo vinculado"}
          </span>
        </div>

        <div className="border border-line/25 bg-panel/30 rounded-xl p-4 flex flex-col justify-between min-h-[96px]">
          <span className="text-xs font-black uppercase text-muted tracking-wider">
            Responsável
          </span>
          <div className="flex items-center gap-2 my-1 text-sm font-black text-app-text">
            <span className="grid size-6 place-items-center rounded-full bg-primary/15 text-primary text-xs font-black">
              <User aria-hidden="true" className="size-3.5" />
            </span>
            <span className="truncate">{ownerLabel}</span>
          </div>
          <span className="text-xs font-bold text-muted">
            Atendente da loja
          </span>
        </div>
      </div>

      {/* Vehicle of Interest Card (if linked) */}
      {primaryVehicle ? (
        <div className="border border-line/25 bg-panel/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            {primaryVehicle.imageUrl ? (
              <img
                alt={primaryVehicle.label}
                className="w-16 h-12 rounded-lg object-cover border border-line/30 shrink-0 bg-app-elevated"
                src={primaryVehicle.imageUrl}
              />
            ) : (
              <div className="w-16 h-12 rounded-lg bg-line/20 flex items-center justify-center shrink-0 border border-line/25">
                <Car className="size-6 text-muted" />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-black uppercase tracking-wider text-muted">
                Veículo de Interesse
              </span>
              <strong className="text-sm font-black text-app-text truncate">
                {primaryVehicle.label}
              </strong>
              <span className="text-xs font-black text-primary mt-0.5">
                {primaryVehicle.priceCents
                  ? formatBrlCents(primaryVehicle.priceCents)
                  : "Preço sob consulta"}
              </span>
            </div>
          </div>

          <a
            className="inline-flex items-center gap-1.5 rounded-lg border border-line/35 bg-panel/50 px-3 py-1.5 text-xs font-black text-app-text hover:bg-line/15 transition-colors shrink-0"
            href={`#/inventory?vehicleId=${primaryVehicle.id}`}
          >
            <ExternalLink className="size-3.5 text-muted" />
            <span>Ver no estoque</span>
          </a>
        </div>
      ) : null}

      {/* Linked Sales Panel */}
      <LinkedSalesPanel
        linkedRecords={linkedRecords}
        onOpenSaleModal={onOpenSaleModal}
      />

      {/* Split Next Task / Last Interaction */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-line/25 bg-panel/30 rounded-xl p-4 flex flex-col gap-2">
          <span className="text-xs font-black uppercase text-muted tracking-wider">
            Próxima tarefa
          </span>
          {nextTask ? (
            <div className="flex flex-col gap-1 mt-0.5">
              <p className="text-xs font-black text-app-text">
                {nextTask.content}
              </p>
              {typeof nextTask.metadata?.dueAt === "string" && (
                <span className="text-xs font-bold text-muted flex items-center gap-1">
                  <Calendar className="size-3 text-muted/70" />
                  <span>
                    Prazo:{" "}
                    {new Date(nextTask.metadata.dueAt).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs font-bold text-muted mt-1">
              Nenhuma tarefa pendente no momento.
            </p>
          )}
        </div>

        <div className="border border-line/25 bg-panel/30 rounded-xl p-4 flex flex-col gap-2">
          <span className="text-xs font-black uppercase text-muted tracking-wider">
            Última interação
          </span>
          {lastActivity ? (
            <div className="flex flex-col gap-1 mt-0.5 min-w-0">
              <p className="text-xs font-black text-app-text truncate">
                {lastActivity.content}
              </p>
              <span className="text-xs font-bold text-muted flex items-center gap-1">
                <Clock className="size-3 text-muted/70" />
                <span>
                  {new Date(lastActivity.occurredAt).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </span>
            </div>
          ) : (
            <p className="text-xs font-bold text-muted mt-1">
              Nenhuma interação registrada ainda.
            </p>
          )}
        </div>
      </div>

      {/* Activity Feed / Timeline */}
      <div className="flex flex-col gap-3.5 mt-2">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-muted tracking-wider">
          <Clock aria-hidden="true" className="size-4 text-muted" />
          <span>Histórico de Atividades</span>
        </div>
        <div className="flex flex-col pl-3 relative before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-line/25 gap-4">
          {activities.length > 0 ? (
            activities.map((act) => (
              <div
                key={act.id}
                className="relative pl-6 flex items-start justify-between gap-4"
              >
                <span className="absolute left-1 top-0.5 grid size-5 -translate-x-1/2 place-items-center rounded-full bg-panel border border-line">
                  {renderActivityIcon(act.activityType)}
                </span>
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <span className="text-xs font-bold text-app-text leading-relaxed">
                    {act.content}
                  </span>
                </div>
                <span className="text-xs font-bold text-muted shrink-0">
                  {new Date(act.occurredAt).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </div>
            ))
          ) : (
            <div className="relative pl-6 flex items-start justify-between gap-4">
              <span className="absolute left-1 top-0.5 grid size-5 -translate-x-1/2 place-items-center rounded-full bg-panel border border-line">
                <Sparkles className="size-3 text-primary" />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-app-text">
                  Lead cadastrado no CRM
                </span>
              </div>
              <span className="text-xs font-bold text-muted shrink-0">
                {new Date(lead.createdAt).toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function renderActivityIcon(type: string) {
  switch (type) {
    case "task":
      return <CheckSquare className="size-3 text-blue-500" />;
    case "call":
      return <PhoneCall className="size-3 text-amber-500" />;
    case "note":
      return <StickyNote className="size-3 text-emerald-500" />;
    case "message":
      return <MessageSquare className="size-3 text-purple-500" />;
    default:
      return <Clock className="size-3 text-muted" />;
  }
}

function LinkedSalesPanel({
  linkedRecords,
  onOpenSaleModal,
}: {
  linkedRecords: CrmLeadLinkedRecordsState;
  onOpenSaleModal?: (saleId?: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-black uppercase text-muted tracking-wider">
          <ReceiptText aria-hidden="true" className="size-4 text-muted" />
          <span>Vendas vinculadas</span>
        </div>
        {onOpenSaleModal ? (
          <button
            className="inline-flex items-center gap-1 text-xs font-black text-primary hover:underline cursor-pointer"
            onClick={() => onOpenSaleModal()}
            type="button"
          >
            <Plus aria-hidden="true" className="size-3.5" />
            Nova venda
          </button>
        ) : null}
      </div>
      {linkedRecords.kind === "loading" ? (
        <p className="rounded-xl border border-line/20 bg-panel/10 p-4 text-xs font-bold text-muted">
          Carregando vendas vinculadas...
        </p>
      ) : linkedRecords.kind === "error" ? (
        <p className="rounded-xl border border-line/20 bg-panel/10 p-4 text-xs font-bold text-muted">
          {linkedRecords.message}
        </p>
      ) : linkedRecords.sales.length === 0 ? (
        <div className="rounded-xl border border-line/20 bg-panel/10 p-4 text-xs font-bold text-muted flex items-center justify-between gap-3 flex-wrap">
          <span>Nenhuma venda vinculada a este cliente ainda.</span>
          {onOpenSaleModal ? (
            <button
              className="crm-action crm-action-primary text-xs cursor-pointer"
              onClick={() => onOpenSaleModal()}
              type="button"
            >
              Iniciar venda
            </button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {linkedRecords.sales.map((sale) => (
            <article
              className={cn(
                "rounded-xl border border-line/25 bg-panel/20 p-4 transition-all",
                onOpenSaleModal &&
                  "hover:border-primary/50 hover:bg-panel/40 cursor-pointer",
              )}
              key={sale.id}
              onClick={() => onOpenSaleModal?.(sale.id)}
              onKeyDown={
                onOpenSaleModal
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpenSaleModal(sale.id);
                      }
                    }
                  : undefined
              }
              role={onOpenSaleModal ? "button" : undefined}
              tabIndex={onOpenSaleModal ? 0 : undefined}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <strong className="break-words text-sm font-black text-app-text">
                    {saleTitle(sale)}
                  </strong>
                  <p className="mt-1 text-xs font-bold text-muted">
                    {sale.buyerSnapshot.name
                      ? String(sale.buyerSnapshot.name)
                      : "Comprador sem nome"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-line/30 bg-panel px-2.5 py-0.5 text-xs font-black text-muted uppercase">
                  {saleStatusLabel(sale.status)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-muted border-t border-line/15 pt-2">
                <span className="font-black text-app-text">
                  {formatCents(sale.salePriceCents)}
                </span>
                {onOpenSaleModal ? (
                  <span className="font-black text-primary hover:underline">
                    Abrir venda →
                  </span>
                ) : (
                  <span>Rev. {sale.revision}</span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function saleTitle(sale: CrmLeadLinkedRecordsState["sales"][number]) {
  if (typeof sale.listingSnapshot.title === "string") {
    return sale.listingSnapshot.title;
  }
  return sale.listingId ? `Venda ${sale.listingId.slice(0, 8)}` : "Venda";
}

function saleStatusLabel(status: SaleStatus) {
  const labels: Record<SaleStatus, string> = {
    cancelled: "Cancelada",
    closed: "Fechada",
    draft: "Rascunho",
    pending: "Reservada",
  };
  return labels[status];
}
