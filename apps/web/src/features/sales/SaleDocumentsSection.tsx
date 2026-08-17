import { useState, useEffect } from "react";
import {
  FileCheck,
  FileSpreadsheet,
  FileText,
  Receipt,
  ScrollText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import {
  BuyerDocumentationFields,
  VehicleDocumentationFields,
} from "./SaleDocumentsFields";
import { SaleFormSection } from "./SaleWorkspaceForm";
import { SaleDocumentsValidationStatus } from "./SaleDocumentsValidationStatus";
import { getRequiredFieldsPolicy, validateSaleRecord } from "./validation";
import type { SaleDocumentKind, SaleRecord } from "./types";

type UpdateSale = (updater: (sale: SaleRecord) => SaleRecord) => void;

interface DocumentDefinition {
  id: SaleDocumentKind;
  title: string;
  badge: string;
  description: string;
  requires: string[];
  icon: typeof FileText;
}

const DOCUMENT_OPTIONS: readonly DocumentDefinition[] = [
  {
    id: "sale_contract",
    title: "Contrato de Compra e Venda",
    badge: "Principal",
    description:
      "Instrumento jurídico completo com cláusulas de garantia, pagamento e posse.",
    requires: ["CPF/CNPJ", "Endereço", "Renavam", "Chassi"],
    icon: FileText,
  },
  {
    id: "sale_receipt",
    title: "Recibo de Venda",
    badge: "Comprovante",
    description:
      "Comprovante oficial de quitação e discriminação dos valores recebidos.",
    requires: ["CPF/CNPJ"],
    icon: Receipt,
  },
  {
    id: "delivery_term",
    title: "Termo de Entrega e Garantia",
    badge: "Entrega",
    description:
      "Declaração de recebimento do veículo, manual, chaves e termo de vistoria.",
    requires: ["CPF/CNPJ"],
    icon: ShieldCheck,
  },
  {
    id: "power_of_attorney",
    title: "Procuração de Transferência",
    badge: "Despachante",
    description:
      "Poderes para transferência junto ao DETRAN para o comprador ou despachante.",
    requires: ["CPF/CNPJ", "Endereço", "Renavam", "Chassi", "Dados Civis"],
    icon: ScrollText,
  },
];

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

  return (
    <div className="flex flex-col gap-6">
      {/* 3.1 Document Selector Cards */}
      <SaleFormSection
        title="1. Documentos a Emitir na Venda"
        icon={<FileText className="size-4.5 text-accent" />}
      >
        <div className="md:col-span-2 flex flex-col gap-4">
          <p className="text-xs font-bold text-muted leading-relaxed">
            Selecione os documentos jurídicos e operacionais que serão gerados
            automaticamente. Os campos de preenchimento abaixo se adaptam
            dinamicamente conforme os documentos selecionados.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {DOCUMENT_OPTIONS.map((doc) => {
              const isSelected = sale.selectedDocumentKinds.includes(doc.id);
              const Icon = doc.icon;
              return (
                <div
                  key={doc.id}
                  onClick={() => toggleDocument(doc.id, !isSelected)}
                  className={[
                    "relative flex flex-col justify-between gap-3 p-4 rounded-xl border transition-all cursor-pointer select-none",
                    isSelected
                      ? "border-accent bg-accent/5 ring-1 ring-accent/30 shadow-sm"
                      : "border-line bg-app hover:border-line-strong hover:bg-app-elevated/30",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={[
                          "flex size-8 shrink-0 items-center justify-center rounded-lg border",
                          isSelected
                            ? "border-accent bg-accent text-accent-foreground"
                            : "border-line bg-panel text-muted",
                        ].join(" ")}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black text-app-text leading-tight truncate">
                          {doc.title}
                        </span>
                        <span className="text-xs font-bold text-muted uppercase tracking-wider">
                          {doc.badge}
                        </span>
                      </div>
                    </div>

                    <input
                      aria-label={doc.title}
                      checked={isSelected}
                      className="accent-accent size-4.5 rounded cursor-pointer shrink-0 mt-0.5"
                      id={`doc-checkbox-${doc.id}`}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => toggleDocument(doc.id, e.target.checked)}
                      type="checkbox"
                    />
                  </div>

                  <p className="text-xs text-muted leading-relaxed">
                    {doc.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-line/40">
                    <span className="text-xs font-black text-muted uppercase tracking-wider mr-1">
                      Exige:
                    </span>
                    {doc.requires.map((req) => (
                      <span
                        key={req}
                        className={[
                          "px-2 py-0.5 rounded-md text-xs font-bold",
                          isSelected
                            ? "bg-accent-soft text-accent-strong"
                            : "bg-panel text-muted border border-line/40",
                        ].join(" ")}
                      >
                        {req}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3.2 Distinct NF-e Suggestion Card */}
          <div
            className={[
              "relative flex flex-col gap-3 rounded-2xl border p-5 transition-all",
              emitirNFe
                ? "border-accent-strong/40 bg-accent-soft/30 ring-1 ring-accent-strong/20 shadow-sm"
                : "border-line bg-app-elevated/20 hover:border-line-strong",
            ].join(" ")}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={[
                    "flex size-10 shrink-0 items-center justify-center rounded-xl border shadow-sm",
                    emitirNFe
                      ? "border-accent-strong bg-accent-strong text-accent-strong-foreground"
                      : "border-line bg-panel text-muted",
                  ].join(" ")}
                >
                  <FileSpreadsheet className="size-5" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-black text-app-text tracking-tight">
                      Emissão Fiscal Eletrônica (NF-e)
                    </h4>
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-black text-accent-strong uppercase">
                      <Sparkles className="size-3" /> SEFAZ / Fiscal
                    </span>
                  </div>
                  <p className="text-xs font-medium text-muted">
                    Gere o XML e DANFE da venda do veículo para transmissão
                    oficial ao Spedy / SEFAZ.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEmitirNFe((current) => !current)}
                className={[
                  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-black transition-all cursor-pointer shrink-0",
                  emitirNFe
                    ? "bg-accent-strong text-accent-strong-foreground shadow-sm hover:brightness-110"
                    : "border border-line bg-panel text-app-text hover:bg-app-elevated",
                ].join(" ")}
              >
                <FileCheck className="size-4" />
                <span>
                  {emitirNFe ? "NF-e Habilitada" : "Habilitar Emissão de NF-e"}
                </span>
              </button>
            </div>

            {emitirNFe ? (
              <div className="rounded-xl border border-accent/30 bg-app/50 p-3 text-xs font-medium text-app-text flex items-center gap-2">
                <span className="size-2 rounded-full bg-accent animate-pulse shrink-0" />
                <span>
                  Campos fiscais técnicos do veículo (Potência, Cilindradas,
                  Pesos e Número do Motor) tornam-se obrigatórios abaixo.
                </span>
              </div>
            ) : null}
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
