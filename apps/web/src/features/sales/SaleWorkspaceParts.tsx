import { Banknote, FileText } from "lucide-react";
import { FeatureSelect } from "../../components/ui/FeatureControls";
import { kindLabel } from "../documents/documentLabels";
import type { DocumentKind } from "../documents/types";
import {
  defaultRequiredDocumentKinds,
  formatCents,
  parseCurrencyInput,
  requiredDocumentKinds,
  saleSourceOptions,
} from "./salesModel";
import { SaleField, SaleFormSection } from "./SaleWorkspaceForm";
import type { SaleRecord } from "./types";
export { ContextSection } from "./SaleContextSection";

type UpdateSale = (updater: (sale: SaleRecord) => SaleRecord) => void;

export function TermsSection({ sale, update }: SectionProps) {
  return (
    <SaleFormSection
      title="Preço e Condições"
      icon={<Banknote className="size-4.5 text-accent" />}
    >
      <SaleField label="Preço da Venda">
        <input
          className="sales-input text-lg font-black text-accent-strong"
          inputMode="numeric"
          onChange={(event) =>
            update((draft) => ({
              ...draft,
              salePriceCents: parseCurrencyInput(event.target.value),
            }))
          }
          placeholder="R$ 0,00"
          value={sale.salePriceCents ? formatCents(sale.salePriceCents) : ""}
        />
      </SaleField>
      <SaleField label="Origem Comercial">
        <FeatureSelect
          ariaLabel="Origem comercial"
          className="sales-input"
          onChange={(source) =>
            update((draft) => ({
              ...draft,
              saleSourceSnapshot: {
                ...draft.saleSourceSnapshot,
                source,
              },
            }))
          }
          options={saleSourceOptions}
          value={String(sale.saleSourceSnapshot.source ?? "lead")}
        />
      </SaleField>
    </SaleFormSection>
  );
}

export function DocumentsSection({ sale, update }: SectionProps) {
  const required = requiredDocumentKinds(sale).length
    ? requiredDocumentKinds(sale)
    : defaultRequiredDocumentKinds;
  return (
    <SaleFormSection
      title="Documentos Obrigatórios"
      icon={<FileText className="size-4.5 text-accent" />}
    >
      <div className="grid gap-3 md:col-span-2">
        <p className="text-xs font-bold text-muted leading-relaxed mb-1">
          Selecione os documentos necessários para a formalização do contrato de
          compra e venda.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {required.map((kind) => {
            const checked = sale.selectedDocumentKinds.includes(kind);
            return (
              <label
                className={
                  "sales-check-row " +
                  (checked ? "sales-check-row-checked" : "")
                }
                key={kind}
              >
                <input
                  checked={checked}
                  onChange={(event) =>
                    update((draft) => ({
                      ...draft,
                      selectedDocumentKinds: event.target.checked
                        ? [...draft.selectedDocumentKinds, kind]
                        : draft.selectedDocumentKinds.filter(
                            (item) => item !== kind,
                          ),
                    }))
                  }
                  type="checkbox"
                />
                <span>{formatDocumentKindLabel(kind)}</span>
              </label>
            );
          })}
        </div>
      </div>
    </SaleFormSection>
  );
}

type SectionProps = { sale: SaleRecord; update: UpdateSale };

function formatDocumentKindLabel(kind: string): string {
  switch (kind) {
    case "sale_contract":
      return "Contrato de Compra e Venda";
    case "sale_receipt":
      return "Recibo de Venda";
    case "delivery_term":
      return "Termo de Entrega";
    case "power_of_attorney":
      return "Procuração";
    default:
      return kindLabel(kind as DocumentKind);
  }
}
