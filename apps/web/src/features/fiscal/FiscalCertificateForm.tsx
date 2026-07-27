import { FileKey2, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { FeatureInput } from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import {
  FeatureActionButton,
  FeatureSection,
} from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureStatusBadge,
} from "../../components/ui/FeatureStates";
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
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const certificate = describeFiscalCertificate(
    connection.certificateExpiresAt,
  );
  const hasCertificate = Boolean(connection.certificateExpiresAt);

  const clearSecrets = () => {
    setFile(null);
    setPassword("");
    if (fileInputRef.current) fileInputRef.current.value = "";
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
    setSuccess(null);
    try {
      const updated = await api.uploadCertificate({
        certificate: file,
        password,
      });
      onConnectionChange(updated);
      setSuccess(
        hasCertificate
          ? "Certificado A1 substituído com sucesso."
          : "Certificado A1 enviado com sucesso.",
      );
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
    <FeatureSection
      className="feature-panel"
      description="O arquivo e a senha são enviados diretamente ao servidor e nunca ficam salvos no navegador."
      icon={<FileKey2 aria-hidden="true" className="size-5" />}
      title="Certificado digital A1"
    >
      <div className="mt-4 grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <FeatureStatusBadge tone={certificate.tone}>
            {certificate.label}
          </FeatureStatusBadge>
          <p className="text-sm font-medium text-muted">{certificate.detail}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <FeatureField label="Arquivo do certificado (.pfx ou .p12)">
            <FeatureInput
              accept=".pfx,.p12,application/x-pkcs12"
              aria-label="Arquivo do certificado A1"
              disabled={busy}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              ref={fileInputRef}
              type="file"
            />
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
        {success ? <FeatureAlert tone="success">{success}</FeatureAlert> : null}

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
    </FeatureSection>
  );
}
