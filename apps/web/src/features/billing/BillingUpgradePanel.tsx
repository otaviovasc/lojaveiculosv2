import {
  ArrowRight,
  Calculator,
  Check,
  LockKeyhole,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { cn } from "../../lib/utils";
import type { ModuleDefinition } from "../../app/modules";
import {
  FeatureActionButton,
  FeaturePageShell,
} from "../../components/ui/FeatureLayout";
import { featureLabels, featureValueCopy } from "./billingFormat";
import type { EntitlementKey } from "./types";

export function BillingUpgradePanel({
  featureKey,
  managedByAgency,
  module,
  onOpenBilling,
}: {
  featureKey: EntitlementKey;
  managedByAgency: boolean;
  module: ModuleDefinition;
  onOpenBilling: () => void;
}) {
  const isCrm = featureKey === "crm";
  const isSimulations = featureKey === "simulations";
  const FeatureIcon = isCrm
    ? MessageSquare
    : isSimulations
      ? Calculator
      : Sparkles;
  const themeClass = isCrm
    ? "billing-locked-workspace--crm"
    : isSimulations
      ? "billing-locked-workspace--simulations"
      : "billing-locked-workspace--default";

  return (
    <FeaturePageShell className="billing-locked-shell" variant="content">
      <div className={cn("billing-locked-workspace", themeClass)}>
        <div className="billing-locked-background-icon" aria-hidden="true">
          <FeatureIcon />
        </div>

        <header className="billing-locked-header">
          <div className="billing-locked-header-meta">
            <span className="billing-locked-eyebrow">
              <LockKeyhole aria-hidden="true" className="size-4" />
              Recurso adicional
            </span>
            <span className="billing-locked-status">
              {managedByAgency
                ? "Gerenciado pela agência"
                : "Disponível para contratar"}
            </span>
          </div>
          <h1>{module.title}</h1>
          <p>{module.description}</p>
        </header>

        <div className="billing-locked-grid">
          <section className="billing-locked-hero">
            <div className="billing-locked-hero-top">
              <div className="billing-locked-feature-icon" aria-hidden="true">
                <FeatureIcon />
              </div>
              <div>
                <p className="billing-locked-feature-label">
                  {featureLabels[featureKey]}
                </p>
                <h2>Amplie sua operação quando fizer sentido</h2>
                <p className="billing-locked-description">
                  {featureValueCopy[featureKey]} Sua loja continua funcionando
                  normalmente com os módulos atuais.
                </p>
              </div>
            </div>

            <div className="billing-locked-benefits">
              <div>
                <Check aria-hidden="true" />
                <span>
                  Preço e composição sempre visíveis antes da cobrança
                </span>
              </div>
              <div>
                <Check aria-hidden="true" />
                <span>Ativação segura e vinculada ao plano escolhido</span>
              </div>
            </div>
          </section>

          <aside className="billing-locked-cta">
            <span className="billing-locked-cta-label">
              {managedByAgency ? "Próximo passo" : "Libere este recurso"}
            </span>
            <h2>
              {managedByAgency
                ? "Solicite à sua agência"
                : "Veja os planos que combinam com sua loja"}
            </h2>
            <p>
              {managedByAgency
                ? "A agência responsável precisa adicionar este recurso à assinatura da loja."
                : "Compare o plano Growth e os pacotes adicionais. Você só confirma quando a composição fizer sentido."}
            </p>
            {!managedByAgency ? (
              <FeatureActionButton
                className="billing-locked-cta-button"
                icon={ArrowRight}
                label="Ver plano e pacotes"
                onClick={onOpenBilling}
                variant="primary"
              />
            ) : (
              <div className="billing-locked-agency-note">
                <LockKeyhole aria-hidden="true" />
                <span>A contratação é feita pela agência responsável.</span>
              </div>
            )}
          </aside>
        </div>
      </div>
    </FeaturePageShell>
  );
}
