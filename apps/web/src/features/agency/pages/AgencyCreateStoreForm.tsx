import { CircleCheck, Globe2, LockKeyhole, Store } from "lucide-react";
import type { FormEvent } from "react";
import type { TenantAccessSummary } from "../../account/apiClient";
import type { AgencyStoreFieldErrors } from "../../account/onboardingValidation";
import {
  FeatureInput,
  FeatureSelect,
} from "../../../components/ui/FeatureControls";
import { FeatureField } from "../../../components/ui/FeatureForms";
import { FeatureActionButton } from "../../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../../components/ui/FeatureStates";
import { AgencyCreateStoreReadiness } from "./AgencyCreateStoreReadiness";

export function AgencyCreateStoreForm({
  agencyTenants,
  fieldErrors,
  isSubmitting,
  onNameChange,
  onSubmit,
  onSubdomainChange,
  onTenantChange,
  selectedTenantId,
  storeName,
  subdomain,
  submitError,
}: {
  agencyTenants: TenantAccessSummary[];
  fieldErrors: AgencyStoreFieldErrors;
  isSubmitting: boolean;
  onNameChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSubdomainChange: (value: string) => void;
  onTenantChange: (tenantId: string) => void;
  selectedTenantId: string;
  storeName: string;
  subdomain: string;
  submitError: string | null;
}) {
  const canSubmit = Boolean(
    selectedTenantId && storeName.trim() && subdomain.trim(),
  );
  const readinessMessage = !storeName.trim()
    ? "Informe o nome da concessionária para liberar a criação."
    : !subdomain.trim()
      ? "Defina o endereço público para liberar a criação."
      : "Identidade completa. A concessionária está pronta para ser criada.";

  return (
    <form className="agency-create-form" noValidate onSubmit={onSubmit}>
      {submitError ? (
        <FeatureAlert title="Revise o cadastro">
          <p>{submitError}</p>
        </FeatureAlert>
      ) : null}

      <AgencyCreateStoreReadiness
        hasName={Boolean(storeName.trim())}
        hasSubdomain={Boolean(subdomain.trim())}
      />

      <FeatureField error={fieldErrors.tenantId} label="Conta de agência">
        <FeatureSelect
          ariaLabel="Conta de agência"
          disabled={agencyTenants.length === 1 || isSubmitting}
          name="tenantId"
          onChange={onTenantChange}
          options={agencyTenants.map((tenant) => ({
            label: tenant.tenantName || "Conta de agência",
            value: tenant.tenantId,
          }))}
          value={selectedTenantId}
        />
      </FeatureField>

      <FeatureField
        error={fieldErrors.storeTradingName}
        hint="Este nome aparece no painel, na equipe e nos documentos da loja."
        label="Nome da concessionária"
      >
        <FeatureInput
          aria-label="Nome da concessionária"
          aria-invalid={Boolean(fieldErrors.storeTradingName)}
          autoComplete="organization"
          autoFocus
          disabled={isSubmitting}
          maxLength={191}
          name="storeTradingName"
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Ex.: Auto Bahia Veículos"
          required
          value={storeName}
        />
      </FeatureField>

      <FeatureField
        error={fieldErrors.publicSlug}
        hint="Use letras, números e hífens. Você poderá configurar um domínio próprio depois."
        label="Endereço público da loja"
      >
        <div className="agency-slug-control">
          <Globe2 aria-hidden="true" />
          <FeatureInput
            aria-label="Endereço público da loja"
            aria-invalid={Boolean(fieldErrors.publicSlug)}
            autoCapitalize="none"
            autoComplete="off"
            disabled={isSubmitting}
            inputMode="url"
            maxLength={80}
            name="publicSlug"
            onChange={(event) => onSubdomainChange(event.target.value)}
            placeholder="auto-bahia"
            required
            spellCheck={false}
            value={subdomain}
          />
          <span aria-hidden="true">.lojaveiculos.com.br</span>
        </div>
      </FeatureField>

      <FeatureActionButton
        className={
          canSubmit
            ? "agency-create-submit agency-create-submit--ready"
            : "agency-create-submit agency-create-submit--locked"
        }
        disabled={isSubmitting || !canSubmit}
        icon={Store}
        isBusy={isSubmitting}
        label={isSubmitting ? "Criando loja" : "Criar concessionária"}
        title={readinessMessage}
        type="submit"
        variant="primary"
      />
      <p
        className={
          canSubmit
            ? "agency-create-submit-note agency-create-submit-note--ready"
            : "agency-create-submit-note"
        }
      >
        {canSubmit ? (
          <CircleCheck aria-hidden="true" />
        ) : (
          <LockKeyhole aria-hidden="true" />
        )}
        <span>{readinessMessage}</span>
      </p>
    </form>
  );
}
