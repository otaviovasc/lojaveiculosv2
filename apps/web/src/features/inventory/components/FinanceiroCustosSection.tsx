import { useState } from "react";
import { Ban, DollarSign, Filter, Paperclip, Pencil, Plus } from "lucide-react";
import { InventorySelect } from "./InventoryFormParts";
import {
  costFilterKinds,
  costKindLabel,
  type CostFilterKind,
  type CostItem,
  type FinanceiroCustosSectionProps,
} from "./FinanceiroCustosSectionModel";
import {
  FinanceiroCostFormDialog,
  FinanceiroCostVoidDialog,
} from "./FinanceiroCostDialogs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../../components/ui/tooltip";

export function FinanceiroCustosSection({
  addStatus,
  canCreate = true,
  canUpdate = true,
  canVoid = true,
  clearStatus,
  costs,
  formatBRL,
  isAdding = false,
  isUpdating = false,
  isVoiding = false,
  onAddCost,
  onDownloadReceipt,
  onUpdateCost,
  onVoidCost,
}: FinanceiroCustosSectionProps) {
  const [costFilterKind, setCostFilterKind] = useState<CostFilterKind>("Todos");
  const [editingCost, setEditingCost] = useState<CostItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [voidingCost, setVoidingCost] = useState<CostItem | null>(null);

  const filteredCosts = costs.filter(
    (cost) => costFilterKind === "Todos" || cost.kind === costFilterKind,
  );
  const activeFilteredCosts = filteredCosts.filter(
    (cost) => cost.status === "active",
  );
  const activeCount = costs.filter((cost) => cost.status === "active").length;
  const totalCostsSum = activeFilteredCosts.reduce(
    (sum, cost) => sum + cost.value,
    0,
  );

  const openCreate = () => {
    clearStatus?.();
    setEditingCost(null);
    setIsFormOpen(true);
  };
  const openEdit = (cost: CostItem) => {
    clearStatus?.();
    setEditingCost(cost);
    setIsFormOpen(true);
  };
  const openVoid = (cost: CostItem) => {
    clearStatus?.();
    setVoidingCost(cost);
  };

  return (
    <div className="vehicle-detail-card flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5">
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-4 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-black uppercase tracking-wider">
            Custos
          </h3>
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-black text-accent-strong">
            {activeCount} ativos
          </span>
          {costs.length > activeCount ? (
            <span className="text-xs font-bold text-muted">
              {costs.length - activeCount} estornados
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 border-r border-line pr-3 text-xs font-bold text-muted">
            <Filter aria-hidden="true" className="size-3.5" />
            <span>Tipo:</span>
            <InventorySelect
              ariaLabel="Filtrar custos por tipo"
              className="min-h-8 px-2 py-0 text-xs"
              onChange={(value) => {
                if (costFilterKinds.includes(value as CostFilterKind)) {
                  setCostFilterKind(value as CostFilterKind);
                }
              }}
              options={costFilterKinds.map((kind) => ({
                label: kind === "Todos" ? kind : costKindLabel(kind),
                value: kind,
              }))}
              value={costFilterKind}
            />
          </div>

          <button
            className="flex min-h-8 cursor-pointer items-center gap-1 rounded-lg bg-accent px-3.5 text-xs font-black text-accent-foreground transition-all hover:bg-accent-strong hover:text-accent-strong-foreground disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canCreate}
            onClick={openCreate}
            title={
              canCreate
                ? "Registrar novo custo"
                : "Sem permissão para registrar custos"
            }
            type="button"
          >
            <Plus aria-hidden="true" className="size-3.5" />
            <span>Novo custo</span>
          </button>
        </div>
      </div>

      {addStatus && !isFormOpen && !voidingCost ? (
        <p
          aria-live="polite"
          className="rounded-lg border border-danger/30 bg-danger/10 p-2.5 text-xs font-bold text-danger"
        >
          {addStatus}
        </p>
      ) : null}

      {filteredCosts.length ? (
        <div className="flex flex-col gap-2.5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs font-bold">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wider text-muted">
                  <th className="py-2">Conta / Descrição</th>
                  <th className="py-2">Tipo</th>
                  <th className="py-2">Data</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Valor</th>
                  <th className="py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredCosts.map((cost) => (
                  <tr
                    className={
                      cost.status === "voided"
                        ? "border-b border-line/30 opacity-70 transition-colors hover:bg-app/10"
                        : "border-b border-line/30 transition-colors hover:bg-app/10"
                    }
                    key={cost.id}
                  >
                    <td className="py-3 font-black text-app-text">
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            cost.status === "voided" ? "line-through" : ""
                          }
                        >
                          {cost.account}
                        </span>
                        {cost.receipt ? (
                          <CostIconAction
                            label={`Visualizar comprovante ${cost.receipt.fileName}`}
                            onClick={() =>
                              onDownloadReceipt?.(cost.receipt!.id)
                            }
                          >
                            <Paperclip
                              aria-hidden="true"
                              className="size-3.5"
                            />
                          </CostIconAction>
                        ) : null}
                      </div>
                      {cost.status === "voided" && cost.voidReason ? (
                        <span className="mt-1 block max-w-md text-xs font-bold text-muted">
                          Motivo: {cost.voidReason}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3">
                      <span className="rounded-full border border-line bg-app px-2.5 py-0.5 text-xs font-black text-muted">
                        {cost.kindLabel}
                      </span>
                    </td>
                    <td className="py-3 text-muted">{cost.date}</td>
                    <td className="py-3">
                      <span
                        className={
                          cost.status === "active"
                            ? "rounded-full bg-green-soft px-2.5 py-1 text-xs font-black text-success-strong"
                            : "rounded-full bg-app-elevated px-2.5 py-1 text-xs font-black text-muted"
                        }
                      >
                        {cost.status === "active" ? "Ativo" : "Estornado"}
                      </span>
                    </td>
                    <td
                      className={
                        cost.status === "voided"
                          ? "py-3 text-right font-black text-muted line-through"
                          : "py-3 text-right font-black text-app-text"
                      }
                    >
                      {formatBRL(cost.value)}
                    </td>
                    <td className="py-3 text-right">
                      {cost.status === "active" ? (
                        <div className="inline-flex items-center gap-1">
                          {canUpdate && onUpdateCost ? (
                            <CostIconAction
                              label={`Corrigir custo ${cost.account}`}
                              onClick={() => openEdit(cost)}
                            >
                              <Pencil aria-hidden="true" className="size-3.5" />
                            </CostIconAction>
                          ) : null}
                          {canVoid && onVoidCost ? (
                            <CostIconAction
                              danger
                              label={`Estornar custo ${cost.account}`}
                              onClick={() => openVoid(cost)}
                            >
                              <Ban aria-hidden="true" className="size-3.5" />
                            </CostIconAction>
                          ) : null}
                          {!canUpdate && !canVoid ? (
                            <span className="text-xs font-bold text-muted">
                              Somente leitura
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-muted">
                          Histórico preservado
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-1 flex items-center justify-between rounded-xl border-t border-line bg-app/5 p-3.5 pt-3">
            <span className="text-xs font-black uppercase tracking-wider text-muted">
              Soma dos custos ativos
            </span>
            <span className="text-sm font-black text-accent-strong">
              {formatBRL(totalCostsSum)}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line bg-app/10 py-12 text-center">
          <DollarSign aria-hidden="true" className="size-8 text-muted" />
          <div>
            <p className="text-xs font-black text-app-text">
              Nenhum custo registrado com este filtro.
            </p>
            <p className="mt-1 text-xs font-bold text-muted">
              {canCreate
                ? 'Use "Novo custo" para registrar um gasto.'
                : "Você possui acesso somente para consulta."}
            </p>
          </div>
        </div>
      )}

      <FinanceiroCostFormDialog
        cost={editingCost}
        isSaving={editingCost ? isUpdating : isAdding}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingCost(null);
          clearStatus?.();
        }}
        onSave={(input) =>
          editingCost && onUpdateCost
            ? onUpdateCost(
                editingCost.id,
                input.account,
                input.value,
                input.kind,
                input.costDate,
              )
            : onAddCost(
                input.account,
                input.value,
                input.kind,
                input.costDate,
                input.file,
              )
        }
        open={isFormOpen}
        status={addStatus}
      />
      <FinanceiroCostVoidDialog
        cost={voidingCost}
        isSaving={isVoiding}
        onOpenChange={(open) => {
          if (!open) setVoidingCost(null);
          clearStatus?.();
        }}
        onVoid={(reason) =>
          voidingCost && onVoidCost
            ? onVoidCost(voidingCost.id, reason)
            : Promise.resolve(false)
        }
        open={Boolean(voidingCost)}
        status={addStatus}
      />
    </div>
  );
}

function CostIconAction({
  children,
  danger = false,
  label,
  onClick,
}: {
  children: React.ReactNode;
  danger?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label={label}
          className={
            danger
              ? "inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-danger-soft-foreground transition-colors hover:bg-danger/10"
              : "inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted transition-colors hover:bg-line/25 hover:text-accent-text"
          }
          onClick={onClick}
          title={label}
          type="button"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
