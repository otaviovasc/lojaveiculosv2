import { ArrowRight, Car, CheckCircle2, Loader2, Store } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FeatureInput } from "../../components/ui/FeatureControls";
import {
  FeatureField,
  FeatureFieldGroup,
} from "../../components/ui/FeatureForms";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { Logo } from "../../components/ui/logo";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import {
  applyInputMask,
  formatBrazilianCnpj,
  formatBrazilianPhone,
} from "../../lib/masks";
import { normalizePublicSlug } from "../../lib/utils";
import "../../styles/account-auth.css";
import { useAccountSession } from "./accountSession";
import { persistCurrentStoreSlug } from "./currentStore";
import {
  validateOwnerStoreForm,
  type OwnerStoreFieldErrors,
} from "./onboardingValidation";
import { createRuntimeAccountApi } from "./runtimeApi";

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
    <main className="account-auth-shell">
      <div aria-hidden="true" className="account-auth-glow" />
      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-6">
        <Logo className="h-10" variant="full" />

        <div className="w-full space-y-6">
          <header className="space-y-2 text-center">
            <span className="account-badge-label">
              <Store className="size-3.5" aria-hidden="true" /> Nova loja
            </span>
            <h1 className="font-display text-2xl md:text-3xl font-black text-foreground tracking-tight">
              Criar sua primeira loja
            </h1>
            <p className="text-sm font-medium text-muted max-w-lg mx-auto leading-relaxed">
              Informe os dados da sua loja para iniciar a operação com estoque,
              vendas e equipe.
            </p>
          </header>

          {error ? <FeatureAlert>{error}</FeatureAlert> : null}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Form Section */}
            <form
              noValidate
              onSubmit={(event) => void submit(event)}
              className="lg:col-span-7 account-glass-card space-y-5"
            >
              <div className="flex items-center gap-2 pb-2 border-b border-line">
                <Store
                  className="size-4 text-accent-strong"
                  aria-hidden="true"
                />
                <h2 className="text-base font-extrabold text-foreground">
                  Dados da loja
                </h2>
              </div>

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

              <FeatureField
                error={fieldErrors.storeLegalName}
                label="Razão social"
              >
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
                      setDocumentNumber(
                        formatBrazilianCnpj(event.target.value),
                      );
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
                      setContactPhone(
                        applyInputMask(
                          event.currentTarget,
                          formatBrazilianPhone,
                        ),
                      );
                    }}
                    placeholder="(11) 98765-4321"
                  />
                </FeatureField>
              </FeatureFieldGroup>

              <FeatureActionButton
                className="account-primary-button mt-4"
                disabled={isSaving}
                icon={isSaving ? Loader2 : ArrowRight}
                isBusy={isSaving}
                label={isSaving ? "Criando" : "Criar loja"}
                type="submit"
                variant="primary"
              />
            </form>

            {/* Side Highlights Card */}
            <aside className="hidden lg:block lg:col-span-5 account-glass-card space-y-4 bg-accent-soft/20 border-accent/20">
              <div className="space-y-1">
                <span className="account-badge-label bg-accent-soft text-accent-strong">
                  <Car className="size-3.5" aria-hidden="true" /> O que está
                  incluído
                </span>
                <h3 className="text-lg font-black text-foreground pt-1">
                  Sua loja pronta para operar
                </h3>
              </div>

              <div className="space-y-3.5 text-xs text-muted font-medium pt-2">
                <div className="account-feature-item">
                  <CheckCircle2
                    className="account-feature-icon"
                    aria-hidden="true"
                  />
                  <div>
                    <strong className="text-foreground font-bold block">
                      Gestão de estoque
                    </strong>
                    <span>
                      Ficha técnica, fotos e acompanhamento dos veículos.
                    </span>
                  </div>
                </div>

                <div className="account-feature-item">
                  <CheckCircle2
                    className="account-feature-icon"
                    aria-hidden="true"
                  />
                  <div>
                    <strong className="text-foreground font-bold block">
                      Atendimento e CRM
                    </strong>
                    <span>
                      Funil comercial, mensagens e histórico de negociações.
                    </span>
                  </div>
                </div>

                <div className="account-feature-item">
                  <CheckCircle2
                    className="account-feature-icon"
                    aria-hidden="true"
                  />
                  <div>
                    <strong className="text-foreground font-bold block">
                      Equipe e permissões
                    </strong>
                    <span>Controle de acessos para vendedores e gerentes.</span>
                  </div>
                </div>

                <div className="account-feature-item">
                  <CheckCircle2
                    className="account-feature-icon"
                    aria-hidden="true"
                  />
                  <div>
                    <strong className="text-foreground font-bold block">
                      Vitrine digital
                    </strong>
                    <span>Subdomínio exclusivo da sua loja.</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-line/60 text-xs font-semibold text-muted leading-relaxed">
                Você poderá convidar sua equipe e configurar integrações logo
                após a criação da loja.
              </div>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
