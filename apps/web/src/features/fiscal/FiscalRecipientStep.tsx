import { Eye } from "lucide-react";
import {
  FeatureInput,
  FeatureSelect,
} from "../../components/ui/FeatureControls";
import {
  FeatureField,
  FeatureFieldGroup,
  FeatureFormSection,
} from "../../components/ui/FeatureForms";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import {
  formatBrazilianDocument,
  formatBrazilianPhone,
  formatBrazilianZipCode,
} from "../../lib/masks";
import type { FiscalIssueDraft, IssueRecipientForm } from "./fiscalIssueModel";
import type { FiscalRecipient, FiscalTemplate } from "./types";

export function FiscalRecipientStep({
  disabled,
  draft,
  errors = {},
  isPreviewing,
  onChange,
  onNfseChange,
  onPreview,
  preview,
  previewUnresolved,
  recipients,
  templates,
}: {
  disabled?: boolean;
  draft: FiscalIssueDraft;
  errors?: Record<string, string>;
  isPreviewing?: boolean;
  onChange: (patch: Partial<IssueRecipientForm>) => void;
  onNfseChange: (patch: Partial<FiscalIssueDraft["nfse"]>) => void;
  onPreview?: () => void;
  preview?: string | null;
  previewUnresolved?: readonly string[];
  recipients: readonly FiscalRecipient[];
  templates: readonly FiscalTemplate[];
}) {
  if (draft.kind === "nfse") {
    const visibleTemplates = templates.filter(
      (template) =>
        !draft.nfse.recipientId ||
        !template.recipientId ||
        template.recipientId === draft.nfse.recipientId,
    );
    return (
      <>
        <FeatureFormSection
          description="A NFS-e de comissão usa o tomador e o modelo cadastrados no catálogo fiscal."
          title="Tomador e modelo"
        >
          <FeatureFieldGroup>
            <FeatureField label="Financeira / Tomador">
              <FeatureSelect
                ariaLabel="Financeira / Tomador"
                disabled={disabled}
                onChange={(recipientId) => onNfseChange({ recipientId })}
                options={[
                  { label: "Financeira / Tomador", value: "" },
                  ...recipients.map((recipient) => ({
                    label: recipient.legalName,
                    value: recipient.id,
                  })),
                ]}
                value={draft.nfse.recipientId}
              />
            </FeatureField>
            <FeatureField error={errors.origin} label="Tipo de comissão">
              <FeatureSelect
                ariaLabel="Tipo de comissão"
                disabled={disabled}
                onChange={(templateId) => onNfseChange({ templateId })}
                options={[
                  { label: "Tipo de comissão", value: "" },
                  ...visibleTemplates.map((template) => ({
                    label: `${template.name} v${template.version}`,
                    value: template.id,
                  })),
                ]}
                value={draft.nfse.templateId}
              />
            </FeatureField>
            <FeatureField error={errors.items} label="Valor da comissão">
              <FeatureInput
                aria-label="Valor da comissão"
                disabled={disabled}
                inputMode="decimal"
                onChange={(event) =>
                  onNfseChange({ grossAmount: event.target.value })
                }
                placeholder="0,00"
                value={draft.nfse.grossAmount}
              />
            </FeatureField>
            <FeatureField label="Competência">
              <FeatureInput
                aria-label="Competência"
                disabled={disabled}
                onChange={(event) =>
                  onNfseChange({ competence: event.target.value })
                }
                type="month"
                value={draft.nfse.competence}
              />
            </FeatureField>
          </FeatureFieldGroup>
          <div className="mt-4">
            <FeatureActionButton
              disabled={Boolean(disabled) || !draft.nfse.templateId}
              icon={Eye}
              isBusy={Boolean(isPreviewing)}
              label="Pré-visualizar descrição"
              onClick={() => onPreview?.()}
              title="Pré-visualizar descrição da NFS-e"
            />
          </div>
        </FeatureFormSection>
        {preview ? (
          <FeatureAlert tone="info">
            {preview}
            {previewUnresolved?.length
              ? ` | Faltam: ${previewUnresolved.join(", ")}`
              : ""}
          </FeatureAlert>
        ) : null}
      </>
    );
  }

  return (
    <>
      <FeatureFormSection
        description="Comprador que recebe a NF-e. Vendas vinculadas preenchem estes dados automaticamente."
        title="Destinatário"
      >
        <FeatureFieldGroup>
          <FeatureField error={errors.buyerName} label="Nome / Razão social">
            <FeatureInput
              aria-label="Nome do destinatário"
              disabled={disabled}
              onChange={(event) => onChange({ name: event.target.value })}
              value={draft.recipient.name}
            />
          </FeatureField>
          <FeatureField error={errors.buyerDocument} label="CPF / CNPJ">
            <FeatureInput
              aria-label="CPF ou CNPJ do destinatário"
              disabled={disabled}
              inputMode="numeric"
              onChange={(event) =>
                onChange({
                  document: formatBrazilianDocument(event.target.value),
                })
              }
              value={draft.recipient.document}
            />
          </FeatureField>
          <FeatureField error={errors.buyerEmail} label="E-mail">
            <FeatureInput
              aria-label="E-mail do destinatário"
              disabled={disabled}
              onChange={(event) => onChange({ email: event.target.value })}
              type="email"
              value={draft.recipient.email}
            />
          </FeatureField>
          <FeatureField label="Telefone">
            <FeatureInput
              aria-label="Telefone do destinatário"
              disabled={disabled}
              inputMode="tel"
              onChange={(event) =>
                onChange({ phone: formatBrazilianPhone(event.target.value) })
              }
              value={draft.recipient.phone}
            />
          </FeatureField>
        </FeatureFieldGroup>
      </FeatureFormSection>

      <FeatureFormSection
        description="Endereço fiscal do destinatário (opcional para NF-e de veículo)."
        title="Endereço"
      >
        <FeatureFieldGroup>
          <FeatureField label="CEP">
            <FeatureInput
              aria-label="CEP"
              disabled={disabled}
              inputMode="numeric"
              onChange={(event) =>
                onChange({
                  postalCode: formatBrazilianZipCode(event.target.value),
                })
              }
              value={draft.recipient.postalCode}
            />
          </FeatureField>
          <FeatureField label="Logradouro">
            <FeatureInput
              aria-label="Logradouro"
              disabled={disabled}
              onChange={(event) => onChange({ street: event.target.value })}
              value={draft.recipient.street}
            />
          </FeatureField>
          <FeatureField label="Número">
            <FeatureInput
              aria-label="Número"
              disabled={disabled}
              onChange={(event) => onChange({ number: event.target.value })}
              value={draft.recipient.number}
            />
          </FeatureField>
          <FeatureField label="Bairro">
            <FeatureInput
              aria-label="Bairro"
              disabled={disabled}
              onChange={(event) => onChange({ district: event.target.value })}
              value={draft.recipient.district}
            />
          </FeatureField>
          <FeatureField label="Cidade">
            <FeatureInput
              aria-label="Cidade"
              disabled={disabled}
              onChange={(event) => onChange({ city: event.target.value })}
              value={draft.recipient.city}
            />
          </FeatureField>
          <FeatureField label="UF">
            <FeatureInput
              aria-label="UF"
              disabled={disabled}
              maxLength={2}
              onChange={(event) =>
                onChange({ state: event.target.value.toUpperCase() })
              }
              value={draft.recipient.state}
            />
          </FeatureField>
          <FeatureField label="Código IBGE do município">
            <FeatureInput
              aria-label="Código IBGE do município"
              disabled={disabled}
              inputMode="numeric"
              maxLength={7}
              onChange={(event) =>
                onChange({ cityCode: event.target.value.replace(/\D/g, "") })
              }
              value={draft.recipient.cityCode}
            />
          </FeatureField>
        </FeatureFieldGroup>
      </FeatureFormSection>
    </>
  );
}
