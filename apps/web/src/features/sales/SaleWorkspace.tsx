import { useEffect, useMemo, useRef, useState } from "react";
import { Save } from "lucide-react";
import {
  ContextSection,
  DocumentsSection,
  PaymentsSection,
  TermsSection,
} from "./SaleWorkspaceParts";
import { StickySaleSummary } from "./SaleSummaryPanel";
import { toDraftInput } from "./salesModel";
import type { SaleRecord } from "./types";

export function SaleWorkspace({
  onCancel,
  onClose,
  onReserve,
  onSave,
  sale,
}: {
  onCancel: (sale: SaleRecord) => Promise<void>;
  onClose: (sale: SaleRecord) => Promise<void>;
  onReserve: (sale: SaleRecord) => Promise<void>;
  onSave: (sale: SaleRecord) => Promise<SaleRecord>;
  sale: SaleRecord | null;
}) {
  const [draft, setDraft] = useState<SaleRecord | null>(sale);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const lastSavedRef = useRef("");

  useEffect(() => {
    setDraft(sale);
    lastSavedRef.current = sale ? serializeSale(sale) : "";
  }, [sale]);

  useEffect(() => {
    if (!draft) return;
    const serialized = serializeSale(draft);
    if (serialized === lastSavedRef.current) return;
    setIsSaving(true);
    const timer = window.setTimeout(() => {
      void onSave(draft)
        .then(() => {
          lastSavedRef.current = serialized;
          setMessage("Rascunho salvo");
        })
        .catch((error) => setMessage(errorMessage(error)))
        .finally(() => setIsSaving(false));
    }, 650);
    return () => window.clearTimeout(timer);
  }, [draft, onSave]);

  const update = (updater: (sale: SaleRecord) => SaleRecord) => {
    setDraft((current) => (current ? updater(current) : current));
  };

  const steps = useMemo(
    () => ["Contexto", "Valores", "Pagamentos", "Documentos", "Revisao"],
    [],
  );

  if (!draft) {
    return (
      <section className="rounded-lg border border-line bg-panel p-8 text-sm font-bold text-muted">
        Selecione uma venda ou crie um rascunho.
      </section>
    );
  }

  const runTransition = async (action: (sale: SaleRecord) => Promise<void>) => {
    setIsSaving(true);
    try {
      await onSave(draft);
      await action(draft);
      lastSavedRef.current = serializeSale(draft);
      setMessage("Venda atualizada");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-line bg-panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-app-text">Venda</h2>
              <p className="text-xs font-bold text-muted">
                {draft.id} · revisao {draft.revision}
              </p>
            </div>
            <span className="inline-flex items-center gap-2 text-xs font-black text-muted">
              <Save className="size-4" />
              {isSaving ? "Salvando" : "Autosave ativo"}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {steps.map((step, index) => (
              <span
                className="rounded-full border border-line bg-app-elevated px-3 py-1 text-xs font-black text-muted"
                key={step}
              >
                {index + 1}. {step}
              </span>
            ))}
          </div>
        </div>

        {message ? (
          <p className="rounded-lg border border-line bg-accent-soft p-3 text-xs font-black text-accent-strong">
            {message}
          </p>
        ) : null}

        <ContextSection sale={draft} update={update} />
        <TermsSection sale={draft} update={update} />
        <PaymentsSection sale={draft} update={update} />
        <DocumentsSection sale={draft} update={update} />
      </div>
      <StickySaleSummary
        isSaving={isSaving}
        onCancel={() => void runTransition(onCancel)}
        onClose={() => void runTransition(onClose)}
        onReserve={() => void runTransition(onReserve)}
        sale={draft}
      />
    </section>
  );
}

function serializeSale(sale: SaleRecord): string {
  return JSON.stringify(toDraftInput(sale));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
