import { useState } from "react";
import { Calculator, X, Save } from "lucide-react";
import { FeatureInput } from "../../components/ui/FeatureControls";
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

  const handleSave = async () => {
    setHasAttemptedSave(true);
    if (validationError) return;
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
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        aria-modal="true"
        aria-labelledby="crm-financing-modal-title"
        className="w-full max-w-lg glass-panel-branded bg-panel rounded-2xl border border-line shadow-2xl overflow-hidden flex flex-col"
        role="dialog"
      >
        <header className="p-4 border-b border-line/45 flex items-center justify-between shrink-0 bg-app-elevated/45">
          <div className="flex items-center gap-2">
            <Calculator aria-hidden="true" className="size-5 text-accent" />
            <div>
              <h3
                className="text-sm font-black text-app-text"
                id="crm-financing-modal-title"
              >
                Simular financiamento
              </h3>
              <p className="text-xs font-bold text-muted mt-0.5">
                Cliente: {lead.buyerName || "Sem nome"}
              </p>
            </div>
          </div>
          <button
            aria-label="Fechar simulação de financiamento"
            className="p-1 rounded-lg hover:bg-line/25 text-muted hover:text-app-text cursor-pointer transition-colors"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4.5" />
          </button>
        </header>

        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-black text-app-text">
                Valor do Veículo (R$)
              </span>
              <FeatureInput
                aria-invalid={vehicleValueInvalid}
                min={0}
                onChange={(e) => {
                  setVehicleValue(Number(e.target.value));
                  setSubmitError(null);
                }}
                type="number"
                value={vehicleValue}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-black text-app-text">
                Valor da Entrada (R$)
              </span>
              <FeatureInput
                aria-invalid={downpaymentInvalid}
                max={Math.max(0, vehicleValue)}
                min={0}
                onChange={(e) => {
                  setDownpayment(Number(e.target.value));
                  setSubmitError(null);
                }}
                type="number"
                value={downpayment}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-black text-app-text">
                Nº de Parcelas
              </span>
              <CrmSelect
                onChange={(value) => {
                  setMonths(Number(value));
                  setSubmitError(null);
                }}
                options={financingTermOptions}
                value={String(months)}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-black text-app-text">
                Taxa de Juros (% a.m.)
              </span>
              <FeatureInput
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
            </label>
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
                <span className="text-xs font-bold text-muted">
                  Tabela Price
                </span>
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

        <footer className="p-4 border-t border-line/45 shrink-0 bg-app-elevated/45 flex justify-end gap-2.5">
          <button
            className="inline-flex min-h-9 items-center justify-center rounded-lg bg-app-elevated border border-line px-4 text-xs font-black text-app-text hover:bg-line/20 cursor-pointer"
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-accent px-4 text-xs font-black text-inverse cursor-pointer hover:opacity-90 shadow-sm"
            disabled={isSaving || downpayment > vehicleValue}
            onClick={() => void handleSave()}
            type="button"
          >
            <Save aria-hidden="true" className="size-4" />
            {isSaving ? "Salvando..." : "Salvar no Lead"}
          </button>
        </footer>
      </div>
    </div>
  );
}
