import { useAuth } from "@clerk/react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Store, Globe, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import {
  FeatureCard,
  FeatureCardDescription,
  FeatureCardHeader,
  FeatureCardTitle,
} from "../../../components/ui/FeatureCards";
import {
  FeatureInput,
  FeatureSelect,
} from "../../../components/ui/FeatureControls";
import { FeatureField } from "../../../components/ui/FeatureForms";
import {
  FeatureActionButton,
  FeaturePageHeader,
} from "../../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../../components/ui/FeatureStates";
import { normalizePublicSlug } from "../../../lib/utils";
import { persistCurrentStoreSlug } from "../../account/currentStore";
import {
  validateAgencyStoreForm,
  type AgencyStoreFieldErrors,
} from "../../account/onboardingValidation";
import { createRuntimeAccountApi } from "../../account/runtimeApi";
import type { TenantAccessSummary } from "../../account/apiClient";

export function AgencyCreateStorePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [subdomainEdited, setSubdomainEdited] = useState(false);
  const [agencyTenants, setAgencyTenants] = useState<TenantAccessSummary[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [fieldErrors, setFieldErrors] = useState<AgencyStoreFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearFieldError = (field: keyof AgencyStoreFieldErrors) => {
    setFieldErrors((current) => {
      const { [field]: _removed, ...next } = current;
      return next;
    });
  };

  useEffect(() => {
    let mounted = true;
    const loadTenants = async () => {
      try {
        const api = await createRuntimeAccountApi();
        const bootstrap = await api.bootstrap();
        const tenants = bootstrap.tenantMemberships.filter(
          (membership) =>
            membership.role === "agency" && membership.status === "active",
        );
        if (!mounted) return;
        setAgencyTenants(tenants);
        const [onlyTenant] = tenants;
        if (tenants.length === 1 && onlyTenant) {
          setSelectedTenantId(onlyTenant.tenantId);
        }
        if (tenants.length === 0) {
          setError("Sua sessão não tem uma conta de agência ativa.");
        }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : String(err));
      }
    };
    void loadTenants();
    return () => {
      mounted = false;
    };
  }, []);

  const handleNameChange = (val: string) => {
    setStoreName(val);
    clearFieldError("storeTradingName");
    if (!subdomainEdited) setSubdomain(normalizePublicSlug(val));
  };

  const handleSubdomainChange = (val: string) => {
    clearFieldError("publicSlug");
    const normalized = normalizePublicSlug(val);
    setSubdomain(normalized);
    setSubdomainEdited(Boolean(normalized));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validation = validateAgencyStoreForm({
      publicSlug: subdomain,
      storeTradingName: storeName,
      tenantId: selectedTenantId,
    });
    if (!validation.ok) {
      setFieldErrors(validation.errors);
      setError(validation.message);
      return;
    }
    setFieldErrors({});
    setIsSubmitting(true);
    setError(null);
    try {
      const api = await createRuntimeAccountApi();
      const store = await api.createAgencyStore(validation.input);
      persistCurrentStoreSlug(store.storeSlug, auth.userId);
      void navigate("/agency/admin", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[var(--layout-content-max)] flex-col gap-8 px-4 py-8 animate-fade-in">
      <FeaturePageHeader
        actions={
          <FeatureActionButton
            icon={ArrowLeft}
            label="Voltar"
            onClick={() => void navigate("/agency/admin")}
          />
        }
        description="Crie uma loja gerenciada pela conta de agência ativa da sua sessão."
        eyebrow="Cadastro"
        title="Adicionar nova loja"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <FeatureCard className="p-6 lg:col-span-2">
          <FeatureCardHeader
            icon={
              <span className="grid size-10 place-items-center rounded-lg border border-line bg-app text-accent">
                <Store className="size-5" />
              </span>
            }
          >
            <FeatureCardTitle>Dados da concessionária</FeatureCardTitle>
            <FeatureCardDescription>
              A loja nasce com trial e entitlements iniciais. Escolha de plano e
              billing entram no fluxo de cobrança.
            </FeatureCardDescription>
          </FeatureCardHeader>

          <div className="mt-5">
            {error ? (
              <FeatureAlert className="mb-4">{error}</FeatureAlert>
            ) : null}
            <form
              onSubmit={(event) => void handleSubmit(event)}
              className="grid gap-5"
            >
              <FeatureField
                error={fieldErrors.tenantId}
                label="Conta de agência"
              >
                <FeatureSelect
                  disabled={agencyTenants.length <= 1}
                  onChange={(value) => {
                    clearFieldError("tenantId");
                    setSelectedTenantId(value);
                  }}
                  options={agencyTenants.map((tenant) => ({
                    label: tenant.tenantName,
                    value: tenant.tenantId,
                  }))}
                  value={selectedTenantId}
                />
              </FeatureField>

              <FeatureField
                error={fieldErrors.storeTradingName}
                label="Nome da concessionária"
              >
                <FeatureInput
                  aria-invalid={Boolean(fieldErrors.storeTradingName)}
                  type="text"
                  required
                  placeholder="Ex: Auto Bahia Veículos"
                  value={storeName}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
              </FeatureField>

              <FeatureField
                error={fieldErrors.publicSlug}
                label="Subdomínio de acesso"
              >
                <div className="flex items-center bg-app border border-line focus-within:border-accent/40 rounded-xl overflow-hidden px-4 py-3 transition-all">
                  <Globe className="size-4 text-muted shrink-0 mr-2" />
                  <FeatureInput
                    aria-invalid={Boolean(fieldErrors.publicSlug)}
                    type="text"
                    required
                    placeholder="autobahia"
                    value={subdomain}
                    onChange={(e) => handleSubdomainChange(e.target.value)}
                    className="min-h-0 flex-1 border-0 bg-transparent px-0 focus:shadow-none"
                  />
                  <span className="text-muted text-xs font-bold font-mono">
                    .lojaveiculos.com.br
                  </span>
                </div>
              </FeatureField>

              <FeatureActionButton
                className="w-full justify-center"
                disabled={isSubmitting}
                icon={isSubmitting ? Loader2 : Store}
                isBusy={isSubmitting}
                label={isSubmitting ? "Criando loja" : "Criar concessionária"}
                type="submit"
                variant="primary"
              />
            </form>
          </div>
        </FeatureCard>

        <FeatureCard className="p-6 bg-panel space-y-6">
          <FeatureCardHeader>
            <FeatureCardTitle>Informações</FeatureCardTitle>
          </FeatureCardHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="size-4 text-accent shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-muted leading-relaxed">
                O subdomínio configurado será o link permanente do cliente (ex:{" "}
                <span className="font-mono font-bold text-primary">
                  autobahia.lojaveiculos.com.br
                </span>
                ).
              </p>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="size-4 text-accent shrink-0 mt-0.5" />
              <p className="text-xs font-semibold text-muted leading-relaxed">
                A loja fica vinculada à sua conta de agência. Configuração de
                plano e cobrança deve acontecer no módulo de billing.
              </p>
            </div>
          </div>
        </FeatureCard>
      </div>
    </div>
  );
}
