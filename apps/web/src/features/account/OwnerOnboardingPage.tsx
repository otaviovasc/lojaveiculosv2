import { ArrowRight, Loader2, Store } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FeatureInput } from "../../components/ui/FeatureControls";
import {
  FeatureField,
  FeatureFieldGroup,
} from "../../components/ui/FeatureForms";
import {
  FeatureActionButton,
  FeaturePageHeader,
  FeaturePageShell,
  FeatureSection,
} from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { normalizePublicSlug } from "../../lib/utils";
import {
  formatBrazilianCnpj,
  formatBrazilianPhone,
} from "../settings/settingsMasks";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { persistCurrentStoreSlug } from "./currentStore";
import {
  validateOwnerStoreForm,
  type OwnerStoreFieldErrors,
} from "./onboardingValidation";
import { createRuntimeAccountApi } from "./runtimeApi";
import { useAccountSession } from "./accountSession";

export function OwnerOnboardingPage() {
  const session = useAccountSession();
  const navigate = useNavigate();
  const [storeTradingName, setStoreTradingName] = useState("");
  const [storeLegalName, setStoreLegalName] = useState("");
  const [publicSlug, setPublicSlug] = useState("");
  const [publicSlugEdited, setPublicSlugEdited] = useState(false);
  const [documentNumber, setDocumentNumber] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<OwnerStoreFieldErrors>({});
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const isSaving = status === "saving";

  const clearFieldError = (field: keyof OwnerStoreFieldErrors) => {
    setFieldErrors((current) => {
      const { [field]: _removed, ...next } = current;
      return next;
    });
  };

  const onStoreNameChange = (value: string) => {
    setStoreTradingName(value);
    clearFieldError("storeTradingName");
    if (!publicSlugEdited) setPublicSlug(normalizePublicSlug(value));
  };

  const onPublicSlugChange = (value: string) => {
    clearFieldError("publicSlug");
    const normalized = normalizePublicSlug(value);
    setPublicSlug(normalized);
    setPublicSlugEdited(Boolean(normalized));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const validation = validateOwnerStoreForm({
      contactPhone,
      documentNumber,
      publicSlug,
      storeLegalName,
      storeTradingName,
    });
    if (!validation.ok) {
      setFieldErrors(validation.errors);
      setError(validation.message);
      return;
    }
    setFieldErrors({});
    setError(null);
    setStatus("saving");
    try {
      const api = await createRuntimeAccountApi();
      const store = await api.createOwnerStore(validation.input);
      persistCurrentStoreSlug(store.storeSlug, session.user.clerkUserId);
      void navigate("/auth/session", { replace: true });
    } catch (err) {
      setError(formatApiErrorDisplay(err, "Não foi possível criar a loja."));
    } finally {
      setStatus("idle");
    }
  };

  return (
    <FeaturePageShell
      className="min-h-screen max-w-3xl justify-center"
      variant="plain"
    >
      <FeaturePageHeader
        chip="Conta owner"
        description="Cadastre a loja operacional que vai concentrar estoque, equipe, storefront, permissões e auditoria."
        eyebrow="Primeiro acesso"
        title="Criar sua primeira loja"
      />

      {error ? <FeatureAlert>{error}</FeatureAlert> : null}

      <FeatureSection
        className="grid gap-4"
        icon={<Store className="size-5 text-accent-strong" />}
        padding="compact"
        title="Dados da loja"
      >
        <form onSubmit={(event) => void submit(event)} className="grid gap-4">
          <FeatureField
            error={fieldErrors.storeTradingName}
            label="Nome comercial"
          >
            <FeatureInput
              aria-invalid={Boolean(fieldErrors.storeTradingName)}
              required
              value={storeTradingName}
              onChange={(event) => onStoreNameChange(event.target.value)}
              placeholder="Auto Prime Veículos"
            />
          </FeatureField>
          <FeatureField error={fieldErrors.storeLegalName} label="Razão social">
            <FeatureInput
              aria-invalid={Boolean(fieldErrors.storeLegalName)}
              value={storeLegalName}
              onChange={(event) => {
                clearFieldError("storeLegalName");
                setStoreLegalName(event.target.value);
              }}
              placeholder="Auto Prime Veículos LTDA"
            />
          </FeatureField>
          <FeatureField
            hint="Esse será o endereço público inicial da loja."
            label="Subdomínio"
            error={fieldErrors.publicSlug}
          >
            <div className="flex min-h-11 items-center rounded-lg border border-line bg-app px-3 focus-within:border-accent">
              <FeatureInput
                aria-invalid={Boolean(fieldErrors.publicSlug)}
                horizontalPadding="none"
                required
                value={publicSlug}
                onChange={(event) => onPublicSlugChange(event.target.value)}
                className="min-h-0 min-w-0 flex-1 border-0 bg-transparent focus:shadow-none"
                placeholder="auto-prime"
              />
              <span className="text-xs font-bold text-muted">
                .lojaveiculos.com.br
              </span>
            </div>
          </FeatureField>
          <FeatureFieldGroup>
            <FeatureField error={fieldErrors.documentNumber} label="CNPJ">
              <FeatureInput
                aria-invalid={Boolean(fieldErrors.documentNumber)}
                inputMode="numeric"
                value={documentNumber}
                onChange={(event) => {
                  clearFieldError("documentNumber");
                  setDocumentNumber(formatBrazilianCnpj(event.target.value));
                }}
                placeholder="00.000.000/0000-00"
              />
            </FeatureField>
            <FeatureField error={fieldErrors.contactPhone} label="Telefone">
              <FeatureInput
                aria-invalid={Boolean(fieldErrors.contactPhone)}
                inputMode="tel"
                type="tel"
                value={contactPhone}
                onChange={(event) => {
                  clearFieldError("contactPhone");
                  setContactPhone(formatBrazilianPhone(event.target.value));
                }}
                placeholder="(11) 98765-4321"
              />
            </FeatureField>
          </FeatureFieldGroup>
          <FeatureActionButton
            className="w-full justify-center"
            disabled={isSaving}
            icon={isSaving ? Loader2 : ArrowRight}
            isBusy={isSaving}
            label={isSaving ? "Criando" : "Criar loja"}
            type="submit"
            variant="primary"
          />
        </form>
      </FeatureSection>
    </FeaturePageShell>
  );
}
