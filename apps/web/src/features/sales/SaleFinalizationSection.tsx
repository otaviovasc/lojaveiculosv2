import { CheckCircle2, FileText, ArrowRight, Sparkles } from "lucide-react";
import type { SaleDocumentKind, SaleRecord } from "./types";
import BorderGlow from "../../components/ui/BorderGlow";

export function FinalizationSection({ sale }: { sale: SaleRecord }) {
  const documentLabels: Record<SaleDocumentKind, string> = {
    sale_contract: "Contrato de Compra e Venda",
    sale_receipt: "Recibo de Venda",
    delivery_term: "Termo de Entrega",
    power_of_attorney: "Procuração",
  };

  const selectedDocs = sale.selectedDocumentKinds;

  const goToNfe = () => {
    // Redirect to the NF-e/fiscal surface as requested.
    window.location.hash = "/fiscal";
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 4.1 Welcome / Completion header */}
      <div className="bg-panel border border-line rounded-2xl p-6 shadow-sm text-center flex flex-col items-center justify-center gap-3">
        <div className="size-14 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
          <CheckCircle2 className="size-8" />
        </div>
        <div className="max-w-md">
          <h3 className="text-base font-black text-app-text uppercase tracking-wider">
            Formalização Concluída!
          </h3>
          <p className="text-xs font-bold text-muted leading-relaxed mt-1">
            Os dados da venda foram validados e estruturados. Os documentos
            selecionados são gerados pelo workflow auditado no fechamento.
          </p>
        </div>
      </div>

      {/* 4.2 Document readiness area */}
      <div className="bg-panel border border-line rounded-2xl p-5 shadow-sm flex flex-col gap-4">
        <h4 className="text-xs font-black text-app-text uppercase tracking-wider flex items-center gap-1.5 border-b border-line/45 pb-3">
          <FileText className="size-4.5 text-accent" />
          <span>Documentos da Formalização</span>
        </h4>

        {selectedDocs.length === 0 ? (
          <div className="py-6 text-center text-xs font-bold text-muted">
            Nenhum documento foi selecionado na etapa anterior.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {selectedDocs.map((docId) => {
              const label = documentLabels[docId] || docId;
              return (
                <div
                  key={docId}
                  className="flex items-center justify-between p-3.5 bg-app-elevated/20 border border-line/40 rounded-xl hover:border-line transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-accent-soft text-accent-strong shrink-0">
                      <FileText className="size-4.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-black text-app-text block truncate">
                        {label}
                      </span>
                      <span className="text-xs text-muted font-bold block mt-0.5">
                        Preparado para geração auditada
                      </span>
                    </div>
                  </div>

                  <span className="rounded-full border border-line bg-app-elevated px-3 py-1 text-xs font-black uppercase tracking-wider text-muted">
                    Workflow
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4.3 Quick Action to NFE */}
      <BorderGlow
        borderRadius={16}
        glowIntensity={0.5}
        colors={["var(--color-blue-start)", "var(--color-violet-start)"]}
      >
        <div className="p-5 bg-panel/85 border border-line/40 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 shrink-0">
              <Sparkles className="size-5 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-black text-app-text block uppercase tracking-wider">
                Próximo Passo: Emissão Fiscal
              </span>
              <span className="text-xs font-bold text-muted block mt-0.5 leading-relaxed">
                Esta venda foi formalizada. Prossiga para a emissão da NF-e.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={goToNfe}
            className="sales-primary-button !min-h-11 !h-11 flex items-center gap-2 w-full sm:w-auto shrink-0 justify-center bg-blue-600 hover:bg-blue-700 "
          >
            <div className="gloss-overlay" />
            <span>Ir para NF-e</span>
            <ArrowRight className="size-4" />
          </button>
        </div>
      </BorderGlow>
    </div>
  );
}
