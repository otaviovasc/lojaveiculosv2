import { HandCoins, PlusCircle, X } from "lucide-react";
import { useState } from "react";
import {
  pendingSellerEntries,
  type CommissionFilters,
  type CommissionSellerGroup,
} from "./commissionWorkspaceModel";
import { FinanceField, FinanceInput, FinanceSelect } from "./FinanceFormParts";
import { formatCurrency } from "./financeBillsFormat";

export type BonusDraft = {
  amount: string;
  dueAt: string;
  name: string;
  notes: string;
  sellerUserId: string;
};

export function ConfirmCommissionPayDialog({
  filters,
  isLoading,
  onCancel,
  onConfirm,
  seller,
}: {
  filters: CommissionFilters;
  isLoading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  seller: CommissionSellerGroup;
}) {
  const entries = pendingSellerEntries(seller, filters);
  const totalCents = entries.reduce((sum, entry) => sum + entry.amountCents, 0);

  return (
    <DialogShell onCancel={onCancel} title="Confirmar pagamento">
      <div className="grid gap-4">
        <div className="rounded-lg border border-line bg-app p-4">
          <p className="text-sm font-bold text-muted">Marcar como pago para</p>
          <p className="text-xl font-black text-app-text">{seller.sellerName}</p>
          <p className="text-xs font-bold text-muted">
            {filters.from} ate {filters.to}
          </p>
        </div>
        <div className="rounded-lg bg-accent-soft p-4 text-accent-strong">
          <p className="text-xs font-black uppercase">Total a pagar</p>
          <p className="text-2xl font-black">{formatCurrency(totalCents)}</p>
          <p className="text-sm font-bold">{entries.length} lancamento(s)</p>
        </div>
        <p className="rounded-lg border border-line bg-app p-3 text-xs font-bold text-muted">
          O V2 paga cada finance entry individualmente, preservando auditoria e
          permissoes por lancamento. O filtro de origem atual tambem limita este
          fechamento.
        </p>
        <DialogActions
          confirmIcon={<HandCoins aria-hidden="true" className="size-4" />}
          confirmLabel="Confirmar pagamento"
          isLoading={isLoading}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      </div>
    </DialogShell>
  );
}

export function BonusCommissionDialog({
  defaultDueAt,
  isLoading,
  onCancel,
  onConfirm,
  selectedSellerId,
  sellerOptions,
}: {
  defaultDueAt: string;
  isLoading: boolean;
  onCancel: () => void;
  onConfirm: (draft: BonusDraft) => void;
  selectedSellerId?: string;
  sellerOptions: Array<{ label: string; value: string }>;
}) {
  const [draft, setDraft] = useState<BonusDraft>({
    amount: "",
    dueAt: defaultDueAt,
    name: "",
    notes: "",
    sellerUserId:
      selectedSellerId ??
      (sellerOptions[0]?.value === "unassigned" ? "" : sellerOptions[0]?.value ?? ""),
  });
  const amount = Number(draft.amount.replace(",", "."));
  const canSubmit = draft.name.trim() && Number.isFinite(amount) && amount > 0;

  return (
    <DialogShell onCancel={onCancel} title="Bonus manual">
      <div className="grid gap-4 md:grid-cols-2">
        <FinanceField label="Vendedor">
          <FinanceSelect
            onChange={(event) =>
              setDraft({ ...draft, sellerUserId: event.target.value })
            }
            value={draft.sellerUserId}
          >
            <option value="">Sem vendedor vinculado</option>
            {sellerOptions
              .filter((seller) => seller.value !== "unassigned")
              .map((seller) => (
                <option key={seller.value} value={seller.value}>
                  {seller.label}
                </option>
              ))}
          </FinanceSelect>
        </FinanceField>
        <FinanceField label="Valor">
          <FinanceInput
            min="0.01"
            onChange={(event) =>
              setDraft({ ...draft, amount: event.target.value })
            }
            step="0.01"
            type="number"
            value={draft.amount}
          />
        </FinanceField>
        <FinanceField label="Referencia">
          <FinanceInput
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            value={draft.name}
          />
        </FinanceField>
        <FinanceField label="Vencimento">
          <FinanceInput
            onChange={(event) => setDraft({ ...draft, dueAt: event.target.value })}
            type="date"
            value={draft.dueAt}
          />
        </FinanceField>
        <FinanceField label="Observacao">
          <FinanceInput
            onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
            value={draft.notes}
          />
        </FinanceField>
        <div className="md:col-span-2">
          <DialogActions
            confirmDisabled={!canSubmit}
            confirmIcon={<PlusCircle aria-hidden="true" className="size-4" />}
            confirmLabel="Salvar bonus"
            isLoading={isLoading}
            onCancel={onCancel}
            onConfirm={() => onConfirm(draft)}
          />
        </div>
      </div>
    </DialogShell>
  );
}

function DialogShell({
  children,
  onCancel,
  title,
}: {
  children: React.ReactNode;
  onCancel: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Fechar dialogo"
        className="absolute inset-0 bg-overlay"
        onClick={onCancel}
        type="button"
      />
      <div className="relative w-full max-w-xl rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]">
        <div className="flex items-center justify-between gap-3 border-b border-line p-4">
          <h3 className="text-lg font-black text-app-text">{title}</h3>
          <button
            aria-label="Fechar"
            className="rounded-lg border border-line bg-app p-2 text-muted"
            onClick={onCancel}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function DialogActions({
  confirmDisabled,
  confirmIcon,
  confirmLabel,
  isLoading,
  onCancel,
  onConfirm,
}: {
  confirmDisabled?: boolean;
  confirmIcon: React.ReactNode;
  confirmLabel: string;
  isLoading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="flex flex-col justify-end gap-2 sm:flex-row">
      <button
        className="min-h-11 rounded-lg border border-line bg-app px-4 text-sm font-black text-app-text"
        disabled={isLoading}
        onClick={onCancel}
        type="button"
      >
        Cancelar
      </button>
      <button
        className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-black text-inverse disabled:opacity-60"
        disabled={isLoading || confirmDisabled}
        onClick={onConfirm}
        type="button"
      >
        {confirmIcon}
        {isLoading ? "Salvando" : confirmLabel}
      </button>
    </div>
  );
}
