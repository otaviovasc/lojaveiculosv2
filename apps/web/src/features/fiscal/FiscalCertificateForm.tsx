import { FileKey2, UploadCloud } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import "../../styles/fiscal-setup.css";
import { FeatureInput } from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { cx } from "../../components/ui/featureShared";
import {
  FeatureAlert,
  FeatureStatusBadge,
} from "../../components/ui/FeatureStates";
import { Toast } from "../../components/ui/Toast";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { FiscalApi } from "./apiClient";
import { describeFiscalCertificate } from "./fiscalConnectionDisplay";
import type { FiscalConnection } from "./types";

const MAX_CERTIFICATE_BYTES = 5_000_000;

type Props = {
  api: FiscalApi;
  connection: FiscalConnection;
  onConnectionChange: (connection: FiscalConnection) => void;
};

function formatCertificateSize(bytes: number) {
  if (bytes >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(1).replace(".", ",")} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1000))} KB`;
}

/**
 * Upload/replace of the A1 certificate. The PFX file and its password live
 * only in component state for the duration of the upload — nothing is written
 * to browser storage and both fields are cleared after the request finishes.
 */
export function FiscalCertificateForm({
  api,
  connection,
  onConnectionChange,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ title: string } | null>(null);

  const certificate = describeFiscalCertificate(
    connection.certificateExpiresAt,
  );
  const hasCertificate = Boolean(connection.certificateExpiresAt);

  const clearSecrets = () => {
    setFile(null);
    setPassword("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    if (busy) return;
    setFile(event.dataTransfer.files?.[0] ?? null);
  };

  const submit = async () => {
    if (!file) {
      setError("Selecione o arquivo do certificado A1 (.pfx ou .p12).");
      return;
    }
    if (file.size > MAX_CERTIFICATE_BYTES) {
      setError("O certificado A1 deve ter no máximo 5 MB.");
      return;
    }
    if (!password.trim()) {
      setError("Informe a senha do certificado.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await api.uploadCertificate({
        certificate: file,
        password,
      });
      onConnectionChange(updated);
      setToast({
        title: hasCertificate
          ? "Certificado A1 substituído com sucesso."
          : "Certificado A1 enviado com sucesso.",
      });
    } catch (cause) {
      setError(
        formatApiErrorDisplay(
          cause,
          "Não foi possível enviar o certificado. Nenhuma operação oficial foi executada.",
        ),
      );
    } finally {
      clearSecrets();
      setBusy(false);
    }
  };

  return (
    <section className="fiscal-setup-panel">
      {toast ? (
        <Toast
          durationMs={4000}
          onDismiss={() => setToast(null)}
          title={toast.title}
          tone="success"
        />
      ) : null}
      <div aria-hidden="true" className="fiscal-setup-panel__blob" />
      <span aria-hidden="true" className="fiscal-setup-panel__watermark">
        <FileKey2 />
      </span>

      <header className="fiscal-setup-panel__header">
        <div className="flex min-w-0 items-start gap-3">
          <span className="fiscal-setup-panel__icon">
            <FileKey2 aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="fiscal-setup-panel__eyebrow">Assinatura digital</p>
            <h3 className="fiscal-setup-panel__title">
              Certificado digital A1
            </h3>
            <p className="fiscal-setup-panel__description">
              O arquivo e a senha são enviados diretamente ao servidor e nunca
              ficam salvos no navegador.
            </p>
          </div>
        </div>
      </header>

      <div className="fiscal-setup-panel__body">
        <div className="flex flex-wrap items-center gap-2">
          <FeatureStatusBadge tone={certificate.tone}>
            {certificate.label}
          </FeatureStatusBadge>
          <p className="text-sm font-medium text-muted">{certificate.detail}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <FeatureField as="div" label="Arquivo do certificado (.pfx ou .p12)">
            <label
              className={cx(
                "fiscal-setup-dropzone",
                dragging && "fiscal-setup-dropzone--dragging",
                file && "fiscal-setup-dropzone--selected",
                busy && "fiscal-setup-dropzone--disabled",
              )}
              onDragLeave={() => setDragging(false)}
              onDragOver={(event) => {
                event.preventDefault();
                if (!busy) setDragging(true);
              }}
              onDrop={handleDrop}
            >
              <input
                accept=".pfx,.p12,application/x-pkcs12"
                aria-label="Arquivo do certificado A1"
                className="sr-only"
                disabled={busy}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                ref={fileInputRef}
                type="file"
              />
              {file ? (
                <>
                  <span className="fiscal-setup-dropzone__file">
                    <span className="fiscal-setup-dropzone__icon">
                      <FileKey2 aria-hidden="true" className="size-6" />
                    </span>
                    <span className="fiscal-setup-dropzone__file-meta">
                      <span className="fiscal-setup-dropzone__file-name">
                        {file.name}
                      </span>
                      <span className="fiscal-setup-dropzone__file-size">
                        {formatCertificateSize(file.size)}
                      </span>
                    </span>
                  </span>
                  <span className="fiscal-setup-dropzone__hint">
                    Arquivo selecionado. Clique ou arraste outro arquivo para
                    trocar.
                  </span>
                </>
              ) : (
                <>
                  <span className="fiscal-setup-dropzone__icon">
                    <UploadCloud aria-hidden="true" className="size-6" />
                  </span>
                  <span className="fiscal-setup-dropzone__title">
                    Arraste o certificado A1 aqui
                  </span>
                  <span className="fiscal-setup-dropzone__hint">
                    ou clique para selecionar o arquivo .pfx ou .p12 (máx. 5 MB)
                  </span>
                </>
              )}
            </label>
          </FeatureField>
          <FeatureField label="Senha do certificado">
            <FeatureInput
              aria-label="Senha do certificado"
              autoComplete="off"
              disabled={busy}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
          </FeatureField>
        </div>

        {error ? <FeatureAlert>{error}</FeatureAlert> : null}

        <div className="flex justify-end">
          <FeatureActionButton
            disabled={!connection.companyId}
            icon={UploadCloud}
            isBusy={busy}
            label={
              hasCertificate ? "Substituir certificado" : "Enviar certificado"
            }
            onClick={() => void submit()}
            title={
              connection.companyId
                ? "Enviar o certificado A1 para a Spedy"
                : "Crie a empresa emissora antes de enviar o certificado"
            }
            variant="primary"
          />
        </div>
      </div>
    </section>
  );
}
