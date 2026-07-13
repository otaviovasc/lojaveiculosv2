import { Car, Clock, Edit, Eye, Layers, Trash2, User } from "lucide-react";
import type { ReactNode } from "react";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import {
  FeatureEmptyState,
  FeatureStatusBadge,
} from "../../components/ui/FeatureStates";
import {
  canPersistSaleWorkspaceEdits,
  formatCents,
  paymentPrincipalTotal,
} from "./salesModel";
import {
  getSaleRequirementsScore,
  salesStatusLabels,
  saleStatusTone,
} from "./SalesListModel";
import type { SaleRecord } from "./types";

export function SalesListCards({
  filteredCount,
  onCreate,
  onDeleteRequest,
  onEdit,
  onView,
  sales,
}: {
  filteredCount: number;
  onCreate: () => void;
  onDeleteRequest: (sale: SaleRecord) => void;
  onEdit: (sale: SaleRecord) => void;
  onView: (sale: SaleRecord) => void;
  sales: readonly SaleRecord[];
}) {
  if (filteredCount === 0) return <SalesEmptyState onCreate={onCreate} />;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sales.map((sale) => (
        <SaleCard
          key={sale.id}
          onDeleteRequest={onDeleteRequest}
          onEdit={onEdit}
          onView={onView}
          sale={sale}
        />
      ))}
    </div>
  );
}

function SalesEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <FeatureEmptyState
      action={
        <FeatureActionButton
          icon={Layers}
          label="Criar Primeiro Rascunho"
          onClick={onCreate}
        />
      }
      body="Não encontramos registros para o status ou filtro pesquisado. Crie um rascunho de venda para começar."
      icon={Layers}
      title="Nenhuma venda encontrada"
    />
  );
}

