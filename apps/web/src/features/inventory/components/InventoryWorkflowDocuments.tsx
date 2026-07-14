import { ArrowRight, FileCheck2 } from "lucide-react";
import type { InventoryListingDetail } from "../model/types";

export function InventoryWorkflowDocumentHandoff({
  status,
}: {
  status: InventoryListingDetail["units"][number]["status"] | null;
}) {
  if (status !== "reserved" && status !== "sold") return null;

  const operation = status === "reserved" ? "reserva" : "venda";

  return (
    <section
      aria-label="Documentos oficiais da operação"
      className="mt-4 flex flex-col gap-3 border-t border-line pt-4"
    >
      <div className="flex items-start gap-3 rounded-xl border border-line bg-app/30 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-green-soft text-success-strong">
          <FileCheck2 aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-black text-app-text">
            Documentos da {operation}
          </h3>
          <p className="mt-1 text-sm font-bold leading-5 text-muted">
            Consulte e baixe os PDFs armazenados desta operação na Central de
            documentos. A prévia usa o mesmo arquivo oficial registrado pelo
            fluxo.
          </p>
        </div>
      </div>

      <a
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-app-elevated px-4 text-sm font-black text-app-text transition-colors hover:border-accent/40 hover:text-accent-text sm:w-fit"
        href="#/documents"
      >
        Abrir documentos oficiais
        <ArrowRight aria-hidden="true" className="size-4" />
      </a>
    </section>
  );
}
