import { Building, ChevronDown, ChevronUp } from "lucide-react";
import { DatePickerField } from "../../components/ui/DatePickerField";
import { SaleField } from "./SaleWorkspaceForm";
import { formatIsoDate, parseIsoDate } from "./salesDateFormat";
import { snapshotNumber } from "./salesSnapshot";
import type { SnapshotRecord } from "./salesSnapshot";

export function SaleContextAcquisitionSection({
  acqDetails,
  onChange,
  onToggle,
  parseCurrency,
  showAcquisition,
}: {
  acqDetails: SnapshotRecord;
  onChange: (key: string, value: unknown) => void;
  onToggle: () => void;
  parseCurrency: (value: string) => number | null;
  showAcquisition: boolean;
}) {
  const priceCents = snapshotNumber(acqDetails.priceCents);

  return (
    <section className="sales-glass-panel bg-panel border border-line overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 bg-app-elevated/30 border-none font-bold text-xs uppercase tracking-wider text-app-text hover:bg-app-elevated/50 transition-colors text-left"
        onClick={onToggle}
        type="button"
      >
        <div className="flex items-center gap-2">
          <Building className="size-4.5 text-accent" />
          <span>3. Seção de Aquisição do Veículo (Opcional)</span>
        </div>
        {showAcquisition ? (
          <ChevronUp className="size-4" />
        ) : (
          <ChevronDown className="size-4" />
        )}
      </button>

      {showAcquisition ? (
        <div className="p-5 border-t border-line/40 grid gap-4 md:grid-cols-2 bg-panel/30">
          <p className="md:col-span-2 text-xs font-bold text-muted leading-relaxed">
            Registre opcionalmente a origem do veículo para rastrear a margem.
          </p>

          <SaleField label="De quem compramos? (Fornecedor / Particular)">
            <input
              className="sales-input"
              onChange={(event) => onChange("supplierName", event.target.value)}
              placeholder="Nome do antigo proprietário ou fornecedor"
              value={String(acqDetails.supplierName ?? "")}
            />
          </SaleField>

          <SaleField label="Valor de Compra">
            <input
              className="sales-input"
              onChange={(event) =>
                onChange("priceCents", parseCurrency(event.target.value))
              }
              placeholder="R$ 0,00"
              value={
                priceCents
                  ? (priceCents / 100).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })
                  : ""
              }
            />
          </SaleField>

          <SaleField label="Data da Compra">
            <DatePickerField
              label="Data"
              onChange={(date) => onChange("purchaseDate", formatIsoDate(date))}
              value={parseIsoDate(acqDetails.purchaseDate)}
            />
          </SaleField>

          <SaleField label="Nota Fiscal de Entrada (NFE)">
            <input
              className="sales-input"
              onChange={(event) => onChange("nfeNumber", event.target.value)}
              placeholder="Número da Nota Fiscal"
              value={String(acqDetails.nfeNumber ?? "")}
            />
          </SaleField>

          <div className="md:col-span-2">
            <SaleField label="Observações de Entrada">
              <textarea
                className="sales-input !py-2 min-h-16 resize-y"
                onChange={(event) => onChange("notes", event.target.value)}
                placeholder="Detalhes sobre a conservação, laudo cautelar ou revisão necessária na entrada..."
                value={String(acqDetails.notes ?? "")}
              />
            </SaleField>
          </div>
        </div>
      ) : null}
    </section>
  );
}
