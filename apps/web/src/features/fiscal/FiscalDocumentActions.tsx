import { Ban, PencilLine, RefreshCcw, RotateCcw } from "lucide-react";
import { useState } from "react";
import { FeatureInput } from "../../components/ui/FeatureControls";
import {
  FeatureRowAction,
  FeatureRowActions,
} from "../../components/ui/FeatureTable";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { FiscalApi } from "./apiClient";
import {
  isCancellableStatus,
  isPendingSyncStatus,
  isRejectedLikeStatus,
} from "./fiscalDocumentDisplay";
import { getFiscalDocumentTypeLabel } from "./fiscalLabels";
import type { FiscalDocument } from "./types";

export function FiscalDocumentActions({
  api,
  document,
  onCorrect,
  onError,
  onRefresh,
}: {
  api: FiscalApi;
  document: FiscalDocument;
  onCorrect: (document: FiscalDocument) => void;
  onError: (message: string) => void;
  onRefresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<"cancel" | "repeat" | "sync" | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const documentLabel = getFiscalDocumentTypeLabel(document.documentType);
  const canSync =
    !!document.providerDocumentId && isPendingSyncStatus(document.status);
  const canCorrect = isRejectedLikeStatus(document.status);
  const canCancel =
    !!document.providerDocumentId && isCancellableStatus(document.status);
  const reasonReady = reason.trim().length >= 5;

  async function run(kind: "cancel" | "repeat" | "sync") {
    setBusy(kind);
    try {
      if (kind === "repeat") await api.repeatDocument(document.id);
      if (kind === "sync" && document.providerDocumentId) {
        await api.syncDocumentStatus(document.id, {});
      }
      if (kind === "cancel" && document.providerDocumentId) {
        await api.cancelDocument(document.id, { reason: reason.trim() });
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
    <div className="flex flex-col items-end gap-2">
      <FeatureRowActions>
        {canSync ? (
          <FeatureRowAction
            ariaLabel={`Atualizar status da ${documentLabel}`}
            disabled={busy !== null}
            icon={RefreshCcw}
            {...(busy === "sync" ? { iconClassName: "animate-spin" } : {})}
            onClick={() => void run("sync")}
            tooltip="Atualizar status"
          />
        ) : null}
        {canCorrect ? (
          <FeatureRowAction
            ariaLabel={`Corrigir e reenviar ${documentLabel}`}
            disabled={busy !== null}
            icon={PencilLine}
            onClick={() => onCorrect(document)}
            tooltip="Corrigir e reenviar"
          />
        ) : null}
        <FeatureRowAction
          ariaLabel={`Emitir ${documentLabel} novamente`}
          disabled={busy !== null}
          icon={RotateCcw}
          {...(busy === "repeat" ? { iconClassName: "animate-spin" } : {})}
          onClick={() => void run("repeat")}
          tooltip="Emitir novamente"
        />
        {canCancel ? (
          <FeatureRowAction
            ariaLabel={`Cancelar ${documentLabel}`}
            disabled={busy !== null}
            icon={Ban}
            onClick={() => setCancelOpen((current) => !current)}
            tooltip="Cancelar nota"
          />
        ) : null}
      </FeatureRowActions>
      {cancelOpen && canCancel ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <FeatureInput
            aria-label="Motivo do cancelamento"
            className="!min-h-9 w-56 !text-xs"
            onChange={(event) => setReason(event.target.value)}
            placeholder="Motivo do cancelamento (mín. 5 caracteres)"
            value={reason}
          />
          <button
            aria-label="Confirmar cancelamento"
            className="inline-flex min-h-9 items-center rounded-lg border border-danger/40 bg-danger/10 px-3 text-xs font-bold text-danger-soft-foreground transition-colors hover:bg-danger/20 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy !== null || !reasonReady}
            onClick={() => void run("cancel")}
            type="button"
          >
            Confirmar
          </button>
          <button
            aria-label="Desistir do cancelamento"
            className="inline-flex min-h-9 items-center rounded-lg border border-line bg-panel px-3 text-xs font-bold text-muted transition-colors hover:text-app-text disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy !== null}
            onClick={() => {
              setCancelOpen(false);
              setReason("");
            }}
            type="button"
          >
            Voltar
          </button>
        </div>
      ) : null}
    </div>
  );
}

function errorMessage(error: unknown) {
  return formatApiErrorDisplay(
    error,
    "Não foi possível executar a ação fiscal.",
  );
}
