import { RefreshCcw, RotateCcw, XCircle } from "lucide-react";
import { useState } from "react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { FiscalApi } from "./apiClient";
import type { FiscalDocument } from "./types";

export function FiscalDocumentActions({
  api,
  document,
  onError,
  onRefresh,
}: {
  api: FiscalApi;
  document: FiscalDocument;
  onError: (message: string) => void;
  onRefresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<"cancel" | "repeat" | "sync" | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const canCancel =
    !!document.providerDocumentId && document.status !== "cancelled";

  async function run(kind: "cancel" | "repeat" | "sync") {
    setBusy(kind);
    try {
      if (kind === "repeat") await api.repeatDocument(document.id);
      if (kind === "sync" && document.providerDocumentId) {
        await api.syncDocumentStatus(document.id, {});
      }
      if (kind === "cancel" && document.providerDocumentId) {
        await api.cancelDocument(document.id, {
          reason,
        });
        setCancelOpen(false);
        setReason("");
      }
      await onRefresh();
    } catch (error) {
      onError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="feature-form-row">
      <button
        disabled={busy !== null}
        onClick={() => void run("repeat")}
        title="Emitir novamente"
        type="button"
      >
        <RotateCcw aria-hidden="true" className="size-4" />
        Emitir novamente
      </button>
      {document.providerDocumentId ? (
        <button
          disabled={busy !== null}
          onClick={() => void run("sync")}
          title="Atualizar status"
          type="button"
        >
          <RefreshCcw aria-hidden="true" className="size-4" />
          Status
        </button>
      ) : null}
      {canCancel ? (
        <>
          <button
            disabled={busy !== null}
            onClick={() => setCancelOpen((current) => !current)}
            title="Cancelar nota"
            type="button"
          >
            <XCircle aria-hidden="true" className="size-4" />
            Cancelar
          </button>
          {cancelOpen ? (
            <>
              <input
                aria-label="Motivo do cancelamento"
                onChange={(event) => setReason(event.target.value)}
                placeholder="Motivo do cancelamento"
                value={reason}
              />
              <button
                disabled={busy !== null || reason.trim().length < 5}
                onClick={() => void run("cancel")}
                type="button"
              >
                Confirmar
              </button>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function errorMessage(error: unknown) {
  return formatApiErrorDisplay(
    error,
    "Nao foi possivel executar a acao fiscal.",
  );
}
