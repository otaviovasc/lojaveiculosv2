import {
  Ban,
  FileCode2,
  FileDown,
  PencilLine,
  RefreshCcw,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
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
import {
  fiscalArtifactLabel,
  isOfficialArtifactDownloadable,
  officialArtifactUnavailableMessage,
  triggerFiscalArtifactDownload,
} from "./fiscalArtifactDownload";
import type { FiscalArtifactFormat, FiscalDocument } from "./types";

export function FiscalDocumentActions({
  api,
  canDownloadOfficialArtifacts,
  document,
  onCorrect,
  onError,
  onRefresh,
}: {
  api: FiscalApi;
  canDownloadOfficialArtifacts: boolean;
  document: FiscalDocument;
  onCorrect: (document: FiscalDocument) => void;
  onError: (message: string) => void;
  onRefresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<
    "cancel" | "pdf" | "repeat" | "sync" | "xml" | null
  >(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [downloadFeedback, setDownloadFeedback] = useState<{
    kind: "error" | "success";
    message: string;
  } | null>(null);
  const [reason, setReason] = useState("");
  const documentLabel = getFiscalDocumentTypeLabel(document.documentType);
  const canSync =
    document.hasProviderReference && isPendingSyncStatus(document.status);
  const canCorrect = isRejectedLikeStatus(document.status);
  const canCancel =
    document.hasProviderReference && isCancellableStatus(document.status);
  const reasonReady = reason.trim().length >= 15;
  const artifactDownloadable = isOfficialArtifactDownloadable(document);
  const downloadsEnabled = canDownloadOfficialArtifacts && artifactDownloadable;

  async function download(format: FiscalArtifactFormat) {
    if (!downloadsEnabled) return;
    setBusy(format);
    setDownloadFeedback(null);
    try {
      const artifact = await api.downloadDocumentArtifact(document.id, format);
      triggerFiscalArtifactDownload(artifact.blob, artifact.fileName);
      setDownloadFeedback({
        kind: "success",
        message: `Download do ${fiscalArtifactLabel(format)} iniciado.`,
      });
    } catch (error) {
      setDownloadFeedback({
        kind: "error",
        message: formatApiErrorDisplay(
          error,
          `Não foi possível baixar o ${fiscalArtifactLabel(format)}.`,
        ),
      });
    } finally {
      setBusy(null);
    }
  }

  async function run(kind: "cancel" | "repeat" | "sync") {
    setBusy(kind);
    try {
      if (kind === "repeat") await api.repeatDocument(document.id);
      if (kind === "sync" && document.hasProviderReference) {
        await api.syncDocumentStatus(document.id, {});
      }
      if (kind === "cancel" && document.hasProviderReference) {
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
        <ArtifactDownloadAction
          busy={busy}
          canDownloadOfficialArtifacts={canDownloadOfficialArtifacts}
          document={document}
          enabled={downloadsEnabled}
          format="pdf"
          onDownload={download}
        />
        <ArtifactDownloadAction
          busy={busy}
          canDownloadOfficialArtifacts={canDownloadOfficialArtifacts}
          document={document}
          enabled={downloadsEnabled}
          format="xml"
          onDownload={download}
        />
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
      {downloadFeedback ? (
        <span
          className={
            downloadFeedback.kind === "error"
              ? "fiscal-artifact-feedback fiscal-artifact-feedback--error"
              : "fiscal-artifact-feedback"
          }
          role={downloadFeedback.kind === "error" ? "alert" : "status"}
        >
          {downloadFeedback.message}
        </span>
      ) : null}
      {cancelOpen && canCancel ? (
        <div className="fiscal-cancel-bar">
          <span className="fiscal-cancel-bar__hint">
            <TriangleAlert aria-hidden="true" className="size-3.5" />
            Cancelamento definitivo no provedor
          </span>
          <FeatureInput
            aria-label="Motivo do cancelamento"
            className="!min-h-9 w-56 !text-xs"
            onChange={(event) => setReason(event.target.value)}
            placeholder="Motivo do cancelamento (mín. 15 caracteres)"
            value={reason}
          />
          <button
            aria-label="Confirmar cancelamento"
            className="fiscal-cancel-bar__confirm"
            disabled={busy !== null || !reasonReady}
            onClick={() => void run("cancel")}
            type="button"
          >
            Confirmar
          </button>
          <button
            aria-label="Desistir do cancelamento"
            className="fiscal-cancel-bar__dismiss"
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

function ArtifactDownloadAction({
  busy,
  canDownloadOfficialArtifacts,
  document,
  enabled,
  format,
  onDownload,
}: {
  busy: "cancel" | "pdf" | "repeat" | "sync" | "xml" | null;
  canDownloadOfficialArtifacts: boolean;
  document: FiscalDocument;
  enabled: boolean;
  format: FiscalArtifactFormat;
  onDownload: (format: FiscalArtifactFormat) => Promise<void>;
}) {
  const label = fiscalArtifactLabel(format);
  const downloading = busy === format;
  const unavailable = officialArtifactUnavailableMessage(
    document,
    canDownloadOfficialArtifacts,
  );
  const tooltip = enabled ? `Baixar ${label}` : unavailable;
  return (
    <FeatureRowAction
      ariaLabel={
        downloading
          ? `Baixando ${label} do documento fiscal`
          : enabled
            ? `Baixar ${label} do documento fiscal`
            : `${label} indisponível. ${unavailable}`
      }
      disabled={busy !== null || !enabled}
      icon={format === "pdf" ? FileDown : FileCode2}
      {...(downloading ? { iconClassName: "animate-spin" } : {})}
      onClick={() => void onDownload(format)}
      tooltip={downloading ? `Baixando ${label}` : tooltip}
    />
  );
}

function errorMessage(error: unknown) {
  return formatApiErrorDisplay(
    error,
    "Não foi possível executar a ação fiscal.",
  );
}
