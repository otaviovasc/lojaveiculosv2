import { Building2, Save } from "lucide-react";
import { useState, type ReactNode } from "react";
import "../../styles/fiscal-setup.css";
import { FeatureInput } from "../../components/ui/FeatureControls";
import {
  FeatureField,
  FeatureFieldGroup,
} from "../../components/ui/FeatureForms";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { Toast } from "../../components/ui/Toast";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import {
  formatBrazilianDocument,
  formatBrazilianPhone,
  formatBrazilianZipCode,
} from "../../lib/masks";
import type { FiscalApi } from "./apiClient";
import {
  buildSetupInput,
  hasIssuerProfileErrors,
  readIssuerProfileDraft,
  validateIssuerProfileDraft,
  type IssuerProfileErrors,
} from "./fiscalSetupModel";
import type { FiscalConnection } from "./types";

type Props = {
  api: FiscalApi;
  connection: FiscalConnection;
  onConnectionChange: (connection: FiscalConnection) => void;
};

function SetupSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="fiscal-setup-section">
      <h4 className="fiscal-setup-section-label">{title}</h4>
      <FeatureFieldGroup>{children}</FeatureFieldGroup>
    </section>
  );
}

export function FiscalIssuerSetupForm({
  api,
  connection,
  onConnectionChange,
}: Props) {
  const [draft, setDraft] = useState(() => {
    const initial = readIssuerProfileDraft(connection.issuerProfile);
    return {
      ...initial,
      federalTaxNumber: formatBrazilianDocument(initial.federalTaxNumber),
      phone: formatBrazilianPhone(initial.phone),
      postalCode: formatBrazilianZipCode(initial.postalCode),
    };
  });
  const [errors, setErrors] = useState<IssuerProfileErrors>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    title: string;
    children?: string;
  } | null>(null);

  const patch = (patchDraft: Partial<typeof draft>) => {
    setDraft((current) => ({ ...current, ...patchDraft }));
  };

  const submit = async () => {
    const nextErrors = validateIssuerProfileDraft(draft);
    setErrors(nextErrors);
    if (hasIssuerProfileErrors(nextErrors)) return;
    setBusy(true);
    setError(null);
    try {
      onConnectionChange(await api.setupConnection(buildSetupInput(draft)));
      setToast({
        title: "Dados da empresa enviados ao provedor.",
        children:
          "A conexão entrou em revisão até os padrões fiscais serem confirmados.",
      });
    } catch (cause) {
      setError(
        formatApiErrorDisplay(
          cause,
          "Não foi possível salvar os dados da empresa emissora. Nenhuma operação oficial foi executada.",
        ),
      );
    } finally {
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
        >
          {toast.children}
        </Toast>
      ) : null}
      <div aria-hidden="true" className="fiscal-setup-panel__blob" />
      <span aria-hidden="true" className="fiscal-setup-panel__watermark">
        <Building2 />
      </span>

      <header className="fiscal-setup-panel__header">
        <div className="flex min-w-0 items-start gap-3">
          <span className="fiscal-setup-panel__icon">
            <Building2 aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="fiscal-setup-panel__eyebrow">Cadastro fiscal</p>
            <h3 className="fiscal-setup-panel__title">Empresa emissora</h3>
            <p className="fiscal-setup-panel__description">
              Dados oficiais da loja usados pelo provedor para criar a empresa
              emissora.
            </p>
          </div>
        </div>
      </header>

      <div className="fiscal-setup-panel__body">
        <SetupSection title="Identificação">
          <FeatureField error={errors.name} label="Nome fantasia">
            <FeatureInput
              aria-label="Nome fantasia"
              disabled={busy}
              onChange={(event) => patch({ name: event.target.value })}
              value={draft.name}
            />
          </FeatureField>
          <FeatureField error={errors.legalName} label="Razão social">
            <FeatureInput
              aria-label="Razão social"
              disabled={busy}
              onChange={(event) => patch({ legalName: event.target.value })}
              value={draft.legalName}
            />
          </FeatureField>
          <FeatureField error={errors.federalTaxNumber} label="CNPJ">
            <FeatureInput
              aria-label="CNPJ"
              disabled={busy}
              inputMode="numeric"
              onChange={(event) =>
                patch({
                  federalTaxNumber: formatBrazilianDocument(event.target.value),
                })
              }
              placeholder="Somente números ou formatado"
              value={draft.federalTaxNumber}
            />
          </FeatureField>
          <FeatureField
            error={errors.stateTaxNumber}
            label="Inscrição estadual (opcional)"
          >
            <FeatureInput
              aria-label="Inscrição estadual"
              disabled={busy}
              onChange={(event) =>
                patch({ stateTaxNumber: event.target.value })
              }
              value={draft.stateTaxNumber}
            />
          </FeatureField>
          <FeatureField
            error={errors.cityTaxNumber}
            label="Inscrição municipal (opcional)"
          >
            <FeatureInput
              aria-label="Inscrição municipal"
              disabled={busy}
              onChange={(event) => patch({ cityTaxNumber: event.target.value })}
              value={draft.cityTaxNumber}
            />
          </FeatureField>
          <FeatureField error={errors.email} label="E-mail fiscal (opcional)">
            <FeatureInput
              aria-label="E-mail fiscal"
              disabled={busy}
              onChange={(event) => patch({ email: event.target.value })}
              type="email"
              value={draft.email}
            />
          </FeatureField>
          <FeatureField error={errors.phone} label="Telefone (opcional)">
            <FeatureInput
              aria-label="Telefone"
              disabled={busy}
              inputMode="tel"
              onChange={(event) =>
                patch({ phone: formatBrazilianPhone(event.target.value) })
              }
              value={draft.phone}
            />
          </FeatureField>
        </SetupSection>

        <SetupSection title="Regime tributário (opcional)">
          <FeatureField error={errors.taxRegime} label="Regime tributário">
            <FeatureInput
              aria-label="Regime tributário"
              disabled={busy}
              onChange={(event) => patch({ taxRegime: event.target.value })}
              placeholder="Ex.: simples_nacional"
              value={draft.taxRegime}
            />
          </FeatureField>
          <FeatureField
            error={errors.simplesNacionalTaxRegime}
            label="Regime no Simples Nacional"
          >
            <FeatureInput
              aria-label="Regime no Simples Nacional"
              disabled={busy}
              onChange={(event) =>
                patch({ simplesNacionalTaxRegime: event.target.value })
              }
              value={draft.simplesNacionalTaxRegime}
            />
          </FeatureField>
          <FeatureField error={errors.specialTaxRegime} label="Regime especial">
            <FeatureInput
              aria-label="Regime especial"
              disabled={busy}
              onChange={(event) =>
                patch({ specialTaxRegime: event.target.value })
              }
              value={draft.specialTaxRegime}
            />
          </FeatureField>
        </SetupSection>

        <SetupSection title="Endereço fiscal">
          <FeatureField error={errors.street} label="Logradouro">
            <FeatureInput
              aria-label="Logradouro"
              disabled={busy}
              onChange={(event) => patch({ street: event.target.value })}
              value={draft.street}
            />
          </FeatureField>
          <FeatureField error={errors.number} label="Número">
            <FeatureInput
              aria-label="Número"
              disabled={busy}
              onChange={(event) => patch({ number: event.target.value })}
              value={draft.number}
            />
          </FeatureField>
          <FeatureField error={errors.district} label="Bairro">
            <FeatureInput
              aria-label="Bairro"
              disabled={busy}
              onChange={(event) => patch({ district: event.target.value })}
              value={draft.district}
            />
          </FeatureField>
          <FeatureField error={errors.postalCode} label="CEP">
            <FeatureInput
              aria-label="CEP"
              disabled={busy}
              inputMode="numeric"
              onChange={(event) =>
                patch({
                  postalCode: formatBrazilianZipCode(event.target.value),
                })
              }
              value={draft.postalCode}
            />
          </FeatureField>
          <FeatureField
            error={errors.additionalInformation}
            label="Complemento (opcional)"
          >
            <FeatureInput
              aria-label="Complemento"
              disabled={busy}
              onChange={(event) =>
                patch({ additionalInformation: event.target.value })
              }
              value={draft.additionalInformation}
            />
          </FeatureField>
          <FeatureField error={errors.cityName} label="Município">
            <FeatureInput
              aria-label="Município"
              disabled={busy}
              onChange={(event) => patch({ cityName: event.target.value })}
              value={draft.cityName}
            />
          </FeatureField>
          <FeatureField error={errors.cityState} label="UF">
            <FeatureInput
              aria-label="UF"
              disabled={busy}
              maxLength={2}
              onChange={(event) => patch({ cityState: event.target.value })}
              value={draft.cityState}
            />
          </FeatureField>
          <FeatureField
            error={errors.cityCode}
            hint="Código do município usado na emissão fiscal."
            label="Código IBGE do município"
          >
            <FeatureInput
              aria-label="Código IBGE do município"
              disabled={busy}
              inputMode="numeric"
              onChange={(event) => patch({ cityCode: event.target.value })}
              value={draft.cityCode}
            />
          </FeatureField>
        </SetupSection>

        <SetupSection title="Atividades econômicas (opcional)">
          <FeatureField error={errors.mainActivityCode} label="CNAE principal">
            <FeatureInput
              aria-label="CNAE principal"
              disabled={busy}
              inputMode="numeric"
              onChange={(event) =>
                patch({ mainActivityCode: event.target.value })
              }
              value={draft.mainActivityCode}
            />
          </FeatureField>
          <FeatureField
            error={errors.secondaryActivityCodes}
            hint="Separe múltiplos códigos por vírgula."
            label="CNAEs secundários"
          >
            <FeatureInput
              aria-label="CNAEs secundários"
              disabled={busy}
              onChange={(event) =>
                patch({ secondaryActivityCodes: event.target.value })
              }
              value={draft.secondaryActivityCodes}
            />
          </FeatureField>
        </SetupSection>

        {error ? <FeatureAlert>{error}</FeatureAlert> : null}

        <div className="flex justify-end">
          <FeatureActionButton
            icon={Save}
            isBusy={busy}
            label={
              connection.companyId
                ? "Atualizar dados da empresa"
                : "Salvar e criar empresa"
            }
            onClick={() => void submit()}
            title="Enviar os dados da empresa emissora para a Spedy"
            variant="primary"
          />
        </div>
      </div>
    </section>
  );
}