function SaleCard({
  onDeleteRequest,
  onEdit,
  onView,
  sale,
}: {
  onDeleteRequest: (sale: SaleRecord) => void;
  onEdit: (sale: SaleRecord) => void;
  onView: (sale: SaleRecord) => void;
  sale: SaleRecord;
}) {
  const score = getSaleRequirementsScore(sale);
  const docsCount =
    (sale.selectedDocumentKinds?.length ?? 0) +
    (sale.documentPolicySnapshot?.emitirNFe ? 1 : 0);
  const canDelete = sale.status === "draft";
  const canEdit = canPersistSaleWorkspaceEdits(sale);

  return (
    <div className="sales-glass-panel bg-panel border border-line rounded-2xl flex flex-col justify-between overflow-hidden shadow-sm hover:translate-y-[-2px] transition-all duration-300">
      <div
        className={["h-1.5 w-full", saleStatusAccentClass(sale.status)].join(
          " ",
        )}
      />

      <div className="p-5 flex-1 flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-line/45 pb-3">
          <div className="flex items-center gap-1.5 text-xs font-black text-accent-strong uppercase tracking-wider">
            <Clock className="size-3.5 text-accent shrink-0" />
            <span>
              {new Date(sale.updatedAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>

          <FeatureStatusBadge
            className="shrink-0 uppercase text-xs px-2 py-0.5 font-black tracking-wider"
            tone={saleStatusTone(sale.status)}
          >
            {salesStatusLabels[sale.status]}
          </FeatureStatusBadge>
        </div>

        <div className="flex items-center gap-3 bg-app-elevated/20 p-2 rounded-xl border border-line/45">
          <div className="size-12 rounded-lg bg-app-elevated border border-line/50 overflow-hidden flex items-center justify-center shrink-0">
            {sale.listingSnapshot?.primaryMediaUrl ? (
              <img
                alt={String(sale.listingSnapshot.title || "Veículo")}
                className="w-full h-full object-cover"
                src={String(sale.listingSnapshot.primaryMediaUrl)}
              />
            ) : (
              <Car className="size-5 text-muted/40" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-black text-app-text uppercase tracking-wider truncate leading-tight">
              {String(
                sale.listingSnapshot?.title || "Veículo não especificado",
              )}
            </h3>
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs font-bold text-muted uppercase mt-1">
              {!!sale.listingSnapshot?.colorName && (
                <span>Cor: {String(sale.listingSnapshot.colorName)}</span>
              )}
              {!!(
                sale.listingSnapshot?.colorName &&
                (sale.listingSnapshot?.plate || sale.listingSnapshot?.unitLabel)
              ) && <span className="text-line-strong">•</span>}
              {sale.listingSnapshot?.plate ? (
                <span className="text-accent-strong font-black">
                  PLACA: {String(sale.listingSnapshot.plate)}
                </span>
              ) : sale.listingSnapshot?.unitLabel ? (
                <span className="text-accent-strong font-black">
                  ESTOQUE: {String(sale.listingSnapshot.unitLabel)}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-app-elevated/20 p-2.5 rounded-xl border border-line/40 text-xs font-bold text-app-text min-w-0">
          <User className="size-4 text-muted shrink-0" />
          <span className="truncate">
            Cliente:{" "}
            <strong className="font-black">
              {String(sale.buyerSnapshot?.name || "Pendente")}
            </strong>
          </span>
        </div>

        <div className="flex justify-between items-center bg-app-elevated/10 p-2.5 rounded-xl border border-line/30">
          <span className="text-xs font-black text-muted uppercase tracking-wider">
            Valor Acordado
          </span>
          <strong className="text-sm font-black text-accent-strong">
            {sale.salePriceCents
              ? formatCents(sale.salePriceCents)
              : "Pendente"}
          </strong>
        </div>

        <div className="flex flex-col gap-2.5 mt-1">
          <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider text-muted">
            <span>Documentos Selecionados</span>
            <span className="text-accent-strong font-black">
              {docsCount} selecionado{docsCount !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs font-black uppercase tracking-wider text-muted">
              <span>Validação Interna</span>
              <span
                className={
                  score.completed === score.total ? "text-emerald-500" : ""
                }
              >
                {score.completed}/{score.total} requisitos
              </span>
            </div>
            <div className="h-1.5 bg-line rounded-full overflow-hidden">
              <div
                className={
                  score.completed === score.total
                    ? "h-full rounded-full transition-all duration-500 bg-emerald-500"
                    : "h-full rounded-full transition-all duration-500 bg-accent"
                }
                style={{ width: `${(score.completed / score.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div
        className={[
          "px-5 py-4 bg-app-elevated/35 border-t border-line/45 grid gap-1.5",
          canDelete ? "grid-cols-3" : "grid-cols-2",
        ].join(" ")}
      >
        <SaleCardAction
          icon={<Eye className="size-3.5" />}
          onClick={() => onView(sale)}
        >
          Detalhar
        </SaleCardAction>
        <SaleCardAction
          icon={
            canEdit ? (
              <Edit className="size-3.5" />
            ) : (
              <Eye className="size-3.5" />
            )
          }
          onClick={() => onEdit(sale)}
        >
          {canEdit ? "Editar" : "Visualizar"}
        </SaleCardAction>
        {canDelete ? (
          <SaleCardAction
            icon={<Trash2 className="size-3.5 text-muted" />}
            onClick={() => onDeleteRequest(sale)}
            tone="danger"
          >
            Deletar
          </SaleCardAction>
        ) : null}
      </div>
    </div>
  );
}

function SaleCardAction({
  children,
  icon,
  onClick,
  tone = "default",
}: {
  children: string;
  icon: ReactNode;
  onClick: () => void;
  tone?: "danger" | "default";
}) {
  const hoverClass =
    tone === "danger"
      ? "hover:border-rose-500/30 hover:bg-rose-500/5 hover:text-rose-500"
      : "hover:border-accent/30 hover:bg-accent/5 hover:text-accent-strong";
  return (
    <button
      className={[
        "sales-secondary-button !min-h-9 !h-9 !py-0 !px-1 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1",
        hoverClass,
      ].join(" ")}
      onClick={onClick}
      type="button"
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

function saleStatusAccentClass(status: SaleRecord["status"]) {
  if (status === "closed") return "bg-emerald-500";
  if (status === "pending") return "bg-amber-500";
  if (status === "cancelled") return "bg-muted";
  return "bg-blue-500";
}
