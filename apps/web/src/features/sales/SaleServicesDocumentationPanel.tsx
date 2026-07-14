import { FileText } from "lucide-react";
import { FeatureSelect } from "../../components/ui/FeatureControls";
import { SaleField } from "./SaleWorkspaceForm";
import { formatCurrency, parseCurrency } from "./saleServicesFormat";
import { snapshotNumber } from "./salesSnapshot";
import type { SnapshotRecord } from "./salesSnapshot";
import type { ServiceChangeHandler } from "./SaleServicesTypes";

export function DocumentationPanel({
  documentation,
  onChange,
}: {
  documentation: SnapshotRecord;
  onChange: ServiceChangeHandler;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="md:col-span-2 border-b border-line pb-2 mb-1">
        <h4 className="text-xs font-black text-app-text uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="size-4.5 text-accent" />
          <span>Documentação e Transferência</span>
        </h4>
      </div>

      <SaleField label="Valor Cobrado do Cliente">
        <input
          className="sales-input"
          inputMode="numeric"
          onChange={(event) =>
            onChange(
              "documentation",
              "chargedAmountCents",
              parseCurrency(event.target.value),
            )
          }
          placeholder="R$ 0,00"
          value={formatCurrency(
            snapshotNumber(documentation.chargedAmountCents),
          )}
        />
      </SaleField>

      <SaleField label="Alienação Fiduciária">
        <FeatureSelect
          ariaLabel="Alienação fiduciária da documentação"
          className="!min-h-[2.5rem] !h-[2.5rem] !text-xs"
          onChange={(value) =>
            onChange(
              "documentation",
              "hasLien",
              value === "yes" ? true : value === "no" ? false : null,
            )
          }
          options={[
            { value: "unknown", label: "Ainda não informado" },
            { value: "no", label: "Sem alienação" },
            { value: "yes", label: "Com alienação" },
          ]}
          value={
            documentation.hasLien === true
              ? "yes"
              : documentation.hasLien === false
                ? "no"
                : "unknown"
          }
        />
      </SaleField>

      <SaleField label="Status da Cobrança">
        <FeatureSelect
          ariaLabel="Status da cobrança de documentação"
          className="!min-h-[2.5rem] !h-[2.5rem] !text-xs"
          onChange={(value) => onChange("documentation", "status", value)}
          options={[
            { value: "pending", label: "Pendente" },
            { value: "charged", label: "Cobrado na Venda" },
            { value: "cancelled", label: "Cancelado" },
          ]}
          value={String(documentation.status ?? "pending")}
        />
      </SaleField>

      <SaleField label="Observações da Documentação">
        <input
          className="sales-input"
          onChange={(event) =>
            onChange("documentation", "notes", event.target.value)
          }
          placeholder="Despachante, protocolo ou condição especial"
          value={String(documentation.notes ?? "")}
        />
      </SaleField>

      <p className="md:col-span-2 text-xs text-muted rounded-xl border border-line/60 bg-app-elevated/20 px-3 py-2">
        O lançamento automático usa o valor cobrado e a informação de alienação
        para aplicar as regras de custo, receita e comissão configuradas.
      </p>
    </div>
  );
}
