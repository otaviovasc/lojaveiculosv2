import { Percent } from "lucide-react";
import { FeatureSelect } from "../../components/ui/FeatureControls";
import { Switch } from "../../components/ui/switch";
import { formatCurrency, parseCurrency } from "./saleServicesFormat";
import { SalePercentageInput } from "./SalePercentageInput";
import { snapshotNumber } from "./salesSnapshot";
import type { SnapshotRecord } from "./salesSnapshot";
import type { ServiceChangeHandler } from "./SaleServicesTypes";
import { SaleField } from "./SaleWorkspaceForm";

export function CommissionPanel({
  commission,
  onChange,
}: {
  commission: SnapshotRecord;
  onChange: ServiceChangeHandler;
}) {
  const enabled = commission.enabled === true;
  const ruleType = commission.ruleType === "fixed" ? "fixed" : "percentage";
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2 border-b border-line pb-2 mb-1">
        <h4 className="text-xs font-black text-app-text uppercase tracking-wider flex items-center gap-1.5">
          <Percent className="size-4.5 text-accent" />
          <span>Configuração de Comissões</span>
        </h4>
      </div>

      <div className="md:col-span-2 flex items-center justify-between gap-4 rounded-xl border border-line bg-app-elevated/20 p-4">
        <div className="grid gap-1">
          <span className="text-xs font-black uppercase tracking-wider text-app-text">
            Comissão desta venda
          </span>
          <span className="text-xs text-muted">
            Ative para registrar a base calculada da comissão do vendedor no
            fechamento desta venda.
          </span>
        </div>
        <Switch
          aria-label="Calcular comissão nesta venda"
          checked={enabled}
          onCheckedChange={(checked) =>
            onChange("commission", "enabled", checked)
          }
        />
      </div>

      <SaleField label="Regra / Tipo de Comissão">
        <FeatureSelect
          ariaLabel="Tipo de comissão desta venda"
          className="!min-h-[2.5rem] !h-[2.5rem] !text-xs"
          disabled={!enabled}
          onChange={(value) => onChange("commission", "ruleType", value)}
          options={[
            { value: "percentage", label: "Porcentagem da Venda (%)" },
            { value: "fixed", label: "Valor Fixo (R$)" },
          ]}
          value={ruleType}
        />
      </SaleField>

      <SaleField label="Valor da Comissão (R$ / %)">
        {ruleType === "fixed" ? (
          <input
            className="sales-input"
            disabled={!enabled}
            inputMode="numeric"
            onChange={(event) =>
              onChange(
                "commission",
                "amountValueCents",
                parseCurrency(event.target.value),
              )
            }
            placeholder="R$ 0,00"
            value={formatCurrency(snapshotNumber(commission.amountValueCents))}
          />
        ) : (
          <SalePercentageInput
            className="sales-input"
            disabled={!enabled}
            onValueChange={(value) =>
              onChange("commission", "percentageRate", value)
            }
            placeholder="Ex: 1,5"
            value={snapshotNumber(commission.percentageRate)}
          />
        )}
      </SaleField>

      <div className="md:col-span-2">
        <SaleField label="Observações de Pagamento da Comissão">
          <textarea
            className="sales-input !py-2 min-h-16 resize-y"
            disabled={!enabled}
            onChange={(event) =>
              onChange("commission", "notes", event.target.value)
            }
            placeholder="Instruções para liberação do pagamento da comissão no financeiro..."
            value={String(commission.notes ?? "")}
          />
        </SaleField>
      </div>
    </div>
  );
}
