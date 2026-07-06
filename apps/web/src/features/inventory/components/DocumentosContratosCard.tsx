import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, FileText, Sparkles } from "lucide-react";
import { createInventoryRuntimeHeaders } from "../api/inventoryRuntimeApi";
import type { InventoryListingDetail } from "../model/types";
import { DocumentosContratosForm } from "./DocumentosContratosForm";
import {
  createContractDraft,
  createContractForm,
  mergeContractFormStoreSettings,
  validateContractForm,
  type ContractDraft,
  type ContractForm,
} from "./DocumentosContratosModel";
import {
  buildContractPreviewData,
  createContractDocumentItems,
  type ContractDocumentListItem,
  type ContractPreviewData,
} from "./DocumentosContratosData";
import { DocumentosContratosPreview } from "./DocumentosContratosPreview";
import type { InventoryStoreSettings } from "./InventoryPrintTypes";

type ContractState =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "ready"; message: string };

export function DocumentosContratosCard({
  detail,
}: {
  detail: InventoryListingDetail;
}) {
  const [form, setForm] = useState<ContractForm>(() =>
    createContractForm(detail),
  );
  const [drafts, setDrafts] = useState<ContractDraft[]>([]);
  const [storeSettings, setStoreSettings] =
    useState<InventoryStoreSettings>(null);
  const [state, setState] = useState<ContractState>({ kind: "idle" });
  const [previewData, setPreviewData] = useState<ContractPreviewData | null>(
    null,
  );
  const listingIdRef = useRef(detail.listing.id);

  useEffect(() => {
    if (listingIdRef.current === detail.listing.id) return;

    listingIdRef.current = detail.listing.id;
    setForm(createContractForm(detail, storeSettings));
    setDrafts([]);
    setPreviewData(null);
    setState({ kind: "idle" });
  }, [detail, storeSettings]);

  useEffect(() => {
    let isActive = true;

    async function loadStoreSettings() {
      try {
        const headers = await createInventoryRuntimeHeaders();
        const response = await fetch("/api/v1/settings/store", { headers });
        if (!response.ok) return;

        const settings = (await response.json()) as InventoryStoreSettings;
        if (!isActive) return;

        setStoreSettings(settings);
        setForm((current) => mergeContractFormStoreSettings(current, settings));
      } catch {
        if (!isActive) return;
        setState({
          kind: "error",
          message: "Revise os dados da loja antes de gerar o documento.",
        });
      }
    }

    void loadStoreSettings();

    return () => {
      isActive = false;
    };
  }, []);

  const documents = useMemo(
    () => createContractDocumentItems(detail.documents, drafts),
    [detail.documents, drafts],
  );

  const handleChange = (field: keyof ContractForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setState({ kind: "idle" });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const missingFields = validateContractForm(form);
    if (missingFields.length) {
      setState({
        kind: "error",
        message: `Preencha: ${missingFields.join(", ")}.`,
      });
      return;
    }

    setDrafts((current) => [createContractDraft(form), ...current]);
    setPreviewData(buildContractPreviewData(detail, form));
    setState({ kind: "ready", message: "Previa gerada para impressao/PDF." });
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black uppercase tracking-wider">
              Contratos do Veiculo
            </h3>
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-black text-accent-strong">
              {documents.length}
            </span>
          </div>
        </div>

        {documents.length ? (
          <div className="flex flex-col gap-2.5">
            {documents.map((document) => (
              <ContractDocumentItem document={document} key={document.id} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-line bg-app/30 p-4 text-sm font-bold text-muted">
            Nenhum contrato ou recibo anexado a este veiculo.
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <Sparkles aria-hidden="true" className="size-4 text-accent" />
            <h3 className="text-sm font-black uppercase tracking-wider">
              Gerar Contrato
            </h3>
          </div>
        </div>

        <DocumentosContratosForm
          form={form}
          onChange={handleChange}
          onSubmit={handleSubmit}
          units={detail.units}
        />

        <ContractStatus state={state} />
      </section>

      {previewData ? (
        <DocumentosContratosPreview
          data={previewData}
          onClose={() => setPreviewData(null)}
        />
      ) : null}
    </div>
  );
}

function ContractDocumentItem({
  document,
}: {
  document: ContractDocumentListItem;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-line bg-app/30 p-3 text-xs font-bold transition-colors hover:bg-app/50">
      <div className="flex min-w-0 items-center gap-2.5">
        <FileText className="size-4 shrink-0 text-accent" />
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate font-black text-app-text">
            {document.title}
          </span>
          <span className="mt-0.5 text-xs font-bold text-muted">
            {document.date}
          </span>
        </div>
      </div>
      <span className={statusClassName(document.status)}>
        {document.status}
      </span>
    </div>
  );
}

function ContractStatus({ state }: { state: ContractState }) {
  if (state.kind === "idle") return null;

  const isError = state.kind === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <p
      className={[
        "flex items-center gap-2 text-sm font-black",
        isError ? "text-danger" : "text-accent-strong",
      ].join(" ")}
    >
      <Icon aria-hidden="true" className="size-4" />
      {state.message}
    </p>
  );
}

function statusClassName(status: ContractDocumentListItem["status"]) {
  const base = "shrink-0 rounded-full border px-2 py-0.5 text-xs font-black";

  if (status === "Assinado" || status === "Emitido") {
    return base + " border-accent-soft bg-accent-soft text-accent-strong";
  }

  if (status === "Pendente") {
    return base + " border-warning/40 bg-warning/10 text-warning";
  }

  return base + " border-line bg-app-elevated text-muted";
}
