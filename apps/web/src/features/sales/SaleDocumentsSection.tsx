import { useState, useEffect } from "react";
import { FileText } from "lucide-react";
import {
  BuyerDocumentationFields,
  VehicleDocumentationFields,
} from "./SaleDocumentsFields";
import { SaleFormSection } from "./SaleWorkspaceForm";
import { SaleDocumentsValidationStatus } from "./SaleDocumentsValidationStatus";
import { getRequiredFieldsPolicy, validateSaleRecord } from "./validation";
import type { SaleDocumentKind, SaleRecord } from "./types";

type UpdateSale = (updater: (sale: SaleRecord) => SaleRecord) => void;

export function DocumentsSection({
  sale,
  update,
}: {
  sale: SaleRecord;
  update: UpdateSale;
}) {
  const [emitirNFe, setEmitirNFe] = useState(
    !!sale.documentPolicySnapshot?.emitirNFe,
  );

  const buyer = sale.buyerSnapshot;
  const listing = sale.listingSnapshot;

  const policy = getRequiredFieldsPolicy(sale.selectedDocumentKinds, emitirNFe);
  const { isValid, errors } = validateSaleRecord(
    buyer,
    listing,
    sale.selectedDocumentKinds,
    emitirNFe,
  );

  const handleBuyerChange = (key: string, value: string) => {
    update((draft) => ({
      ...draft,
      buyerSnapshot: {
        ...draft.buyerSnapshot,
        [key]: value,
      },
    }));
  };

  const handleListingChange = (key: string, value: string) => {
    update((draft) => ({
      ...draft,
      listingSnapshot: {
        ...draft.listingSnapshot,
        [key]: value,
      },
    }));
  };

  const toggleDocument = (kind: SaleDocumentKind, checked: boolean) => {
    update((draft) => {
      const selected = checked
        ? [...draft.selectedDocumentKinds, kind]
        : draft.selectedDocumentKinds.filter((k) => k !== kind);
      return {
        ...draft,
        selectedDocumentKinds: selected,
      };
    });
  };

  useEffect(() => {
    update((draft) => ({
      ...draft,
      documentPolicySnapshot: {
        ...draft.documentPolicySnapshot,
        emitirNFe,
      },
    }));
  }, [emitirNFe]);

  const documentKinds = [
    { id: "sale_contract", label: "Contrato de Compra e Venda" },
    { id: "sale_receipt", label: "Recibo de Venda" },
    { id: "delivery_term", label: "Termo de Entrega" },
    { id: "power_of_attorney", label: "Procuração" },
  ] as const satisfies readonly { id: SaleDocumentKind; label: string }[];

  return (
    <div className="flex flex-col gap-6">
      {/* 3.1 Document Selector Checklist */}
      <SaleFormSection
        title="Selecione os Documentos para Formalização"
        icon={<FileText className="size-4.5 text-accent" />}
      >
        <div className="md:col-span-2 flex flex-col gap-3">
          <p className="text-xs font-bold text-muted leading-relaxed">
            Selecione os documentos que farão parte desta venda. Os campos de
            preenchimento abaixo se tornarão obrigatórios dinamicamente conforme
            sua seleção.
          </p>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {documentKinds.map((doc) => {
              const checked = sale.selectedDocumentKinds.includes(doc.id);
              return (
                <label
                  key={doc.id}
                  className={`sales-check-row ${
                    checked ? "sales-check-row-checked" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => toggleDocument(doc.id, e.target.checked)}
                    className="accent-accent"
                  />
                  <span>{doc.label}</span>
                </label>
              );
            })}
          </div>

          <div className="sales-summary-divider my-2" />

          {/* NF-e Toggle */}
          <div className="flex items-center justify-between bg-app-elevated/20 p-4 rounded-xl border border-line/45">
            <div className="flex flex-col gap-1 pr-4">
              <span className="text-xs font-black text-app-text uppercase tracking-wider">
                Emitir Nota Fiscal Eletrônica (NF-e)
              </span>
              <span className="text-xs font-bold text-muted">
                Habilita os campos específicos para a emissão da NF-e de venda
                do veículo.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                aria-label="Emitir Nota Fiscal Eletrônica (NF-e)"
                type="checkbox"
                checked={emitirNFe}
                onChange={(e) => setEmitirNFe(e.target.checked)}
                className="accent-accent scale-125 cursor-pointer"
              />
            </label>
          </div>
        </div>
      </SaleFormSection>

      <div className="grid gap-6 md:grid-cols-2">
        <BuyerDocumentationFields
          buyer={buyer}
          errors={errors}
          onChange={handleBuyerChange}
          policy={policy}
        />
        <VehicleDocumentationFields
          emitirNFe={emitirNFe}
          errors={errors}
          listing={listing}
          onChange={handleListingChange}
          policy={policy}
        />
      </div>

      <SaleDocumentsValidationStatus errors={errors} isValid={isValid} />
    </div>
  );
}
