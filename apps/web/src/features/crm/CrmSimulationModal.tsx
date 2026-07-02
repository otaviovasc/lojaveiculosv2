import { useState, useEffect } from "react";
import { Calculator, X, Save } from "lucide-react";
import { FeatureInput } from "../../components/ui/FeatureControls";
import type { ProductCrmLead } from "./productCrmTypes";

type Props = {
  lead: ProductCrmLead;
  onClose: () => void;
  onSaveSimulation: (leadId: string, data: any) => Promise<void>;
};

export function CrmSimulationModal({ lead, onClose, onSaveSimulation }: Props) {
  const initialValue = (lead.metadata?.simulationValue as number) ?? 8500000; // in cents
  const [vehicleValue, setVehicleValue] = useState(initialValue / 100);
  const [downpayment, setDownpayment] = useState((initialValue * 0.3) / 100);
  const [months, setMonths] = useState(48);
  const [interestRate, setInterestRate] = useState(1.39); // % per month

  const [financedAmount, setFinancedAmount] = useState(0);
  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const [totalFinanced, setTotalFinanced] = useState(0);

  useEffect(() => {
    const principal = Math.max(0, vehicleValue - downpayment);
    setFinancedAmount(principal);

    // PMT formula: P * (r * (1 + r)^n) / ((1 + r)^n - 1)
    const r = interestRate / 100;
    if (r === 0) {
      setMonthlyPayment(principal / months);
      setTotalFinanced(principal);
    } else {
      const pmt =
        (principal * r * Math.pow(1 + r, months)) /
        (Math.pow(1 + r, months) - 1);
      setMonthlyPayment(pmt);
      setTotalFinanced(pmt * months);
    }
  }, [vehicleValue, downpayment, months, interestRate]);

  const handleSave = async () => {
    const data = {
      vehicleValue: vehicleValue * 100,
      downpayment: downpayment * 100,
      months,
      interestRate,
      monthlyPayment: monthlyPayment * 100,
    };
    await onSaveSimulation(lead.id, data);
    onClose();
  };

  const formatBrl = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      currency: "BRL",
      style: "currency",
    }).format(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-lg glass-panel-branded bg-panel rounded-2xl border border-line shadow-2xl overflow-hidden flex flex-col"
        role="dialog"
      >
        {/* Header */}
        <header className="p-4 border-b border-line/45 flex items-center justify-between shrink-0 bg-app-elevated/45">
          <div className="flex items-center gap-2">
            <Calculator aria-hidden="true" className="size-5 text-accent" />
            <div>
              <h3 className="text-sm font-black text-app-text">
                Simular Financiamento
              </h3>
              <p className="text-[10px] font-bold text-muted mt-0.5">
                Cliente: {lead.buyerName || "Sem Nome"}
              </p>
            </div>
          </div>
          <button
            className="p-1 rounded-lg hover:bg-line/25 text-muted hover:text-app-text cursor-pointer transition-colors"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4.5" />
          </button>
        </header>

        {/* Form Body */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-black text-app-text">
                Valor do Veículo (R$)
              </span>
              <FeatureInput
                min={0}
                onChange={(e) => setVehicleValue(Number(e.target.value))}
                type="number"
                value={vehicleValue}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-black text-app-text">
                Valor da Entrada (R$)
              </span>
              <FeatureInput
                min={0}
                onChange={(e) => setDownpayment(Number(e.target.value))}
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
              <select
                className="min-h-11 rounded-lg border border-line bg-app px-3 text-sm font-bold text-app-text outline-none"
                onChange={(e) => setMonths(Number(e.target.value))}
                value={months}
              >
                <option value={12}>12x</option>
                <option value={24}>24x</option>
                <option value={36}>36x</option>
                <option value={48}>48x</option>
                <option value={60}>60x</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-black text-app-text">
                Taxa de Juros (% a.m.)
              </span>
              <FeatureInput
                max={10}
                min={0.1}
                onChange={(e) => setInterestRate(Number(e.target.value))}
                step={0.01}
                type="number"
                value={interestRate}
              />
            </label>
          </div>

          {/* Results Summary Box */}
          <div className="bg-accent-soft/5 border border-accent/20 rounded-xl p-4.5 flex flex-col gap-3.5 mt-2">
            <div className="flex justify-between items-center pb-2 border-b border-accent/10">
              <span className="text-xs font-bold text-muted">
                Valor a Financiar:
              </span>
              <span className="text-sm font-black text-app-text">
                {formatBrl(financedAmount)}
              </span>
            </div>

            <div className="flex justify-between items-end">
              <div className="flex flex-col">
                <span className="text-xs font-black text-app-text">
                  Parcela Mensal Estimada:
                </span>
                <span className="text-[10px] font-bold text-muted">
                  Tabela Price
                </span>
              </div>
              <span className="text-xl font-black text-accent-strong leading-none">
                {months}x de {formatBrl(monthlyPayment)}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-accent/10">
              <span className="text-xs font-bold text-muted">
                Total Pago Final:
              </span>
              <span className="text-xs font-black text-app-text">
                {formatBrl(totalFinanced + downpayment)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
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
            onClick={handleSave}
            type="button"
          >
            <Save aria-hidden="true" className="size-4" />
            Salvar no Lead
          </button>
        </footer>
      </div>
    </div>
  );
}
