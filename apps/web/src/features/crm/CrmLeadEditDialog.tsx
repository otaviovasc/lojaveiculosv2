import { CalendarDays, LoaderCircle, Save, UserRound } from "lucide-react";
import { useState } from "react";
import { FeatureInput } from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import {
  FeatureDialog,
  FeatureDialogActions,
} from "../../components/ui/FeatureOverlay";
import { formatBrazilianPhone } from "../../lib/masks";
import { CrmDateField } from "./CrmFormControls";
import { CrmFormError, formatCrmSubmitError } from "./CrmFormFeedback";
import type { LeadContactPatch } from "./crmPipelineModels";
import {
  formatLeadBirthDate,
  getSaoPauloTodayIsoDate,
  isValidLeadBirthDate,
} from "./crmLeadBirthDate";
import { validateQuickLeadInput } from "./crmFormValidation";
import type { ProductCrmLead } from "./productCrmTypes";

type Props = {
  lead: ProductCrmLead;
  onClose: () => void;
  onSave: (input: LeadContactPatch) => Promise<void>;
};

export function CrmLeadEditDialog({ lead, onClose, onSave }: Props) {
  const [name, setName] = useState(lead.buyerName ?? "");
  const [phone, setPhone] = useState(lead.buyerPhone ?? "");
  const [email, setEmail] = useState(lead.buyerEmail ?? "");
  const [birthDate, setBirthDate] = useState(lead.birthDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    const validationError = validateQuickLeadInput({
      email,
      name,
      phone,
    });
    if (validationError) {
      setError(validationError);
      return;
    }
    if (birthDate && !isValidLeadBirthDate(birthDate)) {
      setError("Informe uma data de nascimento válida.");
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      await onSave({
        birthDate: birthDate || null,
        buyerEmail: email.trim() || null,
        buyerName: name.trim(),
        buyerPhone: phone.trim() || null,
      });
      onClose();
    } catch (caught) {
      setError(
        formatCrmSubmitError(caught, "Não foi possível salvar os dados."),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FeatureDialog
      className="max-w-xl"
      description="Atualize os dados de contato e a data de nascimento do cliente."
      footer={
        <FeatureDialogActions
          confirmDisabled={isSaving}
          confirmIcon={
            isSaving ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin"
              />
            ) : (
              <Save aria-hidden="true" className="size-4" />
            )
          }
          confirmLabel="Salvar alterações"
          isLoading={isSaving}
          loadingLabel="Salvando"
          onCancel={onClose}
          onConfirm={() => void handleSubmit()}
        />
      }
      icon={<UserRound aria-hidden="true" />}
      isOpen
      onClose={onClose}
      title="Editar cliente"
    >
      <form
        className="grid gap-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <FeatureField label="Nome do contato">
          <FeatureInput
            autoComplete="name"
            aria-invalid={error === "Informe o nome do contato."}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            required
            value={name}
          />
        </FeatureField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FeatureField label="Telefone">
            <FeatureInput
              autoComplete="tel"
              inputMode="tel"
              onChange={(event) => {
                setPhone(formatBrazilianPhone(event.target.value));
                setError(null);
              }}
              value={phone}
            />
          </FeatureField>
          <FeatureField label="E-mail">
            <FeatureInput
              autoCapitalize="none"
              autoComplete="email"
              onBlur={() => setEmail((value) => value.trim().toLowerCase())}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
              }}
              spellCheck={false}
              type="email"
              value={email}
            />
          </FeatureField>
        </div>
        <FeatureField
          hint={`Atual: ${formatLeadBirthDate(lead.birthDate)}`}
          label={
            <span className="flex items-center gap-1.5">
              <CalendarDays aria-hidden="true" className="size-4 text-muted" />
              Data de nascimento
            </span>
          }
        >
          <CrmDateField
            label="Nascimento"
            max={getSaoPauloTodayIsoDate()}
            onChange={(value) => {
              setBirthDate(value);
              setError(null);
            }}
            value={birthDate}
          />
        </FeatureField>
        {error ? <CrmFormError>{error}</CrmFormError> : null}
      </form>
    </FeatureDialog>
  );
}
