import { BadgeCheck, Ban, Loader2 } from "lucide-react";
import { FeatureDialog } from "../../components/ui/FeatureOverlay";
import { featureLabels, featureValueCopy, statusLabels } from "./billingFormat";
import type {
  BillingEntitlementMatrixRow,
  BillingEntitlementStatus,
  EntitlementKey,
} from "./types";

export function BillingFeatureDialog({
  isSaving,
  onClose,
  onReasonChange,
  onUpdate,
  priceLabel,
  reason,
  row,
}: {
  isSaving: boolean;
  onClose: () => void;
  onReasonChange: (featureKey: EntitlementKey, reason: string) => void;
  onUpdate: (
    featureKey: EntitlementKey,
    status: BillingEntitlementStatus,
  ) => Promise<void>;
  priceLabel: string;
  reason: string;
  row: BillingEntitlementMatrixRow | null;
}) {
  if (!row) return null;
  const label = featureLabels[row.featureKey];

  const updateAndClose = async (status: BillingEntitlementStatus) => {
    await onUpdate(row.featureKey, status);
    onClose();
  };

  return (
    <FeatureDialog
      className="billing-feature-dialog"
      isOpen={Boolean(row)}
      onClose={onClose}
      title={`Gerenciar ${label}`}
    >
      <div className="billing-feature-dialog-body">
        <span
          className={
            row.status === "inactive" || row.status === "suspended"
              ? "billing-status-badge is-disabled"
              : "billing-status-badge is-enabled"
          }
        >
          {row.status === "inactive" || row.status === "suspended" ? (
            <Ban aria-hidden="true" className="size-4" />
          ) : (
            <BadgeCheck aria-hidden="true" className="size-4" />
          )}
          {statusLabels[row.status]}
        </span>
        <p>{featureValueCopy[row.featureKey]}</p>
        <dl className="billing-feature-facts">
          <div>
            <dt>Preco</dt>
            <dd>{priceLabel}</dd>
          </div>
          <div>
            <dt>Limite</dt>
            <dd>{row.limitValue === null ? "Sem limite" : row.limitValue}</dd>
          </div>
          <div>
            <dt>Origem</dt>
            <dd>{row.includedInPlan ? "Plano atual" : "Add-on"}</dd>
          </div>
        </dl>
        <label className="billing-feature-reason">
          <span>Motivo da alteracao</span>
          <input
            onChange={(event) =>
              onReasonChange(row.featureKey, event.target.value)
            }
            placeholder="Ex.: loja solicitou ativacao do recurso"
            value={reason}
          />
        </label>
        <div className="billing-dialog-actions">
          <button
            disabled={isSaving || row.status === "active"}
            onClick={() => void updateAndClose("active")}
            type="button"
          >
            {isSaving ? (
              <Loader2 aria-hidden="true" className="size-4" />
            ) : null}
            Ativar
          </button>
          <button
            disabled={isSaving || row.status === "suspended"}
            onClick={() => void updateAndClose("suspended")}
            type="button"
          >
            Suspender
          </button>
          <button
            disabled={isSaving || row.status === "inactive"}
            onClick={() => void updateAndClose("inactive")}
            type="button"
          >
            Inativar
          </button>
        </div>
      </div>
    </FeatureDialog>
  );
}
