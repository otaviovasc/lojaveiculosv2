import { ArrowRight, CheckCircle2, LockKeyhole, Sparkles } from "lucide-react";
import type { ModuleDefinition } from "../../app/modules";
import {
  FeatureActionButton,
  FeaturePageHeader,
  FeaturePageShell,
  FeatureSection,
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
  return (
    <FeaturePageShell variant="content">
      <FeaturePageHeader
        chip={
          managedByAgency
            ? "Gerenciado pela agência"
            : "Disponível para contratar"
        }
        description={module.description}
        eyebrow={
          <>
            <LockKeyhole aria-hidden="true" className="size-4" />
            Recurso adicional
          </>
        }
        title={module.title}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <FeatureSection padding="comfortable">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-accent-soft text-accent-strong">
              <Sparkles aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="eyebrow">{featureLabels[featureKey]}</p>
              <h2 className="mt-2 text-2xl font-black text-app-text">
                Amplie sua operação quando fizer sentido
              </h2>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-muted">
                {featureValueCopy[featureKey]} Sua loja continua funcionando
                normalmente com os módulos atuais.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              "Preço e composição sempre visíveis antes da cobrança",
              "Ativação vinculada à confirmação segura do Asaas",
            ].map((benefit) => (
              <div
                className="flex items-start gap-3 rounded-lg border border-line bg-app-elevated p-4"
                key={benefit}
              >
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-success-strong"
                />
                <span className="text-sm font-bold text-app-text">
                  {benefit}
                </span>
              </div>
            ))}
          </div>
        </FeatureSection>

        <FeatureSection
          description={
            managedByAgency
              ? "A agência responsável precisa adicionar este recurso à assinatura da loja."
              : "Compare o plano Growth e os pacotes adicionais. Você pode alterar a composição durante o mês."
          }
          title={
            managedByAgency
              ? "Solicite à sua agência"
              : "Disponível em Assinatura"
          }
        >
          {!managedByAgency ? (
            <div className="mt-5">
              <FeatureActionButton
                icon={ArrowRight}
                label="Ver plano e pacotes"
                onClick={onOpenBilling}
                variant="primary"
              />
            </div>
          ) : null}
        </FeatureSection>
      </div>
    </FeaturePageShell>
  );
}
