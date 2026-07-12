import { ArrowLeft, Building2, RefreshCcw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  FeatureCard,
  FeatureCardDescription,
  FeatureCardHeader,
} from "../../../components/ui/FeatureCards";
import {
  FeatureActionButton,
  FeaturePageShell,
} from "../../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureEmptyState,
  FeatureLoadingState,
} from "../../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../../lib/apiErrors";
import { normalizePublicSlug } from "../../../lib/utils";
import type { TenantAccessSummary } from "../../account/apiClient";
import { useAccountSession } from "../../account/accountSession";
import { persistCurrentStoreSlug } from "../../account/currentStore";
import {
  validateAgencyStoreForm,
  type AgencyStoreFieldErrors,
} from "../../account/onboardingValidation";
import { createRuntimeAccountApi } from "../../account/runtimeApi";
import { AgencyCreateStoreForm } from "./AgencyCreateStoreForm";
import { AgencyCreateStoreGuidance } from "./AgencyCreateStoreGuidance";
import { AgencyCreateStoreIntro } from "./AgencyCreateStoreIntro";
import type {
  AgencyCreateStorePageProps,
  TenantLoadStatus,
} from "./AgencyCreateStoreTypes";
import { useAgencyCreateStoreMotion } from "./useAgencyCreateStoreMotion";

export function AgencyCreateStorePage({
  apiFactory = createRuntimeAccountApi,
}: AgencyCreateStorePageProps) {
  const session = useAccountSession();
  const navigate = useNavigate();
  const [storeName, setStoreName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [subdomainEdited, setSubdomainEdited] = useState(false);
  const [agencyTenants, setAgencyTenants] = useState<TenantAccessSummary[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [fieldErrors, setFieldErrors] = useState<AgencyStoreFieldErrors>({});
  const [tenantStatus, setTenantStatus] = useState<TenantLoadStatus>({
    kind: "loading",
  });
  const tenantLoadId = useRef(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const motionRootRef = useAgencyCreateStoreMotion();

  const loadTenants = useCallback(async () => {
    const loadId = ++tenantLoadId.current;
    setTenantStatus({ kind: "loading" });
    setSubmitError(null);
    try {
      const api = await apiFactory();
      const bootstrap = await api.bootstrap();
      if (loadId !== tenantLoadId.current) return;
      const tenants = bootstrap.tenantMemberships.filter(
        (membership) =>
          membership.role === "agency" && membership.status === "active",
      );
      setAgencyTenants(tenants);
      setSelectedTenantId((current) =>
        tenants.some((tenant) => tenant.tenantId === current)
          ? current
          : (tenants[0]?.tenantId ?? ""),
      );
      setTenantStatus({ kind: "ready" });
    } catch (error) {
      if (loadId !== tenantLoadId.current) return;
      setAgencyTenants([]);
      setSelectedTenantId("");
      setTenantStatus({
        kind: "error",
        message: formatApiErrorDisplay(
          error,
          "Não foi possível carregar as contas de agência.",
        ),
      });
    }
  }, [apiFactory]);

  useEffect(() => {
    void loadTenants();
    return () => {
      tenantLoadId.current += 1;
    };
  }, [loadTenants]);

  const clearFieldError = (field: keyof AgencyStoreFieldErrors) => {
    setFieldErrors((current) => {
      const { [field]: _removed, ...next } = current;
      return next;
    });
  };

  const handleNameChange = (value: string) => {
    setStoreName(value);
    clearFieldError("storeTradingName");
    if (!subdomainEdited) setSubdomain(normalizePublicSlug(value));
  };

  const handleSubdomainChange = (value: string) => {
    const normalized = normalizePublicSlug(value);
    clearFieldError("publicSlug");
    setSubdomain(normalized);
    setSubdomainEdited(Boolean(normalized));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = validateAgencyStoreForm({
      publicSlug: subdomain,
      storeTradingName: storeName,
      tenantId: selectedTenantId,
    });
    if (!validation.ok) {
      setFieldErrors(validation.errors);
      setSubmitError(validation.message);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const api = await apiFactory();
      const store = await api.createAgencyStore(validation.input);
      persistCurrentStoreSlug(store.storeSlug, session.user.clerkUserId);
      void navigate("/agency/admin", { replace: true });
    } catch (error) {
      setSubmitError(
        formatApiErrorDisplay(error, "Não foi possível criar a loja."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FeaturePageShell className="agency-create-page" variant="content">
      <div
        aria-labelledby="agency-create-title"
        className="agency-create-composition"
        ref={motionRootRef}
      >
        <AgencyCreateStoreIntro onBack={() => void navigate("/agency/admin")} />

        <div className="agency-create-grid">
          <FeatureCard className="agency-create-form-card">
            <div aria-hidden="true" className="agency-create-card-rail">
              <span />
              <span />
              <span />
            </div>
            <FeatureCardHeader
              className="agency-create-card-header"
              icon={
                <span className="agency-create-card-icon">
                  <Building2 aria-hidden="true" />
                </span>
              }
            >
              <span className="agency-create-card-kicker">
                Identidade da loja
              </span>
              <h2 className="agency-create-card-title">
                Dados da concessionária
              </h2>
              <FeatureCardDescription className="agency-create-card-description">
                Comece pelo nome e pelo endereço público. Plano, cobrança e
                recursos contratados continuam na cobrança unificada.
              </FeatureCardDescription>
            </FeatureCardHeader>

            {tenantStatus.kind === "loading" ? (
              <FeatureLoadingState
                className="agency-create-state"
                icon={RefreshCcw}
                title="Carregando contas de agência"
              >
                Aguarde enquanto confirmamos em qual conta a nova loja será
                criada.
              </FeatureLoadingState>
            ) : tenantStatus.kind === "error" ? (
              <FeatureAlert
                action={
                  <FeatureActionButton
                    icon={RefreshCcw}
                    label="Tentar carregar novamente"
                    onClick={() => void loadTenants()}
                  />
                }
                title="Contas de agência indisponíveis"
              >
                <p>{tenantStatus.message}</p>
              </FeatureAlert>
            ) : agencyTenants.length === 0 ? (
              <FeatureEmptyState
                action={
                  <FeatureActionButton
                    icon={ArrowLeft}
                    label="Voltar para a rede de lojas"
                    onClick={() => void navigate("/agency/admin")}
                  />
                }
                body="Sua sessão não possui uma conta de agência ativa. Peça a um administrador para revisar seu acesso antes de criar uma loja."
                icon={Building2}
                title="Criação indisponível"
              />
            ) : (
              <AgencyCreateStoreForm
                agencyTenants={agencyTenants}
                fieldErrors={fieldErrors}
                isSubmitting={isSubmitting}
                onNameChange={handleNameChange}
                onSubmit={(event) => void handleSubmit(event)}
                onSubdomainChange={handleSubdomainChange}
                onTenantChange={(tenantId) => {
                  clearFieldError("tenantId");
                  setSelectedTenantId(tenantId);
                }}
                selectedTenantId={selectedTenantId}
                storeName={storeName}
                subdomain={subdomain}
                submitError={submitError}
              />
            )}
          </FeatureCard>

          <AgencyCreateStoreGuidance />
        </div>
      </div>
    </FeaturePageShell>
  );
}
