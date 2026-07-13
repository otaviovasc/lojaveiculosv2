import { useMemo } from "react";
import { ArrowRight, FileText, ShieldCheck } from "lucide-react";
import type { InventoryListingDetail } from "../model/types";
import { documentsRouteHash } from "../../documents/documentsRouteState";
import {
  createContractDocumentItems,
  type ContractDocumentListItem,
} from "./DocumentosContratosData";

export function DocumentosContratosCard({
  detail,
  unitId: selectedUnitId,
}: {
  detail: InventoryListingDetail;
  unitId?: string | null;
}) {
  const documents = useMemo(
    () => createContractDocumentItems(detail.documents),
    [detail.documents],
  );
  const unitId =
    selectedUnitId ?? documents[0]?.unitId ?? detail.units[0]?.id ?? null;

  return (
    <div className="flex w-full flex-col gap-6">
      <section
        aria-labelledby="vehicle-contracts-title"
        className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5"
      >
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <h3
              className="text-sm font-black uppercase tracking-wider"
              id="vehicle-contracts-title"
            >
              Documentos da operação
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
            Nenhum contrato ou recibo oficial vinculado a este veículo.
          </div>
        )}
      </section>

      <section
        aria-labelledby="official-documents-title"
        className="overflow-hidden rounded-2xl border border-success-strong/20 bg-panel"
      >
        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-green-soft text-success-strong">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-success-strong">
                Fonte oficial
              </p>
              <h3
                className="mt-1 text-base font-black text-app-text"
                id="official-documents-title"
              >
                Emissão vinculada à operação
              </h3>
              <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-muted">
                Contratos e recibos oficiais são materializados no servidor ao
                concluir a venda ou a reserva, com versão, vínculo e trilha de
                auditoria. Este cadastro não cria minutas locais.
              </p>
              <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-muted">
                Na Central de documentos, a prévia e o download usam o mesmo
                arquivo armazenado.
              </p>
            </div>
          </div>

          <a
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-black text-inverse transition-colors hover:bg-accent-strong sm:w-fit"
            href={documentsRouteHash({ documentId: null, unitId })}
          >
            Abrir Central de documentos
            <ArrowRight aria-hidden="true" className="size-4" />
          </a>
        </div>
      </section>
    </div>
  );
}

function ContractDocumentItem({
  document,
}: {
  document: ContractDocumentListItem;
}) {
  return (
    <a
      className="flex items-center justify-between rounded-xl border border-line bg-app/30 p-3 text-xs font-bold transition-colors hover:bg-app/50"
      href={documentsRouteHash({
        documentId: document.id,
        unitId: document.unitId,
      })}
    >
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
    </a>
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
