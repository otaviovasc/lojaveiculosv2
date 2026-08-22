import {
  Ban,
  FileCode2,
  FileDown,
  Eye,
  EyeOff,
  PencilLine,
  RefreshCcw,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
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
  isRepeatableStatus,
  readExternalReference,
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
  actionInstanceId,
  canCancelDocuments,
  canDownloadOfficialArtifacts,
  canRepeatDocuments,
  canSyncDocumentStatus,
  document,
  detailsOpen,
  detailsId,
  onCorrect,
  onError,
  onRefresh,
  onToggleDetails,
}: {
  api: FiscalApi;
  actionInstanceId: string;
  canCancelDocuments: boolean;
  canDownloadOfficialArtifacts: boolean;
  canRepeatDocuments: boolean;
  canSyncDocumentStatus: boolean;
  document: FiscalDocument;
  detailsOpen: boolean;
  detailsId: string;
  onCorrect: (document: FiscalDocument) => void;
  onError: (message: string) => void;
  onRefresh: () => Promise<void>;
  onToggleDetails: () => void;
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
  const actionContext =
    readExternalReference(document) ??
    (document.accessKey
      ? `chave final ${document.accessKey.slice(-8)}`
      : document.id);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const reasonInputRef = useRef<HTMLInputElement>(null);
  const cancelPanelId = `fiscal-cancel-${actionInstanceId}-${document.id}`;
  const canSync =
    canSyncDocumentStatus &&
    document.hasProviderReference &&
    isPendingSyncStatus(document.status);
  const canCorrect =
    canRepeatDocuments && isRejectedLikeStatus(document.status);
  const canRepeat = canRepeatDocuments && isRepeatableStatus(document.status);
  const canCancel =
    canCancelDocuments &&
    document.hasProviderReference &&
    isCancellableStatus(document.status);
  const reasonReady = reason.trim().length >= 15;
  const artifactDownloadable = isOfficialArtifactDownloadable(document);
  const downloadsEnabled = canDownloadOfficialArtifacts && artifactDownloadable;

  useEffect(() => {
    if (cancelOpen) reasonInputRef.current?.focus();
  }, [cancelOpen]);

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
      if (kind === "repeat") {
        const draft = await api.repeatDocument(document.id);
        onCorrect(draft);
        return;
      }
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
        <FiscalDetailsAction
          actionContext={actionContext}
          detailsId={detailsId}
          documentLabel={documentLabel}
          disabled={busy !== null}
          expanded={detailsOpen}
          onClick={onToggleDetails}
        />
        <ArtifactDownloadAction
          busy={busy}
          canDownloadOfficialArtifacts={canDownloadOfficialArtifacts}
          document={document}
          enabled={downloadsEnabled}
          format="pdf"
          labelContext={actionContext}
          onDownload={download}
        />
        <ArtifactDownloadAction
          busy={busy}
          canDownloadOfficialArtifacts={canDownloadOfficialArtifacts}
          document={document}
          enabled={downloadsEnabled}
          format="xml"
          labelContext={actionContext}
          onDownload={download}
        />
        {canSync ? (
          <FeatureRowAction
            ariaLabel={`Atualizar status da ${documentLabel} (${actionContext})`}
            disabled={busy !== null}
            icon={RefreshCcw}
            {...(busy === "sync" ? { iconClassName: "animate-spin" } : {})}
            onClick={() => void run("sync")}
            tooltip="Atualizar status"
          />
        ) : null}
        {canCorrect ? (
          <FeatureRowAction
            ariaLabel={`Corrigir e reenviar ${documentLabel} (${actionContext})`}
            disabled={busy !== null}
            icon={PencilLine}
            onClick={() => onCorrect(document)}
            tooltip="Corrigir e reenviar"
          />
        ) : null}
        {canRepeat ? (
          <FeatureRowAction
            ariaLabel={`Criar nova ${documentLabel} a partir desta (${actionContext})`}
            disabled={busy !== null}
            icon={RotateCcw}
            {...(busy === "repeat" ? { iconClassName: "animate-spin" } : {})}
            onClick={() => void run("repeat")}
            tooltip="Usar como modelo"
          />
        ) : null}
        {canCancel ? (
          <FiscalCancelAction
            actionContext={actionContext}
            buttonRef={cancelButtonRef}
            cancelPanelId={cancelPanelId}
            disabled={busy !== null}
            documentLabel={documentLabel}
            expanded={cancelOpen}
            onClick={() => setCancelOpen((current) => !current)}
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
        <div className="fiscal-cancel-bar" id={cancelPanelId}>
          <span className="fiscal-cancel-bar__hint">
            <TriangleAlert aria-hidden="true" className="size-3.5" />
            Cancelamento definitivo no provedor
          </span>
          <FeatureInput
            aria-label="Motivo do cancelamento"
            className="!min-h-9 w-56 !text-xs"
            onChange={(event) => setReason(event.target.value)}
            placeholder="Motivo do cancelamento (mín. 15 caracteres)"
            ref={reasonInputRef}
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
              cancelButtonRef.current?.focus();
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
  labelContext,
  onDownload,
}: {
  busy: "cancel" | "pdf" | "repeat" | "sync" | "xml" | null;
  canDownloadOfficialArtifacts: boolean;
  document: FiscalDocument;
  enabled: boolean;
  format: FiscalArtifactFormat;
  labelContext: string;
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
          ? `Baixando ${label} do documento fiscal (${labelContext})`
          : enabled
            ? `Baixar ${label} do documento fiscal (${labelContext})`
            : `${label} indisponível (${labelContext}). ${unavailable}`
      }
      disabled={busy !== null || !enabled}
      icon={format === "pdf" ? FileDown : FileCode2}
      {...(downloading ? { iconClassName: "animate-spin" } : {})}
      onClick={() => void onDownload(format)}
      tooltip={downloading ? `Baixando ${label}` : tooltip}
    />
  );
}

