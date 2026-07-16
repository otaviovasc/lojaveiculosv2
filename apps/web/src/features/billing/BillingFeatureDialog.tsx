import { BadgeCheck, PackagePlus, ShieldCheck } from "lucide-react";
import { FeatureDialog } from "../../components/ui/FeatureOverlay";
import { featureLabels, featureValueCopy, isEnabled } from "./billingFormat";
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
  void isSaving;
  void onReasonChange;
  void onUpdate;
  void reason;
  const label = featureLabels[row.featureKey];
  const enabled = isEnabled(row.status);

  return (
    <FeatureDialog
      className="billing-feature-dialog"
      icon={
        enabled ? (
          <BadgeCheck aria-hidden="true" />
        ) : (
          <PackagePlus aria-hidden="true" />
        )
      }
      isOpen={Boolean(row)}
      onClose={onClose}
      title={enabled ? `Seu pacote ${label}` : `Adicione ${label}`}
    >
      <div className="billing-feature-dialog-body">
        <span
          className={
            enabled
              ? "billing-status-badge is-enabled"
              : "billing-status-badge is-disabled"
          }
        >
          {enabled ? (
            <BadgeCheck aria-hidden="true" className="size-4" />
          ) : (
            <PackagePlus aria-hidden="true" className="size-4" />
          )}
          {enabled ? "Já faz parte da assinatura" : "Disponível para adicionar"}
        </span>
        <p>{featureValueCopy[row.featureKey]}</p>
        <dl className="billing-feature-facts">
          <div>
            <dt>Investimento</dt>
            <dd>{priceLabel}</dd>
          </div>
          <div>
            <dt>Uso</dt>
            <dd>
              {row.limitValue === null
                ? "Incluído no pacote"
                : `Até ${row.limitValue.toLocaleString("pt-BR")} por mês`}
            </dd>
          </div>
          <div>
            <dt>Flexibilidade</dt>
            <dd>Adicional ao plano base</dd>
          </div>
        </dl>
        <div className="billing-package-consultation">
          <ShieldCheck aria-hidden="true" className="size-4" />A contratação
          altera plano, cobrança e acesso juntos. Nenhum recurso é liberado sem
          o item correspondente na assinatura.
        </div>
        <div className="billing-dialog-actions">
          <button onClick={onClose} type="button">
            Entendi
          </button>
        </div>
      </div>
    </FeatureDialog>
  );
}
