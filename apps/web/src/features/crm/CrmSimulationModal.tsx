import { useCallback, useRef, useState } from "react";
import { Calculator, Save } from "lucide-react";
import { FeatureInput } from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import {
  FeatureDialog,
  FeatureDialogActions,
} from "../../components/ui/FeatureOverlay";
import { formatCurrencyValue, parseCurrencyInput } from "../../lib/masks";
import { CrmSelect } from "./CrmFormControls";
import type { LeadVehicleOption } from "./CrmPipelineViewTypes";
import {
  financingTermOptions,
  getPrimaryLeadVehiclePriceCents as getPriceCents,
  type FinancingSimulationDraft,
} from "./crmLeadData";
import type { ProductCrmLead } from "./productCrmTypes";
import { CrmFormError, formatCrmSubmitError } from "./CrmFormFeedback";
import { validateFinancingInput } from "./crmFormValidation";
import {
  calculateFinancing,
  createFinancingDraft,
  formatFinancingValue,
} from "./crmFinancingSimulation";

type Props = {
  lead: ProductCrmLead;
  onClose: () => void;
  onSaveSimulation: (
    leadId: string,
    data: FinancingSimulationDraft,
  ) => Promise<void>;
  vehicleOptions: LeadVehicleOption[];
};

export function CrmSimulationModal({
  lead,
  onClose,
  onSaveSimulation,
  vehicleOptions,
}: Props) {
  const initialValue = getPriceCents(lead, vehicleOptions) ?? 0;
  const [vehicleValue, setVehicleValue] = useState(initialValue / 100);
  const [downpayment, setDownpayment] = useState((initialValue * 0.3) / 100);
  const [months, setMonths] = useState(48);
  const [interestRate, setInterestRate] = useState(1.39);
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isSavingRef = useRef(false);
  const { financedAmount, monthlyPayment, totalFinanced } = calculateFinancing(
    vehicleValue,
    downpayment,
    months,
    interestRate,
  );
  const validationError = validateFinancingInput({
    downpayment,
    interestRate,
    months,
    vehicleValue,
  });
  const visibleError =
    submitError ??
    (hasAttemptedSave || downpayment > vehicleValue ? validationError : null);
  const vehicleValueInvalid = Boolean(visibleError && vehicleValue <= 0);
  const downpaymentInvalid = Boolean(
    visibleError && (downpayment < 0 || downpayment > vehicleValue),
  );
  const interestRateInvalid = Boolean(
    visibleError && (interestRate < 0 || interestRate > 10),
  );
  const requestClose = useCallback(() => {
    if (!isSavingRef.current) onClose();
  }, [onClose]);

  const handleSave = async () => {
    if (isSavingRef.current) return;
    setHasAttemptedSave(true);
    if (validationError) return;
    isSavingRef.current = true;
    setIsSaving(true);
    setSubmitError(null);
    const data = createFinancingDraft({
      downpayment,
      months,
      interestRate,
      monthlyPayment,
      vehicleValue,
    });
    try {
      await onSaveSimulation(lead.id, data);
      onClose();
    } catch (caught) {
      setSubmitError(
        formatCrmSubmitError(caught, "Não foi possível salvar a simulação."),
      );
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <FeatureDialog
      className="max-w-lg"
      description={`Cliente: ${lead.buyerName || "Sem nome"}`}
      footer={
        <FeatureDialogActions
          cancelDisabled={isSaving}
          confirmDisabled={isSaving || downpayment > vehicleValue}
          confirmIcon={<Save aria-hidden="true" className="size-4" />}
          confirmLabel={isSaving ? "Salvando..." : "Salvar no Lead"}
          onCancel={requestClose}
          onConfirm={() => void handleSave()}
        />
      }
      isOpen
      onClose={requestClose}
      title={
        <span className="flex items-center gap-2">
          <Calculator aria-hidden="true" className="size-5 text-accent" />
          <span>Simular financiamento</span>
        </span>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FeatureField label="Valor do Veículo (R$)">
            <FeatureInput
              aria-invalid={vehicleValueInvalid}
              inputMode="decimal"
              onChange={(e) => {
                setVehicleValue(currencyInputNumber(e.target.value));
                setSubmitError(null);
              }}
              value={formatCurrencyValue(vehicleValue)}
            />
          </FeatureField>

          <FeatureField label="Valor da Entrada (R$)">
            <FeatureInput
              aria-invalid={downpaymentInvalid}
              inputMode="decimal"
              onChange={(e) => {
                setDownpayment(currencyInputNumber(e.target.value));
                setSubmitError(null);
              }}
              value={formatCurrencyValue(downpayment)}
            />
          </FeatureField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FeatureField label="Nº de Parcelas">
            <CrmSelect
              onChange={(value) => {
                setMonths(Number(value));
                setSubmitError(null);
              }}
              options={financingTermOptions}
              value={String(months)}
            />
          </FeatureField>

          <FeatureField label="Taxa de Juros (% a.m.)">
            <FeatureInput
              aria-invalid={interestRateInvalid}
              max={10}
              min={0}
              onChange={(e) => {
                setInterestRate(Number(e.target.value));
                setSubmitError(null);
              }}
              step={0.01}
              type="number"
              value={interestRate}
            />
          </FeatureField>
        </div>

        {visibleError ? <CrmFormError>{visibleError}</CrmFormError> : null}

        <div className="bg-accent-soft/5 border border-accent/20 rounded-xl p-4.5 flex flex-col gap-3.5 mt-2">
          <div className="flex justify-between items-center pb-2 border-b border-accent/10">
            <span className="text-xs font-bold text-muted">
              Valor a Financiar:
            </span>
            <span className="text-sm font-black text-app-text">
              {formatFinancingValue(financedAmount)}
            </span>
          </div>

          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className="text-xs font-black text-app-text">
                Parcela Mensal Estimada:
              </span>
              <span className="text-xs font-bold text-muted">Tabela Price</span>
            </div>
            <span className="text-xl font-black text-accent-strong leading-none">
              {months}x de {formatFinancingValue(monthlyPayment)}
            </span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-accent/10">
            <span className="text-xs font-bold text-muted">
              Total Pago Final:
            </span>
            <span className="text-xs font-black text-app-text">
              {formatFinancingValue(totalFinanced + downpayment)}
            </span>
          </div>
        </div>
      </div>
    </FeatureDialog>
  );
}

function currencyInputNumber(value: string) {
  return Number(parseCurrencyInput(value) || 0);
}
