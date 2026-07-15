import { HandCoins, PlusCircle } from "lucide-react";
import { useState } from "react";
import {
  FeatureDialog,
  FeatureDialogActions,
} from "../../components/ui/FeatureOverlay";
import {
  pendingSellerEntries,
  type CommissionFilters,
  type CommissionSellerGroup,
} from "./commissionWorkspaceModel";
import {
  FinanceDateField,
  FinanceField,
  FinanceInput,
  FinanceSelect,
} from "./FinanceFormParts";
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
  onConfirm: (paidAt: string) => void;
  seller: CommissionSellerGroup;
}) {
  const entries = pendingSellerEntries(seller, filters);
  const totalCents = entries.reduce((sum, entry) => sum + entry.amountCents, 0);
  const [paidAt, setPaidAt] = useState(() => todayInput());

  return (
    <FeatureDialog
      isOpen
      onClose={onCancel}
      title="Confirmar pagamento"
      className="commission-dialog"
    >
      <div className="grid gap-4">
        <div className="rounded-lg border border-line bg-app p-4">
          <p className="text-sm font-bold text-muted">Marcar como pago para</p>
          <p className="text-xl font-black text-app-text">
            {seller.sellerName}
          </p>
          <p className="text-xs font-bold text-muted">
            {filters.from} até {filters.to}
          </p>
        </div>
        <div className="rounded-lg bg-accent-soft p-4 text-accent-strong">
          <p className="text-xs font-black uppercase">Total a pagar</p>
          <p className="text-2xl font-black">{formatCurrency(totalCents)}</p>
          <p className="text-sm font-bold">{entries.length} lançamento(s)</p>
        </div>
        <FinanceField label="Data do pagamento">
          <FinanceDateField
            label="Data do pagamento"
            onChange={setPaidAt}
            value={paidAt}
          />
        </FinanceField>
        <p className="rounded-lg border border-line bg-app p-3 text-xs font-bold text-muted">
          Os lançamentos serão fechados em uma única operação atômica. Se algum
          item tiver mudado desde a conferência, nada será baixado e a tela será
          atualizada. O filtro de origem atual também limita este fechamento.
        </p>
        <DialogActions
          confirmDisabled={!paidAt}
          confirmIcon={<HandCoins aria-hidden="true" className="size-4" />}
          confirmLabel="Confirmar pagamento"
          isLoading={isLoading}
          onCancel={onCancel}
          onConfirm={() => onConfirm(paidAt)}
        />
      </div>
    </FeatureDialog>
  );
}

function todayInput() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
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
      (sellerOptions[0]?.value === "unassigned"
        ? ""
        : (sellerOptions[0]?.value ?? "")),
  });
  const amount = Number(draft.amount.replace(",", "."));
  const canSubmit = draft.name.trim() && Number.isFinite(amount) && amount > 0;

  return (
    <FeatureDialog
      isOpen
      onClose={onCancel}
      title="Bônus manual"
      className="commission-dialog"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <FinanceField label="Vendedor">
          <FinanceSelect
            onChange={(sellerUserId) => setDraft({ ...draft, sellerUserId })}
            options={[
              { label: "Sem vendedor vinculado", value: "" },
              ...sellerOptions
                .filter((seller) => seller.value !== "unassigned")
                .map((seller) => ({
                  label: seller.label,
                  value: seller.value,
                })),
            ]}
            value={draft.sellerUserId}
          />
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
        <FinanceField label="Referência">
          <FinanceInput
            onChange={(event) =>
              setDraft({ ...draft, name: event.target.value })
            }
            value={draft.name}
          />
        </FinanceField>
        <FinanceField label="Vencimento">
          <FinanceDateField
            label="Vencimento"
            onChange={(dueAt) => setDraft({ ...draft, dueAt })}
            value={draft.dueAt}
          />
        </FinanceField>
        <FinanceField label="Observação">
          <FinanceInput
            onChange={(event) =>
              setDraft({ ...draft, notes: event.target.value })
            }
            value={draft.notes}
          />
        </FinanceField>
        <div className="md:col-span-2">
          <DialogActions
            confirmDisabled={!canSubmit}
            confirmIcon={<PlusCircle aria-hidden="true" className="size-4" />}
            confirmLabel="Salvar bônus"
            isLoading={isLoading}
            onCancel={onCancel}
            onConfirm={() => onConfirm(draft)}
          />
        </div>
      </div>
    </FeatureDialog>
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
    <FeatureDialogActions
      confirmDisabled={Boolean(confirmDisabled)}
      confirmIcon={confirmIcon}
      confirmLabel={confirmLabel}
      isLoading={isLoading}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
