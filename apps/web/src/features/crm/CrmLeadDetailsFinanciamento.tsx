import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { FeatureInput } from "../../components/ui/FeatureControls";
import { CrmSelect } from "./CrmFormControls";
import type { LeadVehicleOption } from "./CrmPipelineViewTypes";
import {
  financingTermOptions,
  getPrimaryLeadVehiclePriceCents,
  type FinancingSimulationDraft,
} from "./crmLeadData";
import type {
  CreateProductCrmActivityInput,
  ProductCrmLead,
} from "./productCrmTypes";
import { CrmLeadFinancialProducts } from "./CrmLeadFinancialProducts";

type Props = {
  lead: ProductCrmLead;
  onCreateActivity: (
    leadId: string,
    input: CreateProductCrmActivityInput,
  ) => Promise<void>;
  vehicleOptions: LeadVehicleOption[];
};

export function CrmLeadDetailsFinanciamento({
  lead,
  onCreateActivity,
  vehicleOptions,
}: Props) {
  const initialValue =
    getPrimaryLeadVehiclePriceCents(lead, vehicleOptions) ?? 0;
  const [val, setVal] = useState(initialValue / 100);
  const [down, setDown] = useState((initialValue * 0.3) / 100);
  const [rate, setRate] = useState(1.39);
  const [months, setMonths] = useState(48);

  const [financed, setFinanced] = useState(0);
  const [payment, setPayment] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const principal = Math.max(0, val - down);
    setFinanced(principal);

    const r = rate / 100;
    if (r === 0) {
      setPayment(principal / months);
      setTotal(principal);
    } else {
      const pmt =
        (principal * r * Math.pow(1 + r, months)) /
        (Math.pow(1 + r, months) - 1);
      setPayment(pmt);
      setTotal(pmt * months);
    }
  }, [val, down, rate, months]);

  const handleSave = async () => {
    const data: FinancingSimulationDraft = {
      vehicleValueCents: Math.round(val * 100),
      downpaymentCents: Math.round(down * 100),
      months,
      interestRate: rate,
      monthlyPaymentCents: Math.round(payment * 100),
    };

    const valFormatted = formatBrl(val);
    const downFormatted = formatBrl(down);
    const payFormatted = formatBrl(payment);

    await onCreateActivity(lead.id, {
      activityType: "note",
      content: `Simulação de Financiamento: Veículo ${valFormatted}, Entrada ${downFormatted}, ${months}x de ${payFormatted} (Juros: ${rate}% a.m.)`,
      direction: "internal",
      metadata: data,
    });
  };

  const formatBrl = (num: number) => {
    return new Intl.NumberFormat("pt-BR", {
      currency: "BRL",
      style: "currency",
    }).format(num);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-black text-app-text">
          Simulação de Financiamento
        </h3>
        <p className="text-xs font-bold text-muted">
          Calcule as condições de financiamento do veículo de interesse do
          cliente.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Form parameters */}
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-black text-app-text">
              Valor do Veículo
            </span>
            <FeatureInput
              min={0}
              onChange={(e) => setVal(Number(e.target.value))}
              type="number"
              value={val}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-black text-app-text">
              Valor da Entrada
            </span>
            <FeatureInput
              min={0}
              onChange={(e) => setDown(Number(e.target.value))}
              type="number"
              value={down}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-black text-app-text">
                Nº de Parcelas
              </span>
              <CrmSelect
                onChange={(value) => setMonths(Number(value))}
                options={financingTermOptions}
                value={String(months)}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-black text-app-text">
                Taxa (% a.m.)
              </span>
              <FeatureInput
                max={10}
                min={0.1}
                onChange={(e) => setRate(Number(e.target.value))}
                step={0.01}
                type="number"
                value={rate}
              />
            </label>
          </div>
        </div>

        {/* Results summary panel */}
        <div className="bg-accent-soft/5 border border-accent/20 rounded-xl p-5 flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center pb-2 border-b border-accent/15">
              <span className="text-xs font-bold text-muted">
                Valor Financiado:
              </span>
              <span className="text-sm font-black text-app-text">
                {formatBrl(financed)}
              </span>
            </div>

            <div className="flex justify-between items-end py-1">
              <div className="flex flex-col">
                <span className="text-xs font-black text-app-text">
                  Parcela Estimada:
                </span>
                <span className="text-xs font-bold text-muted">Price</span>
              </div>
              <span className="text-2xl font-black text-accent-strong leading-none">
                {months}x de {formatBrl(payment)}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-accent/15">
              <span className="text-xs font-bold text-muted">Custo Total:</span>
              <span className="text-xs font-black text-app-text">
                {formatBrl(total + down)}
              </span>
            </div>
          </div>

          <button
            className="w-full inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-xs font-black text-accent-foreground cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => void handleSave()}
            type="button"
          >
            <Save aria-hidden="true" className="size-4" />
            Salvar e Registrar Simulação
          </button>
        </div>
      </div>
      <CrmLeadFinancialProducts
        defaultSellerUserId={lead.assignedUserId}
        leadId={lead.id}
      />
    </div>
  );
}