function FiscalCancelAction({
  actionContext,
  buttonRef,
  cancelPanelId,
  disabled,
  documentLabel,
  expanded,
  onClick,
}: {
  actionContext: string;
  buttonRef: RefObject<HTMLButtonElement | null>;
  cancelPanelId: string;
  disabled: boolean;
  documentLabel: string;
  expanded: boolean;
  onClick: () => void;
}) {
  return (
    <div className="feature-row-action">
      <button
        aria-controls={cancelPanelId}
        aria-expanded={expanded}
        aria-label={`Cancelar ${documentLabel} (${actionContext})`}
        className="feature-row-action__button"
        disabled={disabled}
        onClick={onClick}
        ref={buttonRef}
        type="button"
      >
        <Ban aria-hidden="true" className="feature-row-action__icon" />
      </button>
      <div className="feature-row-action__tooltip" role="tooltip">
        Cancelar nota
      </div>
    </div>
  );
}

function FiscalDetailsAction({
  actionContext,
  detailsId,
  disabled,
  documentLabel,
  expanded,
  onClick,
}: {
  actionContext: string;
  detailsId: string;
  disabled: boolean;
  documentLabel: string;
  expanded: boolean;
  onClick: () => void;
}) {
  const Icon = expanded ? EyeOff : Eye;
  return (
    <div className="feature-row-action">
      <button
        aria-controls={detailsId}
        aria-expanded={expanded}
        aria-label={`${expanded ? "Ocultar" : "Mostrar"} detalhes da ${documentLabel} (${actionContext})`}
        className="feature-row-action__button"
        disabled={disabled}
        onClick={onClick}
        type="button"
      >
        <Icon aria-hidden="true" className="feature-row-action__icon" />
      </button>
      <div className="feature-row-action__tooltip" role="tooltip">
        {expanded ? "Ocultar detalhes" : "Ver detalhes"}
      </div>
    </div>
  );
}

function errorMessage(error: unknown) {
  return formatApiErrorDisplay(
    error,
    "Não foi possível executar a ação fiscal.",
  );
}
